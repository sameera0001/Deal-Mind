# Deal Intelligence Agent — Replit Agent Build Brief

## 1. APP OVERVIEW
App Name: DealMind
One-line description: An AI sales assistant that remembers every objection, competitor mention, and commitment across a deal's entire call history — and gets sharper before every new call.
Core problem: Sales reps waste hours before every call re-reading scattered CRM notes to recall what a prospect said last time. DealMind uses persistent agent memory (via Hindsight) to remember every interaction across a deal's lifecycle, and learn patterns across multiple deals.
Target user: B2B sales reps and account executives managing multi-call deal cycles.

## 2. CORE FEATURES
1. Deal dashboard — list of active deals with company name, stage, value, last activity.
2. Deal detail/timeline view — chronological list of calls for a deal.
3. Log a call — form to add call transcript/notes.
4. AI memory extraction (Hindsight write) — extract objections, competitors, stakeholders, commitments from each call and store in Hindsight tagged to that deal.
5. Pre-call brief generator (Hindsight read) — button that queries Hindsight for deal history and generates a brief: open objections, what's worked, suggested talking points.
6. Before/after memory demo view — shows brief quality improving from Call 1 (generic) to Call 5 (specific) for a seeded demo deal.
7. Cross-deal playbook learning — identifies patterns across all deals and surfaces as "Playbook Insights".
8. Objection tracker, competitor mentions log, deal health score.
9. "Ask DealMind" chat box for free-text Q&A on a deal.

## 3. TECH STACK
Frontend: React (Vite) + TailwindCSS (already set up in client/ folder)
Backend: Node.js + Express
Database: SQLite (simplest for hackathon)
Memory layer (REQUIRED): Hindsight — https://hindsight.vectorize.io/ — use retain (write) and recall (query) functions
LLM: Groq API, model openai/gpt-oss-120b
API keys are in .env file at project root: HINDSIGHT_API_KEY, GROQ_API_KEY, PORT

## 4. PAGES
1. Dashboard (/) — deal cards grid, "+ New Deal" button
2. Deal Detail (/deal/:id) — call timeline, "Prepare Me for Next Call" button, objections tracker, competitor mentions, Ask DealMind chat box
3. Log a Call (modal) — paste transcript, "Save & Extract Insights" button
4. Before/After Demo (/demo) — step through 5 pre-seeded calls for one demo deal, showing brief getting richer each time
5. Playbook Insights (/playbook) — cross-deal learned patterns

## 5. DATA MODELS
deals: id, company_name, contact_name, deal_value, stage, health_score, created_at
calls: id, deal_id, transcript, summary, sentiment, call_date
playbook_insights: id, insight_text, supporting_deal_count, created_at

Seed data: 3 demo deals (Acme Corp, Northwind Retail, Globex Manufacturing). Acme Corp should have 5 realistic sequential call transcripts showing a narrative arc: Call 1 (discovery, generic), Call 2 (pricing objection), Call 3 (competitor mentioned), Call 4 (technical concern), Call 5 (objections resolved, moving to close).

## 6. BUILD INSTRUCTIONS
1. Set up Express backend server in a new "server" folder at project root, using the existing client/ folder as frontend (don't recreate it).
2. Set up SQLite database with the deals, calls, playbook_insights tables. Write a seed script with the 3 demo deals and 5 Acme Corp call transcripts.
3. Create lib/hindsight.js with retainFacts(dealId, facts) and recallFacts(dealId, query) functions wrapping the Hindsight API. Include a fallback mock mode if the API is unreachable.
4. Create lib/groq.js with extractFactsFromTranscript(transcript) and generateBrief(facts) functions using the Groq API.
5. Build backend API routes: GET/POST /api/deals, GET /api/deals/:id, POST /api/deals/:id/calls, GET /api/deals/:id/brief, POST /api/deals/:id/ask, GET /api/playbook
6. Build the Dashboard page in the React frontend.
7. Build the Deal Detail page with call timeline, brief generator, objections tracker, chat box.
8. Build the Before/After Demo page with the 5-call stepper.
9. Build the Playbook Insights page.
10. Style everything with Tailwind: indigo/violet primary color, card-based layout, rounded corners, soft shadows, Inter font.
11. Add loading states and error handling with fallback/mock data everywhere so the demo never breaks live.
12. Test the full flow end to end.