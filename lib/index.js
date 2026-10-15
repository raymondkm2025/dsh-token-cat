/**
 * dsh-token-cat host half.
 *
 * Folds real token usage out of the durable session log and serves it to the
 * browser half over two HTTP routes. Nothing here estimates: the source is the
 * `usage` payload carried by every committed `assistant/message` session event,
 * tagged with the provider and model that actually served the call.
 *
 * Cost is a local estimate — the harness exposes no pricing service — so the
 * rate table below is the single place to correct it.
 */

// ============================================================
// EDIT THESE RATES: USD per 1,000,000 tokens.
// `key` is matched as a substring of the lowercased model id; the FIRST
// matching entry wins, so put specific models first and keep the empty-string
// entry last as the fallback. `cache` is the cache-read rate; cache writes are
// billed at the input rate.
// ============================================================
const RATES = [
  { key: 'deepseek-reasoner', in: 0.55, cache: 0.14, out: 2.19 },
  { key: 'deepseek-chat', in: 0.27, cache: 0.07, out: 1.10 },
  { key: 'deepseek-v4', in: 0.27, cache: 0.07, out: 1.10 },
  { key: 'deepseek', in: 0.27, cache: 0.07, out: 1.10 },
  { key: '', in: 0.27, cache: 0.07, out: 1.10 },
]

const MAX_SESSIONS = 24
const IDLE_MS = 2500

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0
}

function rateFor(model) {
  const m = String(model || '').toLowerCase()
  for (let i = 0; i < RATES.length; i++) {
    if (m.indexOf(RATES[i].key) !== -1) return RATES[i]
  }
  return RATES[RATES.length - 1]
}

function zeroBucket() {
  return {
    input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0,
    calls: 0, tokens: 0, cost: 0, lastAt: 0,
    id: '', provider: '', model: '',
  }
}

// Fold one usage record into a bucket. `inputTokens` is treated as the
// inclusive input count, so cache reads and writes are carved out of it and
// billed at their own rate rather than being double charged.
function fold(bucket, usage, rate) {
  const input = num(usage.inputTokens)
  const output = num(usage.outputTokens)
  const cr = num(usage.cacheReadTokens)
  const cw = num(usage.cacheWriteTokens)
  const rs = num(usage.reasoningTokens)
  const billed = Math.max(0, input - cr - cw)

  bucket.input += input
  bucket.output += output
  bucket.cacheRead += cr
  bucket.cacheWrite += cw
  bucket.reasoning += rs
  bucket.tokens += input + output
  bucket.calls += 1
  bucket.cost += (billed * rate.in + cr * rate.cache + cw * rate.in + output * rate.out) / 1e6
}

export const name = 'dsh-token-cat'
export const inject = ['webServer', 'timer']

export function apply(ctx) {
  const total = zeroBucket()
  const byModel = new Map()
  const bySession = new Map()
  let busy = false
  let idleStop = null
  let firstAt = 0
  let lastAt = 0

  function prune() {
    while (bySession.size > MAX_SESSIONS) {
      let victim = null
      let oldest = Infinity
      bySession.forEach((b, k) => {
        if (b.lastAt < oldest) { oldest = b.lastAt; victim = k }
      })
      if (victim === null) return
      bySession.delete(victim)
    }
  }

  function absorb(usage, provider, model, sessionId, time) {
    if (!usage || typeof usage !== 'object') return
    const input = num(usage.inputTokens)
    const output = num(usage.outputTokens)
    if (input + output + num(usage.cacheReadTokens) + num(usage.cacheWriteTokens) <= 0) return

    const rate = rateFor(model)
    fold(total, usage, rate)

    const mk = String(provider || '?') + '/' + String(model || '?')
    let mb = byModel.get(mk)
    if (mb === undefined) {
      mb = zeroBucket()
      mb.provider = String(provider || '?')
      mb.model = String(model || '?')
      byModel.set(mk, mb)
    }
    fold(mb, usage, rate)

    const sid = String(sessionId === undefined || sessionId === null ? 'unknown' : sessionId)
    let sb = bySession.get(sid)
    if (sb === undefined) {
      sb = zeroBucket()
      sb.id = sid
      bySession.set(sid, sb)
    }
    fold(sb, usage, rate)

    const at = typeof time === 'number' && Number.isFinite(time) ? time : 0
    if (at > 0) {
      sb.lastAt = at
      if (firstAt === 0 || at < firstAt) firstAt = at
      if (at > lastAt) lastAt = at
    }
    prune()
  }

  function markBusy() {
    busy = true
    if (idleStop !== null) idleStop()
    idleStop = ctx.timeout(() => { busy = false; idleStop = null }, IDLE_MS)
  }

  // Seed from sessions already live, so the overlay opens with the current
  // conversation's real history instead of starting from zero.
  const sessions = ctx.get('sessions')
  if (sessions !== undefined) {
    let live = []
    try { live = sessions.list() || [] } catch (err) { live = [] }
    for (const s of live) {
      let events = []
      try { events = s.ownEvents() || [] } catch (err) { events = [] }
      const sid = String(s.id)
      for (const ev of events) {
        if (!ev || ev.type !== 'assistant/message') continue
        const data = ev.data
        if (!data) continue
        const src = data.message ? data.message.source : null
        absorb(data.usage, src ? src.provider : null, src ? src.model : null, sid, ev.time)
      }
    }
  }

  // Live feed: every committed session event. Only scalar leaves of the event
  // are read — nothing internal is retained.
  ctx.on('session/event', (session, event) => {
    markBusy()
    if (!event || event.type !== 'assistant/message') return
    const data = event.data
    if (!data) return
    const src = data.message ? data.message.source : null
    absorb(
      data.usage,
      src ? src.provider : null,
      src ? src.model : null,
      session ? session.id : null,
      event.time,
    )
  })

  function ranked(map, limit) {
    const rows = []
    map.forEach((b) => {
      rows.push({
        id: b.id, provider: b.provider, model: b.model,
        tokens: Math.round(b.tokens),
        cost: b.cost,
        calls: b.calls,
        input: Math.round(b.input),
        output: Math.round(b.output),
        cacheRead: Math.round(b.cacheRead),
        cacheWrite: Math.round(b.cacheWrite),
        reasoning: Math.round(b.reasoning),
        lastAt: b.lastAt,
      })
    })
    rows.sort((a, b) => b.tokens - a.tokens)
    return rows.slice(0, limit)
  }

  function snapshot() {
    return {
      busy,
      firstAt,
      lastAt,
      modelCount: byModel.size,
      sessionCount: bySession.size,
      totals: {
        tokens: Math.round(total.tokens),
        cost: total.cost,
        calls: total.calls,
        input: Math.round(total.input),
        output: Math.round(total.output),
        cacheRead: Math.round(total.cacheRead),
        cacheWrite: Math.round(total.cacheWrite),
        reasoning: Math.round(total.reasoning),
      },
      models: ranked(byModel, 6),
      sessions: ranked(bySession, 6),
      rateNote: 'Estimated at list rates per 1M tokens: in $0.27 / cache read $0.07 / out $1.10.',
    }
  }

  function reset() {
    const fresh = zeroBucket()
    for (const k of Object.keys(fresh)) total[k] = fresh[k]
    byModel.clear()
    bySession.clear()
    firstAt = 0
    lastAt = 0
  }

  function sendJson(res, body, status = 200) {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(JSON.stringify(body))
  }

  /**
   * Whether a request came from another site.
   *
   * These routes are served with no authentication in front of them, and a
   * browser issues a cross-site GET for an `<img>` or `<script>` tag without
   * asking anyone — which was enough to wipe the counters. `Sec-Fetch-Site`
   * catches subresource loads (they carry no `Origin` at all) and the
   * `Origin`/`Host` comparison catches fetch/XHR. A request with neither header
   * is not a browser and is allowed through.
   */
  function isCrossSite(req) {
    const headers = req.headers || {}
    if (String(headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') return true
    const origin = headers.origin
    if (typeof origin !== 'string' || origin === '' || origin === 'null') return false
    let originHost = ''
    try {
      originHost = new URL(origin).host
    } catch (err) {
      originHost = ''
    }
    const selfHost = String(headers.host || '')
    return originHost === '' || selfHost === '' || originHost !== selfHost
  }

  // Both registrations are effects, so disabling or unloading the plugin row
  // removes the routes. Registering without an effect leaked them: the route
  // kept serving after the plugin was disabled, and re-enabling then failed with
  // `webserver: duplicate exact route "/dsh-token-cat/snapshot"`.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-token-cat/snapshot',
    handler: (req, res) => {
      if (isCrossSite(req)) return sendJson(res, { ok: false, error: 'cross-site-refused' }, 403)
      sendJson(res, snapshot())
    },
  }), 'token-cat: snapshot route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-token-cat/reset',
    handler: (req, res) => {
      // Clearing the counters changes state, so it is POST-only and must carry a
      // JSON content type — a cross-site page cannot send either without a
      // preflight this server never answers.
      if (isCrossSite(req)) return sendJson(res, { ok: false, error: 'cross-site-refused' }, 403)
      const method = String(req.method || 'GET').toUpperCase()
      if (method !== 'POST') {
        return sendJson(res, { ok: false, error: 'method-not-allowed', hint: 'reset requires POST' }, 405)
      }
      const type = String((req.headers || {})['content-type'] || '').toLowerCase()
      if (!type.startsWith('application/json')) {
        return sendJson(res, { ok: false, error: 'content-type-must-be-application-json' }, 415)
      }
      reset()
      sendJson(res, { ok: true })
    },
  }), 'token-cat: reset route')
}
