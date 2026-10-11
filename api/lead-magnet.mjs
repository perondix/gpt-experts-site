import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { guideHtml } from '../lib/agent-guide.mjs';

const COOKIE = 'gpt_agent_guide';
const TTL = 7 * 24 * 60 * 60;
const attempts = new Map();
const clean = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

function send(res, status, data) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('X-Robots-Tag', 'noindex');
  return res.status(status).json(data);
}

function signature(payload) {
  return createHmac('sha256', process.env.ATTIO_API_KEY)
    .update(`gpt-experts:agente-ai-gpt:v1:${payload}`).digest('base64url');
}

function hasAccess(req) {
  const cookie = (req.headers.cookie || '').split(';').map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE}=`));
  if (!cookie) return false;
  try {
    const token = cookie.slice(COOKIE.length + 1);
    if (token.length > 512) return false;
    const [payload, mac, extra] = token.split('.');
    if (!payload || !mac || extra) return false;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(mac);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    const grant = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    return grant.scope === 'agente-ai-gpt' && Number.isInteger(grant.exp) && grant.exp > now && grant.exp <= now + TTL;
  } catch { return false; }
}

async function attio(path, method, data) {
  const response = await fetch(`https://api.attio.com/v2${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.ATTIO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Attio ${method} ${path.split('?')[0]}: ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  if (!process.env.ATTIO_API_KEY) return send(res, 503, { error: 'integration_unavailable' });
  if (req.method === 'GET') {
    return hasAccess(req) ? send(res, 200, { ok: true, content: guideHtml })
      : send(res, 401, { error: 'email_required' });
  }
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, { error: 'invalid_origin' });
    } catch { return send(res, 403, { error: 'invalid_origin' }); }
  }
  if (!req.headers['content-type']?.includes('application/json')) return send(res, 415, { error: 'invalid_content_type' });
  if (Number(req.headers['content-length']) > 6000) return send(res, 413, { error: 'payload_too_large' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return send(res, 400, { error: 'invalid_json' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'invalid_payload' });
  if (JSON.stringify(body).length > 6000) return send(res, 413, { error: 'payload_too_large' });
  const rawEmail = clean(body.email, 255);
  const email = rawEmail.toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || clean(body.website, 100)) {
    return send(res, 400, { error: 'invalid_fields' });
  }
  const ip = clean(req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0], 100) || 'unknown';
  const now = Date.now();
  for (const [key, value] of attempts) if (now - value.since >= 60000) attempts.delete(key);
  const count = attempts.get(ip) || { count: 0, since: now };
  if (count.count >= 5) {
    res.setHeader('Retry-After', '60');
    return send(res, 429, { error: 'too_many_requests' });
  }
  if (attempts.size >= 2000 && !attempts.has(ip)) attempts.delete(attempts.keys().next().value);
  attempts.set(ip, { ...count, count: count.count + 1 });

  const campaign = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .flatMap((key) => clean(body.campaign?.[key], 150) ? [[key, clean(body.campaign[key], 150)]] : []));
  const submittedAt = new Date().toISOString();
  try {
    const person = await attio('/objects/people/records?matching_attribute=email_addresses', 'PUT', {
      values: { email_addresses: [email] }
    });
    const recordId = person.data?.id?.record_id;
    if (!recordId) throw new Error('Attio person response missing record ID');
    const note = await attio('/notes', 'POST', {
      parent_object: 'people', parent_record_id: recordId,
      title: 'Lead magnet — Guia Agente AI GPT', format: 'markdown',
      content: `Acesso ao guia Agente AI GPT da GPT Experts.\nOrigem: https://www.gptexperts.com.br/agente-ai-gpt\nData: ${submittedAt}\nAceitou receber novidades: ${body.marketing_consent === true ? 'sim' : 'não'}\nCampanha: ${JSON.stringify(campaign)}\nReferência: ${clean(body.referrer, 500)}`
    });
    if (!note.data?.id?.note_id) throw new Error('Attio note response missing note ID');
    const payload = Buffer.from(JSON.stringify({ scope: 'agente-ai-gpt', exp: Math.floor(now / 1000) + TTL, id: randomUUID() })).toString('base64url');
    const secure = req.headers['x-forwarded-proto'] === 'https' || req.headers.host?.endsWith('gptexperts.com.br');
    res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${signature(payload)}; Max-Age=${TTL}; Path=/api/lead-magnet; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
    return send(res, 200, { ok: true, content: guideHtml });
  } catch (error) {
    console.error('GPT Experts lead magnet integration failed:', error.message);
    return send(res, 502, { error: 'integration_failed' });
  }
}
