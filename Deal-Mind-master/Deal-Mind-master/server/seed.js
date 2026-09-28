import { config, hasGroqKey } from './config.js'
import { db, getDeal, insertCall, insertDeal, insertFact, nowIso, withTransaction } from './db.js'
import { dealTag, hindsightMode, retainFacts } from './lib/hindsight.js'
import { extractFactsFromTranscript, mockExtractFacts } from './lib/groq.js'
import { scoreDeal } from './lib/insights.js'
import { reconcileObjections, toIso } from './lib/pipeline.js'
import { refreshPlaybook } from './routes/playbook.js'
import { SEED_CALL_COUNT, SEED_DEALS } from './seed/transcripts.js'

const args = new Set(process.argv.slice(2))
const REBUILD = args.has('--rebuild')
const FAST = args.has('--fast') || !hasGroqKey
const SKIP_MEMORY = args.has('--no-memory')

function reset() {
  db.exec('DELETE FROM playbook_insights; DELETE FROM call_facts; DELETE FROM calls; DELETE FROM deals;')
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('deals','calls','call_facts','playbook_insights')")
  console.log('cleared existing data')
}

async function seedDeal(deal) {
  const createdAt = nowIso()
  const dealId = Number(
    insertDeal.run({
      company_name: deal.company_name,
      contact_name: deal.contact_name,
      deal_value: deal.deal_value,
      stage: deal.stage,
      health_score: 50,
      created_at: deal.created_at || createdAt,
    }).lastInsertRowid,
  )

  const storedDeal = getDeal.get(dealId)
  let callNumber = 0

  for (const call of deal.calls) {
    callNumber += 1
    const transcript = call.transcript.trim()
    const timestamp = toIso(call.call_date)
    const progress = writeOut(`${deal.company_name} call ${callNumber}`)

    const extraction = FAST ? mockExtractFacts(transcript) : await extractFactsFromTranscript({ transcript, deal: storedDeal }, storedDeal)

    const callId = Number(
      insertCall.run({
        deal_id: dealId,
        transcript,
        summary: extraction.summary,
        sentiment: extraction.sentiment,
        call_date: timestamp,
        facts_json: JSON.stringify(extraction),
        created_at: nowIso(),
      }).lastInsertRowid,
    )

    const rows = [
      ...extraction.objections.map((o) => ({ category: 'objection', text: o.text })),
      ...extraction.competitors.map((c) => ({ category: 'competitor', text: c.name ? `Competitor mentioned: ${c.name}` : c.text })),
      ...extraction.stakeholders.map((s) => ({ category: 'stakeholder', text: s.name || s.text })),
      ...extraction.commitments.map((c) => ({ category: 'commitment', text: c.text })),
      ...extraction.next_steps.map((t) => ({ category: 'next_step', text: t })),
      ...extraction.signals.map((t) => ({ category: 'signal', text: t })),
      ...(extraction.what_worked || []).map((t) => ({ category: 'what_worked', text: t })),
    ]

    withTransaction(() => {
      for (const row of rows) {
        if (!row.text?.trim()) continue
        insertFact.run({ call_id: callId, deal_id: dealId, category: row.category, text: row.text.trim(), status: 'open', created_at: nowIso() })
      }
    })

    const resolved = reconcileObjections({ dealId, callId, extraction, timestamp })

    if (!SKIP_MEMORY) {
      await retainFacts(dealId, [
        {
          content: [
            `Sales call between DealMind rep and ${deal.company_name}${deal.contact_name ? ` (contact: ${deal.contact_name})` : ''}. Call ${callNumber} of the deal's history.`,
            `Call outcome: ${extraction.sentiment} sentiment. ${extraction.summary}`,
            extraction.objections.length ? `Objections raised: ${extraction.objections.map((o) => o.text).join(' | ')}` : '',
            extraction.competitors.length ? `Competitors mentioned: ${extraction.competitors.map((c) => c.name || c.text).join(', ')}` : '',
            extraction.stakeholders.length ? `Stakeholders: ${extraction.stakeholders.map((s) => `${s.name}${s.role ? ` (${s.role})` : ''}`).join(', ')}` : '',
            extraction.commitments.length ? `Commitments: ${extraction.commitments.map((c) => c.text).join(' | ')}` : '',
            resolved.length ? `Objections resolved on this call: ${resolved.map((r) => `${r.objection} -> ${r.how_resolved}`).join(' | ')}` : '',
            `Raw transcript:\n${transcript}`,
          ]
            .filter(Boolean)
            .join('\n'),
          context: `sales call — ${deal.company_name}`,
          timestamp,
          document_id: `deal-${dealId}-call-${callId}`,
          tags: [dealTag(dealId), `call:${callId}`],
          metadata: { deal_id: String(dealId), company: deal.company_name, call_id: String(callId), call_index: String(callNumber) },
        },
      ])
    }

    const counts = `${extraction.objections.length} objections, ${extraction.competitors.length} competitors, ${extraction.stakeholders.length} stakeholders, ${extraction.commitments.length} commitments${resolved.length ? `, ${resolved.length} resolved` : ''}`
    progress.succeed(`${counts} · ${extraction.sentiment}${SKIP_MEMORY ? '' : ` · memory: ${hindsightMode()}`}`)
  }

  const calls = db.prepare('SELECT * FROM calls WHERE deal_id = ?').all(dealId)
  const facts = db.prepare('SELECT * FROM call_facts WHERE deal_id = ?').all(dealId)
  const health = scoreDeal(storedDeal, calls, facts)
  db.prepare('UPDATE deals SET health_score = ? WHERE id = ?').run(health, dealId)

  console.log(`  ${deal.company_name} -> deal ${dealId}, health ${health}`)
  return dealId
}

function writeOut(label) {
  const started = Date.now()
  let done = false
  return {
    tick: () => {
      if (done) return
      process.stdout.write(`\r  ${label} ...`.padEnd(78))
    },
    succeed: (message) => {
      done = true
      const seconds = ((Date.now() - started) / 1000).toFixed(1)
      process.stdout.write(`\r  ${label}: ${message} (${seconds}s)`.padEnd(78) + '\n')
    },
  }
}

async function main() {
  console.log('DealMind seed')
  console.log(`  database: ${config.dbFile}`)
  console.log(`  llm:      ${FAST ? 'heuristic extraction (fast)' : `Groq ${config.groq.model}`}`)
  console.log(`  memory:   ${SKIP_MEMORY ? 'skipped' : `Hindsight (${hindsightMode()})`}`)
  console.log('')

  if (REBUILD) reset()

  const existing = db.prepare('SELECT COUNT(*) AS c FROM deals').get().c
  if (existing && !REBUILD) {
    console.log(`database already has ${existing} deals. Re-run with --rebuild to start clean.\n`)
    return
  }

  for (const deal of SEED_DEALS) {
    await seedDeal(deal)
  }

  const insights = refreshPlaybook()
  console.log(`\nplaybook insights: ${insights.length}`)
  for (const insight of insights) {
    console.log(`  [${insight.supporting_deal_count} deals] ${insight.label}`)
  }

  const totals = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM deals) AS deals, (SELECT COUNT(*) FROM calls) AS calls, (SELECT COUNT(*) FROM call_facts) AS facts, (SELECT COUNT(*) FROM playbook_insights) AS insights`,
    )
    .get()

  console.log(`\ndone: ${totals.deals} deals, ${totals.calls} calls, ${totals.facts} facts, ${totals.insights} playbook insights`)
  console.log(`expected ${SEED_DEALS.length} deals / ${SEED_CALL_COUNT} calls from the seed set`)
  if (!SKIP_MEMORY) console.log('memory banks written — run the server and open the dashboard')
}

main().catch((error) => {
  console.error('\nseed failed:', error)
  process.exit(1)
})
