import { getDeal, getCalls, getFacts } from '../db.js'

const SENTIMENT_VALUE = { positive: 1, mixed: 0.4, neutral: 0.3, negative: -1 }
const STAGE_VALUE = {
  discovery: 0,
  qualification: 4,
  proposal: 8,
  negotiation: 12,
  closed_won: 20,
  closed_lost: -20,
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, Math.round(n)))

const HAS_ZONE = /[Zz]|[+-]\d{2}:?\d{2}$/

export function parseDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = new Date(HAS_ZONE.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * 0-100 deal health from call cadence, momentum and open risk.
 * Deterministic so the same history always produces the same number.
 */
export function scoreDeal(deal, calls, facts) {
  const openObjections = facts.filter((f) => f.category === 'objection' && f.status === 'open')
  const competitors = facts.filter((f) => f.category === 'competitor')
  const stakeholders = new Set(facts.filter((f) => f.category === 'stakeholder').map((f) => f.text.toLowerCase()))

  let score = 55
  score += STAGE_VALUE[deal.stage] ?? 0

  if (calls.length) {
    const last = calls[calls.length - 1]
    const lastAt = parseDate(last.call_date)
    const days = lastAt ? Math.max(0, Math.round((Date.now() - lastAt.getTime()) / 86_400_000)) : 30
    score += days <= 7 ? 12 : days <= 14 ? 6 : days <= 30 ? 0 : -10

    const first = SENTIMENT_VALUE[calls[0].sentiment] ?? 0
    const latest = SENTIMENT_VALUE[last.sentiment] ?? 0
    score += latest > first ? 8 : latest < first ? -8 : 0

    score += calls.length >= 4 ? 6 : calls.length >= 2 ? 3 : 0
  } else {
    score -= 15
  }

  score -= Math.min(openObjections.length * 11, 33)
  score -= Math.min(competitors.length * 4, 12)
  score += stakeholders.size >= 3 ? 6 : stakeholders.size >= 1 ? 3 : 0

  return clamp(score, 5, 98)
}

export function refreshHealthScore(dealId) {
  const deal = getDeal.get(dealId)
  if (!deal) return null
  const score = scoreDeal(deal, getCalls.all(dealId), getFacts.all(dealId))
  return score
}

const STOP = new Set('the a an and or of to in on for with is are was that this it its their they them we our you i my will would could should have has had not but at by from as be been do does about very just more most than then so if when what which who how'.split(' '))

const tokens = (text) =>
  String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t))

/** 0-1 similarity used to match a "this is resolved" claim back to a tracked objection. */
export function similarity(a, b) {
  const ta = tokens(a)
  const tb = new Set(tokens(b))
  if (!ta.length || !tb.size) return 0
  let hits = 0
  for (const token of new Set(ta)) if (tb.has(token)) hits += 1
  return hits / Math.sqrt(new Set(ta).size * tb.size)
}

/** Find the open objection a resolution claim refers to, if any. */
export function matchResolvedObjection(openObjections, resolutionText) {
  let best = null
  let bestScore = 0
  for (const objection of openObjections) {
    const score = similarity(objection.text, resolutionText)
    if (score > bestScore) {
      best = objection
      bestScore = score
    }
  }
  return bestScore >= 0.3 ? { objection: best, score: bestScore } : null
}

export const PLAYBOOK_THEMES = [
  {
    theme: 'pricing',
    label: 'Pricing pressure',
    test: /pric|cost|budget|discount|expensive|list price|per seat|payback|roi|value for money/i,
    advice: 'Quantify cost-per-outcome before the first pricing conversation, and always bring a pre-approved discount band to the follow-up.',
  },
  {
    theme: 'security',
    label: 'Security and compliance review',
    test: /security|soc ?2|compliance|hipaa|gdpr|pen(etration)? test|audit|data residency|privacy|pci|dpa/i,
    advice: 'Ship the security pack and the DPA at first mention of security, not after it becomes a blocker. Book the security reviewer early.',
  },
  {
    theme: 'technical',
    label: 'Technical depth and integration risk',
    test: /integrat|\bapi\b|sso|scim|migration|technical|it team|uptime|99\.\d|\bsla\b|single sign|sandbox|proof of concept|poc/i,
    advice: 'Bring a named solutions engineer to the second call. Deals that skip this stall in technical evaluation.',
  },
  {
    theme: 'procurement',
    label: 'Procurement and legal friction',
    test: /procurement|legal|contract|\bmsa\b|redlines|vendor review|redline|terms|signature|legal review/i,
    advice: 'Start paperwork the moment a champion confirms budget. Deals that wait for procurement to initiate lose a month.',
  },
  {
    theme: 'timing',
    label: 'Timing and budget-cycle stalls',
    test: /budget cycle|next (?:year|quarter)|fiscal|timeline|deadline|end of (?:the )?(?:year|quarter)|\bq[1-4]\b|not until|revisit/i,
    advice: 'Pin the next step to the customer\'s fiscal calendar, and set a follow-up date before you leave every call.',
  },
  {
    theme: 'competition',
    label: 'Competitive displacement',
    test: /.*/,
    category: 'competitor',
    advice: 'Every deal in the book has a live alternative. Lead with the disqualifying question and the switching cost, not the feature list.',
  },
  {
    theme: 'multithreading',
    label: 'Single-threaded deals',
    test: /.*/,
    category: '__stakeholder_count__',
    advice: 'Deals touching three or more named people are the ones that actually close. Aim to add one new stakeholder every call.',
  },
]

/**
 * Detect cross-deal patterns from extracted facts.
 * @param {Array<{deal:object, calls:Array, facts:Array}>} portfolio
 */
export function computePlaybook(portfolio) {
  const insights = []

  for (const theme of PLAYBOOK_THEMES) {
    const supporting = []
    const evidence = []

    for (const { deal, calls, facts } of portfolio) {
      let matched = []

      if (theme.category === 'competitor') {
        matched = facts.filter((f) => f.category === 'competitor')
      } else if (theme.category === '__stakeholder_count__') {
        const people = new Set(facts.filter((f) => f.category === 'stakeholder').map((f) => f.text.toLowerCase()))
        if (people.size < 3) continue
        matched = facts.filter((f) => f.category === 'stakeholder')
      } else {
        matched = facts.filter((f) => theme.test.test(f.text))
      }

      if (!matched.length) continue
      supporting.push(deal.company_name)
      evidence.push(`${deal.company_name}: ${matched.slice(0, 3).map((f) => `"${f.text}"`).join(', ')}`)
    }

    if (supporting.length < 2) continue

    insights.push({
      theme: theme.theme,
      label: theme.label,
      insight_text: `${theme.label} came up in ${supporting.length} of ${portfolio.length} active deals (${supporting.join(', ')}). ${theme.advice}`,
      supporting_deal_count: supporting.length,
      supporting_deals: supporting,
      evidence: evidence.slice(0, 6),
    })
  }

  return insights.sort((a, b) => b.supporting_deal_count - a.supporting_deal_count)
}

export const sentimentLabel = (value) =>
  ({ positive: 'Positive', neutral: 'Neutral', mixed: 'Mixed', negative: 'Negative' })[value] ?? 'Unknown'
