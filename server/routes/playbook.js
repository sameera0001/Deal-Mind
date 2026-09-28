import { Router } from 'express'
import { getCalls, getFacts, getDeal, listDeals, listInsights, nowIso, upsertInsight, withTransaction } from '../db.js'
import { computePlaybook } from '../lib/insights.js'
import { hindsightMode } from '../lib/hindsight.js'

export const playbookRouter = Router()

function loadPortfolio() {
  return listDeals.all().map((deal) => ({
    deal: getDeal.get(deal.id),
    calls: getCalls.all(deal.id),
    facts: getFacts.all(deal.id),
  }))
}

/** Recompute patterns across every deal and persist them to playbook_insights. */
export function refreshPlaybook() {
  const portfolio = loadPortfolio()
  const insights = computePlaybook(portfolio)

  withTransaction(() => {
    for (const insight of insights) {
      upsertInsight.run({
        insight_text: insight.insight_text,
        supporting_deal_count: insight.supporting_deal_count,
        theme: insight.theme,
        created_at: nowIso(),
      })
    }
  })

  return insights
}

playbookRouter.get('/', (req, res) => {
  if (req.query.refresh !== 'false') refreshPlaybook()

  const live = computePlaybook(loadPortfolio())
  const stored = listInsights.all()
  const storedByTheme = new Map(stored.map((row) => [row.theme, row]))

  res.json({
    insights: live.map((insight) => ({
      id: storedByTheme.get(insight.theme)?.id ?? null,
      theme: insight.theme,
      label: insight.label,
      insight_text: insight.insight_text,
      supporting_deal_count: insight.supporting_deal_count,
      supporting_deals: insight.supporting_deals,
      evidence: insight.evidence,
      created_at: storedByTheme.get(insight.theme)?.created_at ?? null,
    })),
    deals_analyzed: listDeals.all().length,
    calls_analyzed: listDeals.all().reduce((sum, deal) => sum + deal.call_count, 0),
    memory_mode: hindsightMode(),
  })
})

playbookRouter.post('/refresh', (req, res) => {
  const insights = refreshPlaybook()
  res.json({ refreshed: insights.length, themes: insights.map((i) => i.theme) })
})
