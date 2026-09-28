import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { config } from './config.js'

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true })

export const db = new Database(config.dbFile)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS deals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name  TEXT    NOT NULL,
  contact_name  TEXT,
  deal_value    INTEGER NOT NULL DEFAULT 0,
  stage         TEXT    NOT NULL DEFAULT 'discovery',
  health_score  INTEGER NOT NULL DEFAULT 50,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calls (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id     INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  transcript  TEXT    NOT NULL,
  summary     TEXT,
  sentiment   TEXT,
  call_date   TEXT    NOT NULL,
  facts_json  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playbook_insights (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  insight_text          TEXT    NOT NULL,
  supporting_deal_count INTEGER NOT NULL DEFAULT 1,
  theme                 TEXT,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS call_facts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id         INTEGER NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  deal_id         INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  category        TEXT    NOT NULL,
  text            TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'open',
  resolved_call_id INTEGER,
  resolved_at     TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_calls_deal        ON calls(deal_id, call_date);
CREATE INDEX IF NOT EXISTS idx_call_facts_deal   ON call_facts(deal_id, category);
CREATE INDEX IF NOT EXISTS idx_call_facts_call   ON call_facts(call_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_theme ON playbook_insights(theme) WHERE theme IS NOT NULL;
`

db.exec(SCHEMA)

export const nowIso = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

/* ---------------------------------------------------------------- deals --- */

export const listDeals = db.prepare(`
  SELECT d.*,
         (SELECT COUNT(*) FROM calls c WHERE c.deal_id = d.id)                    AS call_count,
         (SELECT MAX(call_date) FROM calls c WHERE c.deal_id = d.id)             AS last_activity,
         (SELECT COUNT(*) FROM call_facts f
            WHERE f.deal_id = d.id AND f.category = 'objection' AND f.status = 'open') AS open_objections,
         (SELECT COUNT(DISTINCT f.text) FROM call_facts f
            WHERE f.deal_id = d.id AND f.category = 'competitor')                 AS competitor_mentions
    FROM deals d
   ORDER BY COALESCE((SELECT MAX(call_date) FROM calls c WHERE c.deal_id = d.id), d.created_at) DESC,
            d.id DESC
`)

export const getDeal = db.prepare('SELECT * FROM deals WHERE id = ?')
export const getCalls = db.prepare('SELECT * FROM calls WHERE deal_id = ? ORDER BY call_date ASC, id ASC')
export const getCall = db.prepare('SELECT * FROM calls WHERE id = ?')
export const getFacts = db.prepare('SELECT * FROM call_facts WHERE deal_id = ? ORDER BY id ASC')

export const insertDeal = db.prepare(`
  INSERT INTO deals (company_name, contact_name, deal_value, stage, health_score, created_at)
  VALUES (@company_name, @contact_name, @deal_value, @stage, @health_score, @created_at)
`)

export const updateDeal = db.prepare(`
  UPDATE deals
     SET company_name = @company_name,
         contact_name = @contact_name,
         deal_value   = @deal_value,
         stage        = @stage,
         health_score = @health_score
   WHERE id = @id
`)

export const setHealthScore = db.prepare('UPDATE deals SET health_score = ? WHERE id = ?')

export const insertCall = db.prepare(`
  INSERT INTO calls (deal_id, transcript, summary, sentiment, call_date, facts_json, created_at)
  VALUES (@deal_id, @transcript, @summary, @sentiment, @call_date, @facts_json, @created_at)
`)

export const upsertInsight = db.prepare(`
  INSERT INTO playbook_insights (insight_text, supporting_deal_count, theme, created_at)
  VALUES (@insight_text, @supporting_deal_count, @theme, @created_at)
  ON CONFLICT (theme) WHERE theme IS NOT NULL
  DO UPDATE SET insight_text = excluded.insight_text,
                supporting_deal_count = excluded.supporting_deal_count
`)

export const listInsights = db.prepare(
  'SELECT * FROM playbook_insights ORDER BY supporting_deal_count DESC, id ASC',
)

export const insertFact = db.prepare(`
  INSERT INTO call_facts (call_id, deal_id, category, text, status, created_at)
  VALUES (@call_id, @deal_id, @category, @text, @status, @created_at)
`)

export const openFacts = db.prepare(
  "SELECT * FROM call_facts WHERE deal_id = ? AND category = ? AND status = 'open' ORDER BY id ASC",
)

export const resolveFact = db.prepare(
  'UPDATE call_facts SET status = ?, resolved_call_id = ?, resolved_at = ? WHERE id = ?',
)

export const deleteDeal = db.prepare('DELETE FROM deals WHERE id = ?')
export const deleteCall = db.prepare('DELETE FROM calls WHERE id = ?')

/* ---------------------------------------------------- transaction helper --- */

export function withTransaction(fn) {
  return db.transaction(fn)()
}
