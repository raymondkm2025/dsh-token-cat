/**
 * Host-half tests for dsh-token-cat.
 *
 * Drives the real routes through a mock webserver/req/res so the two defects
 * fixed here cannot come back:
 *   - the routes are registered as effects, so a disabled plugin row stops
 *     serving them (they used to leak, which also made re-enabling fail with
 *     `duplicate exact route`);
 *   - `/reset` is POST-only, JSON-only and refused cross-site, so a page the
 *     user merely visits can no longer wipe the counters with an <img> tag.
 *
 * Run directly:  node test/host.test.mjs
 */
import { apply } from '../lib/index.js'

let passed = 0
const failures = []
const QUEUE = []

function check(name, fn) {
  QUEUE.push({ name, fn })
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'not equal') + ': ' + String(a) + ' !== ' + String(b))
}

// ------------------------------------------------------------------ fixtures

function makeHarness() {
  const routes = []
  const disposers = []
  const listeners = []
  const ctx = {
    webServer: {
      register(route) {
        routes.push(route)
        return () => {
          const at = routes.indexOf(route)
          if (at !== -1) routes.splice(at, 1)
        }
      },
    },
    // Mixed in by the timer service in a real composition.
    timeout: () => () => {},
    on(name, fn) {
      listeners.push({ name, fn })
      return () => {}
    },
    get() {
      return null
    },
    effect(fn, label) {
      const disposer = fn()
      if (typeof disposer === 'function') disposers.push({ label, disposer })
      return () => {}
    },
  }
  apply(ctx)
  return { routes, disposers, listeners }
}

function fakeReq(method, url, extraHeaders = {}) {
  return {
    method,
    url,
    headers: { host: '127.0.0.1:19387', ...extraHeaders },
  }
}

async function call(route, method, url, extraHeaders) {
  const req = fakeReq(method, url, extraHeaders)
  let status = 0
  let raw = ''
  const res = {
    set statusCode(v) { status = v },
    get statusCode() { return status },
    setHeader() {},
    end(text) { raw = String(text ?? '') },
  }
  await route.handler(req, res)
  let json = null
  try {
    json = JSON.parse(raw)
  } catch (err) {
    json = null
  }
  return { status, json, raw }
}

function routeByPath(routes, path) {
  const route = routes.find((r) => r.path === path)
  if (!route) throw new Error('route not registered: ' + path)
  return route
}

// -------------------------------------------------------------------- checks

const { routes, disposers } = makeHarness()

const snapshotRoute = routeByPath(routes, '/dsh-token-cat/snapshot')
const resetRoute = routeByPath(routes, '/dsh-token-cat/reset')

check('routes are registered as effects', () => {
  eq(disposers.length, 2, 'both routes are owned by the fiber')
  const labels = disposers.map((d) => d.label).join(' ')
  assert(labels.includes('snapshot'), 'snapshot effect is labelled')
  assert(labels.includes('reset'), 'reset effect is labelled')
})

check('snapshot answers a plain same-origin GET', async () => {
  const r = await call(snapshotRoute, 'GET', '/dsh-token-cat/snapshot')
  eq(r.status, 200)
  eq(r.json.totals.tokens, 0, 'no usage folded yet')
  eq(typeof r.json.busy, 'boolean')
})

check('a cross-site snapshot is refused', async () => {
  const img = await call(snapshotRoute, 'GET', '/dsh-token-cat/snapshot', { 'sec-fetch-site': 'cross-site' })
  eq(img.status, 403)
  eq(img.json.error, 'cross-site-refused')

  const xhr = await call(snapshotRoute, 'GET', '/dsh-token-cat/snapshot', { origin: 'http://evil.example' })
  eq(xhr.status, 403)

  const same = await call(snapshotRoute, 'GET', '/dsh-token-cat/snapshot', { origin: 'http://127.0.0.1:19387' })
  eq(same.status, 200, 'the plugin own page is same-origin')
})

check('reset refuses GET — the <img> vector', async () => {
  const r = await call(resetRoute, 'GET', '/dsh-token-cat/reset', { 'sec-fetch-site': 'cross-site' })
  eq(r.status, 403, 'cross-site is refused before the method check')

  const plain = await call(resetRoute, 'GET', '/dsh-token-cat/reset')
  eq(plain.status, 405)
  eq(plain.json.error, 'method-not-allowed')
})

check('reset refuses a non-JSON body', async () => {
  const r = await call(resetRoute, 'POST', '/dsh-token-cat/reset', { 'content-type': 'text/plain' })
  eq(r.status, 415)
  eq(r.json.error, 'content-type-must-be-application-json')
})

check('reset accepts a JSON POST', async () => {
  const r = await call(resetRoute, 'POST', '/dsh-token-cat/reset', { 'content-type': 'application/json' })
  eq(r.status, 200)
  eq(r.json.ok, true)
})

check('a non-browser caller (no Origin, no Sec-Fetch-Site) still works', async () => {
  const r = await call(resetRoute, 'POST', '/dsh-token-cat/reset', { 'content-type': 'application/json', host: '' })
  eq(r.status, 200, 'curl and the install verifier keep working')
})

check('disposing the effects removes both routes', () => {
  assert(routes.length === 2, 'two routes before teardown')
  for (const d of disposers) d.disposer()
  eq(routes.length, 0, 'no route survives the plugin being disabled')
})

// -------------------------------------------------------------------- report

;(async () => {
  for (const t of QUEUE) {
    try {
      await t.fn()
      passed++
    } catch (err) {
      failures.push(t.name + ' — ' + (err && err.message ? err.message : String(err)))
    }
  }
  console.log('token-cat host tests: ' + passed + ' passed, ' + failures.length + ' failed')
  for (const f of failures) console.log('  FAIL ' + f)
  process.exit(failures.length ? 1 : 0)
})()
