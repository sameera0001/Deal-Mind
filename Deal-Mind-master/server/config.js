import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

const here = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(here, '..')

const CLIENT_ENV = path.join(ROOT, 'client', '.env')
const SERVER_ENV = path.join(here, '.env')

loadEnv({ path: CLIENT_ENV })
loadEnv({ path: SERVER_ENV })

export const config = {
  port: Number(process.env.PORT) || 5000,
  hindsight: {
    apiKey: process.env.HINDSIGHT_API_KEY || '',
    baseUrl: (process.env.HINDSIGHT_API_URL || 'https://api.hindsight.vectorize.io').replace(/\/+$/, ''),
    // auto = try the live API and fall back to the local mock store
    // live = live only, mock = never touch the network
    mode: process.env.HINDSIGHT_MODE || 'auto',
    timeoutMs: Number(process.env.HINDSIGHT_TIMEOUT_MS) || 60_000,
    bankPrefix: process.env.HINDSIGHT_BANK_PREFIX || 'dealmind-deal',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: (process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    timeoutMs: Number(process.env.GROQ_TIMEOUT_MS) || 90_000,
    maxRetries: Number(process.env.GROQ_MAX_RETRIES) || 4,
  },
  dbFile: process.env.DB_FILE || path.join(here, 'data', 'dealmind.db'),
  mockMemoryFile: path.join(here, 'data', 'hindsight-mock.json'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
}

export const hasHindsightKey = Boolean(config.hindsight.apiKey)
export const hasGroqKey = Boolean(config.groq.apiKey)
