import cors from 'cors'
import express from 'express'
import { config, hasGroqKey, hasHindsightKey } from './config.js'
import { listDeals } from './db.js'
import { hindsightHealth, hindsightMode } from './lib/hindsight.js'
import { dealsRouter } from './routes/deals.js'
import { playbookRouter } from './routes/playbook.js'

const app = express()

app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', async (req, res) => {
  const hindsight = await hindsightHealth()
  res.json({
    ok: true,
    service: 'dealmind-server',
    memory: { mode: hindsightMode(), reachable: hindsight.reachable, reason: hindsight.reason, configured: hasHindsightKey },
    llm: { configured: hasGroqKey, model: config.groq.model },
    deals: listDeals.all().length,
  })
})

app.use('/api/deals', dealsRouter)
app.use('/api/playbook', playbookRouter)

app.use('/api', (req, res) => res.status(404).json({ error: `no route for ${req.method} ${req.originalUrl}` }))

app.use((error, req, res, next) => {
  const status = error.status || 500
  if (status >= 500) console.error(`[api] ${req.method} ${req.originalUrl} —`, error.message)
  res.status(status).json({ error: error.message || 'internal error' })
})

app.listen(config.port, () => {
  console.log(`DealMind API listening on http://localhost:${config.port}`)
  console.log(`  memory: ${hindsightMode()}${hindsightMode() === 'live' ? ` (${config.hindsight.baseUrl})` : ' — local mock store'}`)
  console.log(`  llm:    ${hasGroqKey ? config.groq.model : 'not configured, using heuristics'}`)
})
