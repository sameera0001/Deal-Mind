export class HttpError extends Error {
  constructor(message, { status, body, url, retryAfterMs = null } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
    this.url = url
    this.retryAfterMs = retryAfterMs
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * POST JSON with a hard timeout and bounded retries on transient failures.
 * Only network errors, 408, 429 and 5xx are retried.
 */
export async function postJson(url, { body, headers = {}, timeoutMs = 60_000, retries = 2, label = 'request' }) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      const text = await response.text()
      let parsed
      try {
        parsed = text ? JSON.parse(text) : null
      } catch {
        parsed = { raw: text }
      }

      if (!response.ok) {
        const error = new HttpError(`${label} failed: HTTP ${response.status}`, {
          status: response.status,
          body: parsed,
          url,
          retryAfterMs: Number(response.headers.get('retry-after')) * 1000 || null,
        })
        if (response.status < 500 && response.status !== 408 && response.status !== 429) throw error
        lastError = error
      } else {
        return parsed
      }
    } catch (error) {
      if (error instanceof HttpError && error.status && error.status < 500 && error.status !== 429) throw error
      lastError =
        error.name === 'AbortError'
          ? new HttpError(`${label} timed out after ${timeoutMs}ms`, { url })
          : error
    } finally {
      clearTimeout(timer)
    }

    if (attempt < retries) {
      const rateLimited = lastError?.status === 429
      const wait = lastError?.retryAfterMs || (rateLimited ? 4000 * 2 ** attempt : 600 * 2 ** attempt)
      await sleep(Math.min(wait, 20_000))
    }
  }

  throw lastError
}

export async function requestJson(url, { method = 'GET', headers = {}, timeoutMs = 30_000, label = 'request' } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { method, headers, signal: controller.signal })
    const text = await response.text()
    let parsed
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = { raw: text }
    }
    if (!response.ok) {
      throw new HttpError(`${label} failed: HTTP ${response.status}`, { status: response.status, body: parsed, url })
    }
    return parsed
  } catch (error) {
    if (error.name === 'AbortError') throw new HttpError(`${label} timed out after ${timeoutMs}ms`, { url })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
