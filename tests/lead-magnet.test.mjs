import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import handler from '../api/lead-magnet.mjs';

const key = 'local-test-key-never-used-in-production';
let ip = 0;
function request(overrides = {}) {
  return { method: 'POST', headers: { host: 'www.gptexperts.com.br', origin: 'https://www.gptexperts.com.br', 'content-type': 'application/json', 'x-real-ip': `test-${ip++}`, 'x-forwarded-proto': 'https' }, body: { email: 'Test@Example.com', marketing_consent: false }, ...overrides };
}
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
function setup(t, fetcher) {
  const oldKey = process.env.ATTIO_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.ATTIO_API_KEY = key;
  globalThis.fetch = fetcher;
  t.after(() => { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.ATTIO_API_KEY; else process.env.ATTIO_API_KEY = oldKey; });
}
const goodFetch = async (url) => ({ ok: true, json: async () => ({ data: { id: url.includes('/notes') ? { note_id: 'note-test' } : { record_id: 'person-test' } } }) });

test('saves the email and source note before releasing content and secure access cookie', async (t) => {
  const calls = [];
  setup(t, async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) }); return goodFetch(url); });
  const res = response();
  await handler(request({ body: { email: 'Test@Example.com', marketing_consent: true, campaign: { utm_source: 'instagram' } } }), res);
  assert.equal(res.code, 200);
  assert.match(res.body.content, /Projeto/);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /matching_attribute=email_addresses/);
  assert.deepEqual(calls[0].body.data.values, { email_addresses: ['test@example.com'] });
  assert.equal(calls[1].body.data.parent_record_id, 'person-test');
  assert.match(calls[1].body.data.content, /instagram/);
  assert.match(calls[1].body.data.content, /Aceitou receber novidades: sim/);
  assert.match(res.headers['Set-Cookie'], /HttpOnly; SameSite=Lax; Secure/);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  const cookie = res.headers['Set-Cookie'].split(';')[0];
  const restored = response();
  await handler(request({ method: 'GET', headers: { cookie } }), restored);
  assert.equal(restored.code, 200);
  assert.equal(restored.body.content, res.body.content);
});

test('anonymous, forged and expired access cannot retrieve the guide', async (t) => {
  setup(t, () => { throw new Error('should not call Attio'); });
  const expired = Buffer.from(JSON.stringify({ scope: 'agente-ai-gpt', exp: 1 })).toString('base64url');
  const mac = createHmac('sha256', key).update(`gpt-experts:agente-ai-gpt:v1:${expired}`).digest('base64url');
  for (const cookie of ['', 'gpt_agent_guide=forged.token', `gpt_agent_guide=${expired}.${mac}`]) {
    const res = response();
    await handler(request({ method: 'GET', headers: { cookie } }), res);
    assert.equal(res.code, 401);
    assert.equal(res.body.content, undefined);
  }
});

test('invalid email, honeypot, JSON, method and cross-site requests never reach CRM', async (t) => {
  setup(t, () => { throw new Error('should not call Attio'); });
  const cases = [
    [request({ body: { email: 'invalid' } }), 400],
    [request({ body: { email: 'test@example.com', website: 'bot' } }), 400],
    [request({ body: '{broken' }), 400],
    [request({ method: 'PUT' }), 405],
    [request({ headers: { host: 'www.gptexperts.com.br', origin: 'https://other.example', 'content-type': 'application/json' } }), 403],
    [request({ headers: { 'content-type': 'text/plain' } }), 415],
    [request({ body: { email: 'test@example.com', referrer: 'a'.repeat(6000) } }), 413]
  ];
  for (const [req, code] of cases) {
    const res = response(); await handler(req, res);
    assert.equal(res.code, code);
    assert.equal(res.body.content, undefined);
    assert.equal(res.headers['Set-Cookie'], undefined);
  }
});

test('CRM failure at either write keeps the tutorial locked', async (t) => {
  let failAt = 1;
  let call = 0;
  setup(t, async (url) => (++call === failAt ? { ok: false, status: 403 } : goodFetch(url)));
  for (failAt of [1, 2]) {
    call = 0;
    const res = response(); await handler(request(), res);
    assert.equal(res.code, 502);
    assert.equal(res.body.content, undefined);
    assert.equal(res.headers['Set-Cookie'], undefined);
  }
});

test('missing credentials cannot unlock the guide', async (t) => {
  setup(t, goodFetch);
  delete process.env.ATTIO_API_KEY;
  const res = response(); await handler(request(), res);
  assert.equal(res.code, 503);
  assert.equal(res.body.content, undefined);
});

test('repeated submissions from the same instance IP are throttled', async (t) => {
  setup(t, goodFetch);
  const req = request();
  for (let i = 0; i < 5; i++) { const res = response(); await handler(req, res); assert.equal(res.code, 200); }
  const res = response(); await handler(req, res);
  assert.equal(res.code, 429);
  assert.equal(res.headers['Retry-After'], '60');
  assert.equal(res.body.content, undefined);
});

test('public page and script do not contain the gated tutorial', async () => {
  const page = await readFile(new URL('../dist/agente-ai-gpt/index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../dist/agente-ai-gpt/guide.js', import.meta.url), 'utf8');
  assert.doesNotMatch(page + script, /PROMPT \/ DELEGAR A PRIMEIRA TAREFA|CLIENTE:|CONTEXTO DO PROJETO/);
  assert.match(page, /guide-content[^>]*hidden/);
});
