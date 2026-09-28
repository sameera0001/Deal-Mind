import { Router } from 'express'
import {
  deleteCall,
  deleteDeal,
  getCalls,
  getDeal,
  getFacts,
  insertDeal,
  listDeals,
  nowIso,
  updateDeal,
} from '../db.js'
import { answerQuestion, generateBrief } from '../lib/groq.js'
import { hindsightMode, recallFacts } from '../lib/hindsight.js'
import { buildFactBundle, dateOnly, logCall, recallDealContext, recomputeHealth } from '../lib/pipeline.js'
import { sentimentLabel } from '../lib/insights.js'

export const dealsRouter = Router()

const STAGES = ['discovery', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

const shapeDeal = (deal) => ({
  ...deal,
  last_activity: deal.last_activity ? dateOnly(deal.last_activity) : null,
  stage_label: deal.stage.replace(/_/g, ' '),
})

const shapeCall = (call) => ({
  ...call,
  call_date: dateOnly(call.call_date),
  sentiment_label: sentimentLabel(call.sentiment),
  facts: safeParse(call.facts_json),
})

const safeParse = (json) => {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function requireDeal(req) {
  const deal = getDeal.get(Number(req.params.id))
  if (!deal) {
    const error = new Error(`deal ${req.params.id} not found`)
    error.status = 404
    throw error
  }
  return deal
}

/* ------------------------------------------------------------ collection --- */

dealsRouter.get('/', (req, res) => {
  const deals = listDeals.all().map(shapeDeal)
  const totals = deals.reduce(
    (acc, deal) => {
      acc.pipeline += deal.deal_value
      acc.open_objections += deal.open_objections
      return acc
    },
    { pipeline: 0, open_objections: 0, deals: deals.length },
  )
  res.json({ deals, totals, memory_mode: hindsightMode() })
})

dealsRouter.post('/', (req, res) => {
  const { company_name, contact_name = '', deal_value = 0, stage = 'discovery' } = req.body ?? {}

  if (!company_name || !String(company_name).trim()) {
    return res.status(400).json({ error: 'company_name is required' })
  }
  if (!STAGES.includes(stage)) {
    return res.status(400).json({ error: `stage must be one of: ${STAGES.join(', ')}` })
  }

  const created = withInsert({
    company_name: String(company_name).trim(),
    contact_name: String(contact_name).trim(),
    deal_value: Number(deal_value) || 0,
    stage,
    health_score: 40,
    created_at: nowIso(),
  })

  res.status(201).json({ deal: shapeDeal({ ...created, call_count: 0, last_activity: null, open_objections: 0, competitor_mentions: 0 }) })
})

function withInsert(row) {
  const info = insertDeal.run(row)
  return getDeal.get(Number(info.lastInsertRowid))
}

dealsRouter.patch('/:id', (req, res) => {
  const deal = requireDeal(req)
  const { company_name, contact_name, deal_value, stage } = req.body ?? {}

  if (stage && !STAGES.includes(stage)) {
    return res.status(400).json({ error: `stage must be one of: ${STAGES.join(', ')}` })
  }

  updateDeal.run({
    id: deal.id,
    company_name: company_name !== undefined ? String(company_name).trim() : deal.company_name,
    contact_name: contact_name !== undefined ? String(contact_name).trim() : deal.contact_name,
    deal_value: deal_value !== undefined ? Number(deal_value) || 0 : deal.deal_value,
    stage: stage ?? deal.stage,
    health_score: deal.health_score,
  })

  res.json({ deal: shapeDeal(listDeals.all().find((d) => d.id === deal.id)) })
})

/* ------------------------------------------------------------------ item --- */

dealsRouter.get('/:id', (req, res) => {
  const deal = requireDeal(req)
  const calls = getCalls.all(deal.id).map(shapeCall)
  const facts = getFacts.all(deal.id)
  const bundle = buildFactBundle(deal.id)

  res.json({
    deal: shapeDeal(listDeals.all().find((d) => d.id === deal.id)),
    calls,
    facts: {
      ...bundle,
      open_objections: bundle.objections.filter((o) => o.status === 'open'),
      resolved_objections: bundle.objections.filter((o) => o.status === 'resolved'),
      timeline: facts,
    },
    memory: { mode: hindsightMode(), bank_id: `dealmind-deal-${deal.id}` },
  })
})

dealsRouter.delete('/:id', (req, res) => {
  const deal = requireDeal(req)
  deleteDeal.run(deal.id)
  res.json({ deleted: deal.id })
})

/* ----------------------------------------------------------------- calls --- */

dealsRouter.post('/:id/calls', asyncRoute(async (req, res) => {
  const deal = requireDeal(req)
  const { transcript, call_date, summary, sentiment, skip_llm = false } = req.body ?? {}

  if (!transcript || !String(transcript).trim()) {
    return res.status(400).json({ error: 'transcript is required' })
  }

  const result = await logCall({
    dealId: deal.id,
    transcript: String(transcript).trim(),
    callDate: call_date || new Date().toISOString(),
    skipLlm: Boolean(skip_llm),
  })

  if (summary || sentiment) {
    const call = result.call
    if (summary) call.summary = summary
    if (sentiment) call.sentiment = sentiment
  }

  res.status(201).json({
    ...result,
    call: shapeCall(result.call),
    deal: shapeDeal(listDeals.all().find((d) => d.id === deal.id)),
  })
}))

dealsRouter.delete('/:id/calls/:callId', (req, res) => {
  const deal = requireDeal(req)
  const callId = Number(req.params.callId)
  const call = getCalls.all(deal.id).find((c) => c.id === callId)
  if (!call) return res.status(404).json({ error: `call ${callId} not found` })
  deleteCall.run(callId)
  const health = recomputeHealth(deal.id)
  res.json({ deleted: callId, health_score: health })
})

/* ----------------------------------------------------------------- brief --- */

dealsRouter.get('/:id/brief', asyncRoute(async (req, res) => {
  const deal = requireDeal(req)
  const throughDate = req.query.through || null

  const [{ memories, mode, reason }, facts] = await Promise.all([
    recallDealContext(deal.id, { throughDate }),
    Promise.resolve(buildFactBundle(deal.id)),
  ])

  const brief = await generateBrief({ deal, facts, memories })

  res.json({
    deal: shapeDeal(listDeals.all().find((d) => d.id === deal.id)),
    brief,
    facts,
    memories: memories.map((m) => ({ text: m.text, type: m.type, context: m.context, occurred_start: m.occurred_start, score: m.scores?.final ?? null })),
    memory: { mode, facts_considered: memories.length, reason },
    through: throughDate ? dateOnly(throughDate) : null,
  })
}))

/* ------------------------------------------------------------------- ask --- */

dealsRouter.post('/:id/ask', asyncRoute(async (req, res) => {
  const deal = requireDeal(req)
  const question = String(req.body?.question ?? '').trim()

  if (!question) return res.status(400).json({ error: 'question is required' })
  if (question.length > 2000) return res.status(400).json({ error: 'question must be under 2000 characters' })

  const [{ memories, mode, reason }, facts] = await Promise.all([
    recallDealContext(deal.id, { budget: 'mid', maxTokens: 2500 }),
    Promise.resolve(buildFactBundle(deal.id)),
  ])

  const targeted = await recallFacts(deal.id, question, { budget: 'mid', maxTokens: 1200, tags: [`deal:${deal.id}`], tagsMatch: 'any_strict', limit: 8 })

  const merged = [...targeted.results, ...memories].filter(
    (fact, index, all) => all.findIndex((f) => f.text.toLowerCase() === fact.text.toLowerCase()) === index,
  )

  const answer = await answerQuestion({ question, deal, memories: merged, facts })

  res.json({
    question,
    ...answer,
    memory: {
      mode: mode === 'mock' ? targeted.mode : mode,
      facts_considered: merged.length,
      reason: reason ?? targeted.reason ?? null,
    },
  })
}))

/* ------------------------------------------------------------------ demo --- */

dealsRouter.get('/:id/demo', asyncRoute(async (req, res) => {
  const deal = requireDeal(req)
  const calls = getCalls.all(deal.id).map(shapeCall)

  if (!calls.length) return res.json({ deal: shapeDeal(deal), steps: [] })

  const steps = []
  for (const call of calls) {
    const [{ memories, mode, reason }, facts] = await Promise.all([
      recallDealContext(deal.id, { throughDate: call.call_date, maxTokens: 2200 }),
      Promise.resolve(buildFactBundle(deal.id)),
    ])
    const brief = await generateBrief({ deal, facts, memories })
    steps.push({
      call,
      brief,
      memory: { mode, facts_considered: memories.length, reason },
      counts: {
        objections: facts.counts.objection,
        open_objections: facts.objections.filter((objection) => objection.status === 'open').length,
        competitors: facts.competitors.length,
        stakeholders: facts.stakeholders.length,
        commitments: facts.commitments.length,
        what_worked: facts.what_worked.length,
      },
    })
  }

  res.json({ deal: shapeDeal(deal), steps })
}))

export { shapeDeal, shapeCall }
