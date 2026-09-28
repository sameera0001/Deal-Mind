import {
  getCalls,
  getDeal,
  getFacts,
  insertCall,
  insertFact,
  nowIso,
  openFacts,
  resolveFact,
  setHealthScore,
  withTransaction,
} from '../db.js'
import { extractFactsFromTranscript } from './groq.js'
import { dealTag, recallFacts, retainFacts } from './hindsight.js'
import { matchResolvedObjection, scoreDeal } from './insights.js'

const CATEGORIES = ['objection', 'competitor', 'stakeholder', 'commitment', 'next_step', 'signal', 'what_worked']

const EXTRACTION_KEYS = {
  objection: 'objections',
  competitor: 'competitors',
  stakeholder: 'stakeholders',
  commitment: 'commitments',
  next_step: 'next_steps',
  signal: 'signals',
  what_worked: 'what_worked',
}

const activeTags = (extraction) => CATEGORIES.filter((category) => (extraction[EXTRACTION_KEYS[category]] || []).length > 0)

const toIso = (value) => {
  if (!value) return new Date().toISOString()
  const raw = String(value).trim()
  const withZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`
  const parsed = new Date(withZone)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export const dateOnly = (value) => toIso(value).slice(0, 10)

/** Aggregate every call's facts into one bundle for brief generation. */
export function buildFactBundle(dealId) {
  const facts = getFacts.all(dealId)
  const pick = (category) => facts.filter((f) => f.category === category)

  return {
    objections: pick('objection').map((f) => ({
      id: f.id,
      call_id: f.call_id,
      text: f.text,
      status: f.status,
      raised_on: f.created_at,
      resolved_on: f.resolved_at,
    })),
    competitors: pick('competitor').map((f) => ({ text: f.text, call_id: f.call_id })),
    stakeholders: pick('stakeholder').map((f) => ({ text: f.text, call_id: f.call_id })),
    commitments: pick('commitment').map((f) => ({ text: f.text, call_id: f.call_id })),
    next_steps: pick('next_step').map((f) => f.text),
    signals: pick('signal').map((f) => f.text),
    what_worked: pick('what_worked').map((f) => f.text),
    counts: Object.fromEntries(CATEGORIES.map((c) => [c, facts.filter((f) => f.category === c).length])),
  }
}

/**
 * Extract facts from a transcript, store them, reconcile objection status
 * against earlier calls, and write the whole call into the deal's memory bank.
 */
export async function logCall({ dealId, transcript, callDate, skipLlm = false }) {
  const deal = getDeal.get(dealId)
  if (!deal) throw Object.assign(new Error(`deal ${dealId} not found`), { status: 404 })

  const timestamp = toIso(callDate)
  const extraction = skipLlm
    ? (await import('./groq.js')).mockExtractFacts(transcript)
    : await extractFactsFromTranscript({ transcript, deal }, deal)

  const createdAt = nowIso()

  const callId = withTransaction(() => {
    const info = insertCall.run({
      deal_id: dealId,
      transcript,
      summary: extraction.summary,
      sentiment: extraction.sentiment,
      call_date: timestamp,
      facts_json: JSON.stringify(extraction),
      created_at: createdAt,
    })
    const id = Number(info.lastInsertRowid)

    const rows = [
      ...extraction.objections.map((o) => ({ category: 'objection', text: o.text, status: 'open' })),
      ...extraction.competitors.map((c) => ({ category: 'competitor', text: c.name ? `Competitor mentioned: ${c.name}` : c.text, status: 'open' })),
      ...extraction.stakeholders.map((s) => ({ category: 'stakeholder', text: s.name || s.text, status: 'open' })),
      ...extraction.commitments.map((c) => ({ category: 'commitment', text: c.text, status: 'open' })),
      ...extraction.next_steps.map((t) => ({ category: 'next_step', text: t, status: 'open' })),
      ...extraction.signals.map((t) => ({ category: 'signal', text: t, status: 'open' })),
      ...(extraction.what_worked || []).map((t) => ({ category: 'what_worked', text: t, status: 'open' })),
    ]

    for (const row of rows) {
      if (!row.text?.trim()) continue
      insertFact.run({ call_id: id, deal_id: dealId, ...row, created_at: createdAt })
    }

    return id
  })

  const reconciliation = reconcileObjections({ dealId, callId, extraction, timestamp })

  const memory = await retainFacts(dealId, [
    {
      content: [
        `Sales call between DealMind rep and ${deal.company_name}${deal.contact_name ? ` (contact: ${deal.contact_name})` : ''}.`,
        `Call outcome: ${extraction.sentiment} sentiment. ${extraction.summary}`,
        extraction.objections.length ? `Objections raised: ${extraction.objections.map((o) => o.text).join(' | ')}` : '',
        extraction.competitors.length ? `Competitors mentioned: ${extraction.competitors.map((c) => c.name || c.text).join(', ')}` : '',
        extraction.stakeholders.length ? `Stakeholders: ${extraction.stakeholders.map((s) => `${s.name}${s.role ? ` (${s.role})` : ''}`).join(', ')}` : '',
        extraction.commitments.length ? `Commitments: ${extraction.commitments.map((c) => c.text).join(' | ')}` : '',
        extraction.resolutions?.length ? `Resolved earlier objections: ${extraction.resolutions.map((r) => `${r.objection} -> ${r.how_resolved}`).join(' | ')}` : '',
        `Raw transcript:\n${transcript}`,
      ]
        .filter(Boolean)
        .join('\n'),
      context: `sales call — ${deal.company_name}`,
      timestamp,
      document_id: `deal-${dealId}-call-${callId}`,
      tags: [dealTag(dealId), `call:${callId}`, ...activeTags(extraction)],
      metadata: { deal_id: String(dealId), company: deal.company_name, call_id: String(callId), sentiment: extraction.sentiment },
    },
  ])

  const score = recomputeHealth(dealId)

  return {
    call: getCalls.all(dealId).find((c) => c.id === callId),
    extraction,
    facts: getFacts.all(dealId).filter((f) => f.call_id === callId),
    reconciliation,
    memory: { mode: memory.mode, bank_id: memory.bank_id },
    health_score: score,
  }
}

/**
 * Close out objections a call explicitly resolved. Matching is fuzzy but
 * explainable: the closest open objection above a similarity floor wins.
 */
export function reconcileObjections({ dealId, callId, extraction, timestamp }) {
  const claims = [
    ...(extraction.resolutions || []).map((r) => ({ label: r.objection, how: r.how_resolved })),
    ...(extraction.objections || []).filter((o) => o.status === 'resolved').map((o) => ({ label: o.text, how: o.detail })),
  ]

  if (!claims.length) return []

  const open = openFacts.all(dealId, 'objection')
  const resolved = []
  const claimed = new Set()

  for (const claim of claims) {
    const candidates = open.filter((f) => !claimed.has(f.id))
    const match = matchResolvedObjection(candidates, claim.label)
    if (!match) continue
    claimed.add(match.objection.id)
    resolveFact.run('resolved', callId, timestamp, match.objection.id)
    resolved.push({ objection: match.objection.text, how_resolved: claim.how, similarity: Number(match.score.toFixed(2)) })
  }

  return resolved
}

export function recomputeHealth(dealId) {
  const deal = getDeal.get(dealId)
  if (!deal) return null
  const score = scoreDeal(deal, getCalls.all(dealId), getFacts.all(dealId))
  setHealthScore.run(score, dealId)
  return score
}

/** Multi-query recall so the brief sees objections, competitors and commitments. */
export async function recallDealContext(dealId, { throughDate = null, budget = 'mid', maxTokens = 3000 } = {}) {
  const temporalWindow = throughDate
    ? { start: '1970-01-01T00:00:00Z', end: new Date(Date.parse(toIso(throughDate)) + 86_400_000).toISOString() }
    : null

  const queries = [
    'objections, concerns and unresolved pushback the customer raised',
    'competitors, alternatives and vendors the customer is evaluating',
    'stakeholders, decision makers and their positions',
    'commitments, promises, next steps and agreed dates',
  ]

  const results = await Promise.all(
    queries.map((query) =>
      recallFacts(dealId, query, { budget, maxTokens: Math.round(maxTokens / queries.length), tags: [dealTag(dealId)], tagsMatch: 'any_strict', temporalWindow, limit: 8 }).catch(() => ({ results: [], mode: 'unavailable' })),
    ),
  )

  const seen = new Set()
  const memories = []
  let mode = 'live'
  let reason = null

  for (const response of results) {
    if (response.mode === 'mock') {
      mode = 'mock'
      reason = response.reason ?? reason
    }
    for (const result of response.results || []) {
      const key = result.text.toLowerCase().slice(0, 120)
      if (seen.has(key)) continue
      seen.add(key)
      memories.push(result)
    }
  }

  memories.sort((a, b) => (b.scores?.final ?? 0) - (a.scores?.final ?? 0))

  return { memories: memories.slice(0, 20), mode, reason }
}

export { toIso, CATEGORIES }
