import fs from 'node:fs'
import path from 'node:path'
import { config, hasHindsightKey } from '../config.js'
import { postJson, requestJson, HttpError } from './http.js'

/*
 * Thin wrapper over the Hindsight memory API.
 *   retainFacts(dealId, facts)  -> POST .../banks/<bank>/memories
 *   recallFacts(dealId, query)   -> POST .../banks/<bank>/memories/recall
 *
 * One memory bank per deal keeps a deal's history isolated, and every retain is
 * tagged with deal:<id> so a recall can be scoped back to the deal.
 *
 * If the API is unreachable (offline demo, dead key, no network) every call
 * transparently falls back to a file-backed store that mimics retain/recall with
 * keyword scoring, so the app never breaks live.
 */

export const bankIdForDeal = (dealId) => `${config.hindsight.bankPrefix}-${dealId}`
export const dealTag = (dealId) => `deal:${dealId}`

/* ------------------------------------------------------------ mock store --- */

const emptyStore = () => ({ banks: {} })
let mockStore = null
let mockDegraded = null

function loadMockStore() {
  if (mockStore) return mockStore
  try {
    if (fs.existsSync(config.mockMemoryFile)) {
      mockStore = JSON.parse(fs.readFileSync(config.mockMemoryFile, 'utf8'))
      if (!mockStore.banks) mockStore = emptyStore()
    } else {
      mockStore = emptyStore()
    }
  } catch {
    mockStore = emptyStore()
  }
  return mockStore
}

function saveMockStore() {
  try {
    fs.mkdirSync(path.dirname(config.mockMemoryFile), { recursive: true })
    fs.writeFileSync(config.mockMemoryFile, JSON.stringify(mockStore, null, 2))
  } catch {
    /* mock mode is best-effort; never fail a request because of it */
  }
}

const STOP_WORDS = new Set(
  'the a an and or of to in on for with is are was were be been that this those these it its their they them what which who when where how why did do does had have has at by from as but not any all can could would should will we you our us i me my'.split(' '),
)

const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9$%.]+/)
    .map((t) => t.replace(/^[.]+|[.]+$/g, ''))
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))

function mockRetain(bankId, items) {
  const store = loadMockStore()
  const bank = store.banks[bankId] ?? (store.banks[bankId] = [])

  for (const item of items) {
    if (item.document_id) {
      const existing = bank.findIndex((f) => f.document_id === item.document_id)
      if (existing !== -1) bank.splice(existing, 1)
    }
    const sentences = String(item.content || '')
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15)

    for (const sentence of sentences.length ? sentences : [String(item.content || '')]) {
      bank.push({
        id: `mock-${bank.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
        text: sentence,
        type: 'world',
        context: item.context ?? null,
        metadata: item.metadata ?? null,
        tags: item.tags ?? [],
        entities: [],
        document_id: item.document_id ?? null,
        occurred_start: item.timestamp ?? null,
        occurred_end: item.timestamp ?? null,
        mentioned_at: new Date().toISOString(),
      })
    }
  }
  saveMockStore()
  return { success: true, bank_id: bankId, items_count: items.length, async: false, mode: 'mock' }
}

function mockRecall(bankId, { query = '', limit = 12, temporalWindow = null, types = null } = {}) {
  const store = loadMockStore()
  const all = store.banks[bankId] ?? []
  const bounds = (Array.isArray(temporalWindow) ? temporalWindow : [temporalWindow])
    .map((b) => Date.parse(b))
    .filter((b) => !Number.isNaN(b))
  const window = bounds.length === 2 ? bounds : null

  const inWindow = (fact) => {
    if (!window || !fact.occurred_start) return true
    const t = Date.parse(fact.occurred_start)
    return !Number.isNaN(t) && t >= window[0] && t <= window[1]
  }

  const queryTokens = new Set(tokenize(query))
  const scored = all
    .filter(inWindow)
    .filter((f) => !types || !types.length || types.includes(f.type))
    .map((fact) => {
      const factTokens = new Set(tokenize(fact.text))
      let overlap = 0
      for (const token of queryTokens) if (factTokens.has(token)) overlap += 1
      const coverage = queryTokens.size ? overlap / queryTokens.size : 0
      const recency = fact.occurred_start ? 1 / (1 + (Date.now() - Date.parse(fact.occurred_start)) / 86_400_000) : 0.1
      return { fact, score: coverage * 0.85 + recency * 0.15 }
    })
    .filter((s) => queryTokens.size === 0 || s.score > 0.01)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return { results: scored.map((s) => ({ ...s.fact, scores: { final: Number(s.score.toFixed(4)) } })), mode: 'mock' }
}

/* -------------------------------------------------------------- live mode --- */

const authHeaders = () => (config.hindsight.apiKey ? { Authorization: `Bearer ${config.hindsight.apiKey}` } : {})

const bankPath = (bankId, suffix) => `${config.hindsight.baseUrl}/v1/default/banks/${encodeURIComponent(bankId)}${suffix}`

const canTryLive = () => config.hindsight.mode !== 'mock' && hasHindsightKey

function noteDegraded(error) {
  const message = error instanceof HttpError ? error.message : String(error?.message || error)
  if (mockDegraded !== message) {
    mockDegraded = message
    console.warn(`[hindsight] live API unavailable, using local mock store — ${message}`)
    if (error instanceof HttpError && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
      console.warn(`[hindsight] this looks like a request-shape bug, not an outage. Response body: ${JSON.stringify(error.body).slice(0, 500)}`)
    }
  }
}

/* ------------------------------------------------------------------ API --- */

/**
 * Persist extracted facts for a deal.
 * @param {number|string} dealId
 * @param {Array<{content:string, context?:string, timestamp?:string, document_id?:string, tags?:string[], metadata?:Record<string,string>}>} facts
 */
export async function retainFacts(dealId, facts, { async: asyncMode = false } = {}) {
  const bankId = bankIdForDeal(dealId)
  const items = (Array.isArray(facts) ? facts : [facts]).filter((f) => f && f.content)

  if (!items.length) return { success: true, bank_id: bankId, items_count: 0, mode: 'skipped' }

  if (canTryLive()) {
    try {
      const payload = { items, async: asyncMode }
      const result = await postJson(bankPath(bankId, '/memories'), {
        body: payload,
        headers: authHeaders(),
        timeoutMs: config.hindsight.timeoutMs,
        retries: 1,
        label: 'hindsight retain',
      })
      return { ...result, mode: 'live', bank_id: bankId }
    } catch (error) {
      noteDegraded(error)
    }
  }

  return { ...mockRetain(bankId, items), reason: mockDegraded }
}/**
 * Query a deal's memory bank.
 * @param {number|string} dealId
 * @param {string} query
 */
export async function recallFacts(dealId, query, { budget = 'mid', maxTokens = 3000, types = null, tags = null, tagsMatch = null, temporalWindow = null, limit = 12 } = {}) {
  const bankId = bankIdForDeal(dealId)

  if (canTryLive()) {
    try {
      const body = { query: String(query || '').slice(0, 4000), budget, max_tokens: maxTokens }
      if (types?.length) body.types = types
      if (tags?.length) {
        body.tags = tags
        if (tagsMatch) body.tags_match = tagsMatch
      }
      if (temporalWindow?.start) body.temporal_window = temporalWindow
      body.include = { entities: null }

      const result = await postJson(bankPath(bankId, '/memories/recall'), {
        body,
        headers: authHeaders(),
        timeoutMs: config.hindsight.timeoutMs,
        retries: 1,
        label: 'hindsight recall',
      })

      return { results: (result?.results ?? []).slice(0, limit), mode: 'live', bank_id: bankId }
    } catch (error) {
      noteDegraded(error)
    }
  }

  const result = mockRecall(bankId, { query, limit, types, temporalWindow: temporalWindow ? [temporalWindow.start, temporalWindow.end] : null })
  return { results: result.results, mode: 'mock', bank_id: bankId, reason: mockDegraded }
}

/** Agentic read over a deal's memory — used by the "Ask DealMind" box. */
export async function reflectOnDeal(dealId, query) {
  const bankId = bankIdForDeal(dealId)
  if (canTryLive()) {
    try {
      const result = await postJson(bankPath(bankId, '/reflect'), {
        body: { query: String(query || '').slice(0, 4000), budget: 'mid', max_tokens: 1200 },
        headers: authHeaders(),
        timeoutMs: config.hindsight.timeoutMs,
        retries: 1,
        label: 'hindsight reflect',
      })
      return { answer: result?.text || result?.answer || '', mode: 'live' }
    } catch (error) {
      noteDegraded(error)
    }
  }
  return { answer: '', mode: 'mock' }
}

export async function hindsightHealth() {
  if (!canTryLive()) {
    return { reachable: false, mode: 'mock', reason: hasHindsightKey ? 'HINDSIGHT_MODE=mock' : 'no HINDSIGHT_API_KEY' }
  }
  try {
    const result = await requestJson(`${config.hindsight.baseUrl}/health`, {
      headers: authHeaders(),
      timeoutMs: 15_000,
      label: 'hindsight health',
    })
    return { reachable: true, mode: 'live', detail: result }
  } catch (error) {
    return { reachable: false, mode: 'mock', reason: error.message }
  }
}

export const hindsightMode = () => (canTryLive() ? 'live' : 'mock')
export const isDegraded = () => mockDegraded
export { mockDegraded }
