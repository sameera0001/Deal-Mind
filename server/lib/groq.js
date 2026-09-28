import { config, hasGroqKey } from '../config.js'
import { postJson } from './http.js'

const EMPTY_EXTRACTION = {
  summary: '',
  sentiment: 'neutral',
  objections: [],
  competitors: [],
  stakeholders: [],
  commitments: [],
  next_steps: [],
  signals: [],
  what_worked: [],
  resolutions: [],
}

const asObjects = (value) =>
  (Array.isArray(value) ? value : [])
    .map((v) => (typeof v === 'string' ? { text: v.trim() } : v))
    .filter((v) => v && typeof v === 'object')

const asStrings = (value) =>
  (Array.isArray(value) ? value : [])
    .map((v) => (typeof v === 'string' ? v.trim() : String(v?.text ?? v?.name ?? '').trim()))
    .filter(Boolean)

function parseJsonLoose(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('empty model response')
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.search(/[{[]/)
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        /* fall through to the throw below */
      }
    }
  }
  throw new Error('model response was not valid JSON')
}

async function chat({ system, user, maxTokens = 3000, json = true, label = 'groq chat' }) {
  if (!hasGroqKey) throw new Error('no GROQ_API_KEY configured')

  const attempt = async (tokens) => {
    const body = {
      model: config.groq.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_completion_tokens: tokens,
      stream: false,
    }
    if (json) body.response_format = { type: 'json_object' }

    const result = await postJson(`${config.groq.baseUrl}/chat/completions`, {
      body,
      headers: { Authorization: `Bearer ${config.groq.apiKey}` },
      timeoutMs: config.groq.timeoutMs,
      retries: config.groq.maxRetries,
      label,
    })

    const choice = result?.choices?.[0]
    const content = choice?.message?.content ?? ''
    if (!content && choice?.finish_reason === 'length') throw new Error('model ran out of reasoning budget')
    if (!content && choice?.message?.reasoning) return choice.message.reasoning
    if (!content) throw new Error('model returned no content')
    return content
  }

  try {
    return await attempt(maxTokens)
  } catch (error) {
    if (!/budget|no content/.test(error.message)) throw error
    return attempt(maxTokens * 2)
  }
}

/* ------------------------------------------------- heuristic mock extract --- */

const OBJECTION_HINTS = [
  /too (?:expensive|high|much)/i,
  /price|pricing|cost|budget|discount/i,
  /concern(?:ed)? about|worried|hesitan|not convinced|skeptical/i,
  /need to (?:check|think|discuss|run (?:it )?by)/i,
  /we'?re (?:also )?(?:looking at|evaluating|considering|talking to)/i,
  /how (?:do you know|can you (?:guarantee|ensure))/i,
  /what happens (?:if|when)|what if/i,
  /security|compliance|integration|technical|implementation|onboarding|support/i,
  /no budget|next (?:year|quarter)|revisit/i,
]

const COMPETITOR_HINTS = [
  /\b(?:also|we'?re|they)\s+(?:also )?(?:looking at|evaluating|considering|talking to|reviewing|using|in talks with|shopping)\s+([^.,;!?]+)/i,
  /\b(competitor|incumbent|vendor)\b/i,
  /\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*)\s+(?:is|are|'s|has)\s+(?:our|the|their)\s+(?:current|vendor|provider)/i,
]

const COMMITMENT_HINTS = [/\b(?:i'?ll|i will|we'?ll|we will|can you|could you|please)\b[^.!?]*[.!?]/gi, /\bby (?:the )?(?:end of|next|monday|friday|q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december)[^.!?]*[.!?]/gi]

const SENTIMENT_HINTS = [
  [/\b(frustrat|annoy|disappoint|angry|too (?:much|high)|won'?t|not going to|no thanks|push ?back|escalat)/i, -1],
  [/\b(concern|worried|risk|hesitan|problem|issue|object|competitor|delay)/i, -0.5],
  [/\b(excited|great|love|perfect|approved|green ?light|happy|thrilled|ready to move|sign)/i, 1],
]

function guessSentiment(text) {
  let score = 0
  for (const [pattern, weight] of SENTIMENT_HINTS) if (pattern.test(text)) score += weight
  if (score <= -0.5) return 'negative'
  if (score < 0) return 'mixed'
  if (score >= 1) return 'positive'
  return 'neutral'
}

const cleanSentence = (s) => s.replace(/\s+/g, ' ').trim()

export function mockExtractFacts(transcript) {
  const text = String(transcript || '')
  const sentences = text
    .split(/(?<=[.!?])\n+|\n+/)
    .flatMap((block) => block.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map(cleanSentence)
    .filter((s) => s.length > 12)

  const objections = []
  const competitors = new Set()
  const commitments = []

  for (const sentence of sentences) {
    if (OBJECTION_HINTS.some((p) => p.test(sentence))) objections.push({ text: sentence, status: 'open', detail: '' })
    for (const pattern of COMPETITOR_HINTS) {
      const match = sentence.match(pattern)
      if (match?.[1]) competitors.add(cleanSentence(match[1]))
    }
    for (const pattern of COMMITMENT_HINTS) {
      for (const match of sentence.matchAll(pattern)) {
        const value = cleanSentence(match[0])
        if (value.length > 12) commitments.push({ text: value, owner: /i'?ll|we'?ll|we will|i will/i.test(value) ? 'us' : 'them', due: '' })
      }
    }
  }

  const stakeholders = []
  const stakeholderPattern = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)?)\b[^.!?]{0,60}?\b(VP|Vice President|Head of|Director|Manager|CFO|CTO|COO|CISO|Chief|CFO|Lead|Analyst|President)\b[^.!?]*/g
  for (const match of text.matchAll(stakeholderPattern)) {
    const name = cleanSentence(match[1])
    if (name && !stakeholders.some((s) => s.name === name)) {
      stakeholders.push({ text: name, name, role: cleanSentence(match[2]), stance: 'neutral' })
    }
  }

  return {
    ...EMPTY_EXTRACTION,
    summary: cleanSentence(text).slice(0, 400),
    sentiment: guessSentiment(text),
    objections: objections.slice(0, 8),
    competitors: [...competitors].slice(0, 6).map((name) => ({ name, text: `Competitor mentioned: ${name}` })),
    stakeholders: stakeholders.slice(0, 6),
    commitments: commitments.slice(0, 8),
    next_steps: [],
    signals: [],
    what_worked: sentences.filter((s) => /resonat|worked (?:well|great)|loved|made sense|good (?:call|point)|helpful|exactly|strong (?:case|point)|finally/i.test(s)).slice(0, 5),
    resolutions: [],
    mock: true,
  }
}

/* ------------------------------------------------------------- public API --- */

/**
 * Turn a raw transcript into structured, storable sales facts.
 * @param {string|{transcript:string, deal?:object, callIndex?:number, callCount?:number}} input
 */
export async function extractFactsFromTranscript(input, deal = null) {
  const transcript = typeof input === 'string' ? input : input?.transcript
  const contextDeal = deal ?? (typeof input === 'object' ? input.deal : null)
  if (!transcript?.trim()) throw new Error('transcript is empty')

  if (!hasGroqKey) return mockExtractFacts(transcript)

  const system = `You are the memory layer of DealMind, an AI sales assistant.
Read one sales call transcript and extract only what was actually said or committed in it.
Never invent details. If a category has nothing, return an empty array.
Respond with a single JSON object and no prose or markdown.`

  const user = `Deal: ${contextDeal?.company_name ?? 'Unknown'}${contextDeal?.contact_name ? ` (contact: ${contextDeal.contact_name})` : ''}

Extract from this transcript:
1. summary: 2-3 sentence summary of what happened and what moved forward.
2. sentiment: one of positive, neutral, mixed, negative.
3. objections: things the customer pushed back on. Each: text (short, self-contained, max 140 chars), status ("open" unless the call explicitly resolved it), detail (the underlying concern).
4. competitors: any other vendor mentioned. Each: name, text.
5. stakeholders: people named. Each: name, role, stance (champion, neutral, skeptic, blocker).
6. commitments: promises made by either side. Each: text, owner ("us" or "them"), due.
7. next_steps: concrete next actions agreed.
8. signals: buying signals, risk signals, or competitive pressure worth flagging.
9. what_worked: framings, proof points or moves from us that the customer reacted well to. Each a short string.
10. resolutions: earlier objections this call explicitly resolved. Each: objection (short label of the earlier objection, phrased as it was originally raised), how_resolved.

Use this exact JSON shape:
{"summary":"","sentiment":"neutral","objections":[{"text":"","status":"open","detail":""}],"competitors":[{"name":"","text":""}],"stakeholders":[{"name":"","role":"","stance":"neutral"}],"commitments":[{"text":"","owner":"us","due":""}],"next_steps":[""],"signals":[""],"what_worked":[""],"resolutions":[{"objection":"","how_resolved":""}]}

Transcript:
"""
${transcript.slice(0, 12000)}
"""`

  try {
    const raw = await chat({ system, user, maxTokens: 3000, json: true, label: 'groq extract' })
    const parsed = parseJsonLoose(raw)
    return {
      summary: String(parsed.summary ?? '').trim(),
      sentiment: ['positive', 'neutral', 'mixed', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      objections: asObjects(parsed.objections)
        .map((o) => ({
          text: String(o.text ?? o.objection ?? '').trim(),
          status: o.status === 'resolved' ? 'resolved' : 'open',
          detail: String(o.detail ?? '').trim(),
        }))
        .filter((o) => o.text),
      competitors: asObjects(parsed.competitors)
        .map((c) => {
          const name = String(c.name ?? '').trim() || String(c.text ?? '').trim()
          return { name, text: name }
        })
        .filter((c) => c.name),
      stakeholders: asObjects(parsed.stakeholders)
        .map((s) => {
          const name = String(s.name ?? s.text ?? '').trim()
          return { name, text: name, role: String(s.role ?? '').trim(), stance: String(s.stance ?? 'neutral').trim() }
        })
        .filter((s) => s.name),
      commitments: asObjects(parsed.commitments)
        .map((c) => ({
          text: String(c.text ?? c.commitment ?? '').trim(),
          owner: c.owner === 'them' ? 'them' : 'us',
          due: String(c.due ?? '').trim(),
        }))
        .filter((c) => c.text),
      next_steps: asStrings(parsed.next_steps),
      signals: asStrings(parsed.signals),
      what_worked: asStrings(parsed.what_worked),
      resolutions: asObjects(parsed.resolutions)
        .map((r) => ({
          objection: String(r.objection ?? r.text ?? '').trim(),
          how_resolved: String(r.how_resolved ?? '').trim(),
        }))
        .filter((r) => r.objection),
    }
  } catch (error) {
    console.warn(`[groq] extraction failed, using heuristic fallback — ${error.message}`)
    return mockExtractFacts(transcript)
  }
}

const MOCK_BRIEF = {
  situation: 'This deal has no call history yet, so there is nothing specific to prepare from.',
  open_objections: [],
  what_worked: [],
  suggested_talking_points: [
    'Re-confirm the buying committee and the process timeline.',
    'Ask what has changed since our last conversation.',
    'Establish the success criteria the deal will be judged on.',
  ],
  risks: [],
  next_step: 'Run discovery and capture the buying process in detail.',
  confidence: 'low',
}

function mockBrief(deal, facts, memories = []) {
  const objections = (facts?.objections ?? []).filter((o) => o.status !== 'resolved')
  const competitors = facts?.competitors ?? []
  const stakeholders = facts?.stakeholders ?? []
  return {
    situation: `${deal.company_name} has ${Object.keys(facts ?? {}).length ? 'recorded call history' : 'no recorded history'}.${competitors.length ? ` Competing against ${competitors.map((c) => c.name).filter(Boolean).join(', ')}.` : ''}`,
    open_objections: objections.slice(0, 6).map((o) => ({
      text: o.text,
      why_it_matters: o.detail || 'Raised by the customer and not yet addressed.',
      suggested_response: 'Acknowledge it directly, then re-anchor on the outcome the customer described.',
    })),
    what_worked: (facts?.what_worked ?? []).slice(0, 5),
    suggested_talking_points: [
      objections[0] ? `Re-open "${objections[0].text}" — it is still open.` : 'Confirm the evaluation criteria are unchanged.',
      stakeholders.length ? `Get ${stakeholders[0].name} (${stakeholders[0].role || 'stakeholder'}) on the next call.` : 'Identify the economic buyer.',
      (facts?.next_steps ?? []).length ? `Confirm next steps: ${facts.next_steps.slice(0, 2).join('; ')}` : 'Agree on a concrete next step with a date.',
    ],
    risks: competitors.length ? [`Competitive pressure from ${competitors.map((c) => c.name).filter(Boolean).join(', ')}`] : [],
    next_step: (facts?.next_steps ?? [])[0] || 'Set the agenda and the decision date for the next conversation.',
    confidence: objections.length || stakeholders.length ? 'medium' : 'low',
  }
}

/**
 * Build a pre-call brief from recalled memory.
 * @param {object} input - { deal, facts, memories }
 */
export async function generateBrief(input) {
  const payload = typeof input === 'object' && input !== null ? input : { facts: input }
  const deal = payload.deal ?? { company_name: 'this deal', contact_name: '', stage: '', deal_value: 0 }
  const facts = payload.facts ?? EMPTY_EXTRACTION
  const memories = payload.memories ?? []

  if (!hasGroqKey) return mockBrief(deal, facts, memories)

  const memoryBlock = memories.length
    ? memories.map((m, i) => `${i + 1}. [${m.type ?? 'fact'}] ${m.text}`).join('\n')
    : '(no memories retrieved — say so plainly rather than inventing history)'

  const system = `You are DealMind, prepping a B2B account executive for the next call with ${deal.company_name}.
You are precise, blunt and non-salesy. Everything you assert must come from the call history or the recalled memories below.
Never invent objections, names, dates or competitor activity that is not present in the material.
Respond with a single JSON object and no prose or markdown.`

  const user = `DEAL
Company: ${deal.company_name}
Contact: ${deal.contact_name || 'unknown'}
Value: $${Number(deal.deal_value || 0).toLocaleString()}
Stage: ${deal.stage || 'unknown'}

RECALLED MEMORIES FROM THE DEAL'S HISTORY (Hindsight)
"""
${memoryBlock.slice(0, 12000)}
"""

STRUCTURED FACTS EXTRACTED SO FAR
"""
${JSON.stringify(
  {
    objections: facts.objections ?? [],
    competitors: facts.competitors ?? [],
    stakeholders: facts.stakeholders ?? [],
    commitments: facts.commitments ?? [],
    next_steps: facts.next_steps ?? [],
    signals: facts.signals ?? [],
    what_worked: facts.what_worked ?? [],
  },
  null,
  1,
).slice(0, 8000)}
"""

Write the pre-call brief using this exact JSON shape:
{
  "situation": "2-3 sentences on where the deal actually stands",
  "open_objections": [{"text":"","why_it_matters":"","suggested_response":""}],
  "what_worked": ["moves or framings that landed well"],
  "suggested_talking_points": ["4-6 specific, reference-this-deal talking points"],
  "risks": ["deal risks"],
  "next_step": "the single most important next step",
  "confidence": "low" | "medium" | "high"
}

If the history is thin, make that obvious by setting confidence to "low" and saying what is still unknown. As history grows, be concrete: name people, prices, competitors and dates that actually appeared.`

  try {
    const raw = await chat({ system, user, maxTokens: 3000, json: true, label: 'groq brief' })
    const parsed = parseJsonLoose(raw)
    return {
      situation: String(parsed.situation ?? '').trim(),
      open_objections: asObjects(parsed.open_objections)
        .map((o) => ({
          text: String(o.text ?? '').trim(),
          why_it_matters: String(o.why_it_matters ?? '').trim(),
          suggested_response: String(o.suggested_response ?? '').trim(),
        }))
        .filter((o) => o.text),
      what_worked: asStrings(parsed.what_worked),
      suggested_talking_points: asStrings(parsed.suggested_talking_points),
      risks: asStrings(parsed.risks),
      next_step: String(parsed.next_step ?? '').trim(),
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'medium',
    }
  } catch (error) {
    console.warn(`[groq] brief generation failed, using heuristic fallback — ${error.message}`)
    return mockBrief(deal, facts, memories)
  }
}

/** Free-text Q&A about a deal, grounded in recalled memories. */
export async function answerQuestion({ question, deal, memories = [], brief = null, facts = null }) {
  if (!hasGroqKey) {
    return {
      answer: 'The LLM is not configured, so this answer is built from stored facts only. Check the call timeline and objection tracker for the full history.',
      sources: memories.slice(0, 3).map((m) => m.text),
      mock: true,
    }
  }

  const system = `You are DealMind answering a question about one B2B deal from the account executive who owns it.
Answer only from the recalled memories and structured facts provided. If the material does not cover it, say exactly what is missing and what to find out on the next call.
Be concise and concrete. Never invent names, prices, dates or commitments.`

  const user = `DEAL: ${deal.company_name} — contact ${deal.contact_name || 'unknown'}, stage ${deal.stage}, value $${Number(deal.deal_value || 0).toLocaleString()}

RECALLED MEMORIES
"""
${(memories.length ? memories.map((m, i) => `${i + 1}. ${m.text}`).join('\n') : '(none)').slice(0, 10000)}
"""

STRUCTURED FACTS
"""
${JSON.stringify(
  {
    objections: facts?.objections ?? [],
    competitors: facts?.competitors ?? [],
    stakeholders: facts?.stakeholders ?? [],
    commitments: facts?.commitments ?? [],
    next_steps: facts?.next_steps ?? [],
  },
  null,
  1,
).slice(0, 6000)}
"""

${brief ? `LAST GENERATED BRIEF\n"""\n${JSON.stringify(brief, null, 1).slice(0, 4000)}\n"""\n` : ''}
QUESTION: ${String(question).slice(0, 2000)}

Respond with a single JSON object: {"answer":"2-5 sentences, plain text, no markdown","sources":["short quotes or facts you relied on"]}`

  try {
    const raw = await chat({ system, user, maxTokens: 2000, json: true, label: 'groq ask' })
    const parsed = parseJsonLoose(raw)
    return { answer: String(parsed.answer ?? '').trim(), sources: asStrings(parsed.sources) }
  } catch (error) {
    console.warn(`[groq] ask failed — ${error.message}`)
    return { answer: `I could not generate an answer right now (${error.message}). The call timeline and objection tracker on this page still have the full history.`, sources: [], error: true }
  }
}

export { EMPTY_EXTRACTION, mockExtractFacts as heuristicExtract, guessSentiment }
