const ATTIO_BASE = 'https://api.attio.com/v2';
let cachedList;

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
}

function text(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return `+${digits}`;
  if (value.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return '';
}

function navigationData(input, req) {
  const nav = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const campaign = nav.campaign && typeof nav.campaign === 'object' ? nav.campaign : {};
  const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'ttclid', 'msclkid'];
  return {
    landing_page: text(nav.landing_page, 500),
    current_page: text(nav.current_page, 500),
    referrer: text(nav.referrer, 500),
    campaign: Object.fromEntries(campaignKeys.flatMap((key) => {
      const value = text(campaign[key], 250);
      return value ? [[key, value]] : [];
    })),
    cta: text(nav.cta, 50),
    visited_sections: Array.isArray(nav.visited_sections) ? nav.visited_sections.slice(0, 20).map((item) => ({
      section: text(item?.section, 60),
      at: text(item?.at, 40)
    })) : [],
    visit_started_at: text(nav.visit_started_at, 40),
    submitted_at: new Date().toISOString(),
    time_on_page_seconds: Math.max(0, Math.min(86400, Number(nav.time_on_page_seconds) || 0)),
    max_scroll_percent: Math.max(0, Math.min(100, Number(nav.max_scroll_percent) || 0)),
    navigation_type: text(nav.navigation_type, 30),
    language: text(nav.language, 30),
    timezone: text(nav.timezone, 80),
    viewport: {
      width: Math.max(0, Math.min(10000, Number(nav.viewport?.width) || 0)),
      height: Math.max(0, Math.min(10000, Number(nav.viewport?.height) || 0))
    },
    screen: {
      width: Math.max(0, Math.min(10000, Number(nav.screen?.width) || 0)),
      height: Math.max(0, Math.min(10000, Number(nav.screen?.height) || 0))
    },
    user_agent: text(req.headers['user-agent'], 300),
    country: text(req.headers['x-vercel-ip-country'], 2)
  };
}

async function attio(path, { method = 'GET', data } = {}) {
  const response = await fetch(`${ATTIO_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.ATTIO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify({ data }) : undefined,
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Attio ${method} ${path.split('?')[0]} returned ${response.status}`);
  return response.json();
}

async function targetList() {
  if (cachedList) return cachedList;
  const configuredId = process.env.ATTIO_LIST_ID;
  const expected = (process.env.ATTIO_LIST_NAME || 'gpt-experts-deals').toLocaleLowerCase('pt-BR');
  const list = configuredId
    ? (await attio(`/lists/${encodeURIComponent(configuredId)}`)).data
    : (await attio('/lists')).data?.find((item) =>
      item.api_slug?.toLocaleLowerCase('pt-BR') === expected ||
      item.name?.toLocaleLowerCase('pt-BR') === expected
    );
  const parentObject = list?.parent_object?.includes('deals') ? 'deals'
    : list?.parent_object?.includes('people') ? 'people' : null;
  if (!list?.id?.list_id || !parentObject) throw new Error('GPT Experts list not found or unsupported in Attio');
  cachedList = { id: list.id.list_id, parentObject };
  return cachedList;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'invalid_origin' });
    } catch {
      return send(res, 403, { error: 'invalid_origin' });
    }
  }
  if (!req.headers['content-type']?.includes('application/json')) return send(res, 415, { error: 'invalid_content_type' });
  if (Number(req.headers['content-length']) > 16000) return send(res, 413, { error: 'payload_too_large' });
  if (!process.env.ATTIO_API_KEY) return send(res, 503, { error: 'integration_unavailable' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return send(res, 400, { error: 'invalid_json' });
  }
  if (!body || typeof body !== 'object') return send(res, 400, { error: 'invalid_payload' });
  if (JSON.stringify(body).length > 16000) return send(res, 413, { error: 'payload_too_large' });
  if (text(body.website, 100)) return send(res, 200, { ok: true });

  const name = text(body.name, 120).replace(/\s+/g, ' ');
  const email = text(body.email, 254).toLowerCase();
  const phone = normalizePhone(text(body.phone, 30));
  if (name.length < 3 || name.split(' ').length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || body.consent !== true) {
    return send(res, 400, { error: 'invalid_fields' });
  }

  const parts = name.split(' ');
  const firstName = parts.shift();
  const lastName = parts.join(' ');
  const navigation = navigationData(body.navigation, req);

  try {
    const list = await targetList();
    const person = await attio('/objects/people/records?matching_attribute=email_addresses', {
      method: 'PUT',
      data: { values: {
        email_addresses: [email],
        name: [{ first_name: firstName, last_name: lastName, full_name: name }]
      } }
    });
    const recordId = person.data?.id?.record_id;
    if (!recordId) throw new Error('Attio person response missing record ID');
    const existingPhones = person.data?.values?.phone_numbers || [];
    if (!existingPhones.some((item) => item.normalized_phone_number === phone)) {
      await attio(`/objects/people/records/${encodeURIComponent(recordId)}`, {
        method: 'PATCH',
        data: { values: { phone_numbers: [phone] } }
      });
    }
    let parentRecordId = recordId;
    if (list.parentObject === 'deals') {
      const deal = await attio('/objects/deals/records', {
        method: 'POST',
        data: { values: {
          name: `Interesse GPT Experts — ${name}`,
          associated_people: [{ target_object: 'people', target_record_id: recordId }]
        } }
      });
      parentRecordId = deal.data?.id?.record_id;
      if (!parentRecordId) throw new Error('Attio deal response missing record ID');
    }
    await attio(`/lists/${encodeURIComponent(list.id)}/entries`, {
      method: 'PUT',
      data: { parent_record_id: parentRecordId, parent_object: list.parentObject, entry_values: {} }
    });
    await attio('/notes', {
      method: 'POST',
      data: {
        parent_object: list.parentObject,
        parent_record_id: parentRecordId,
        title: 'Interesse na GPT Experts',
        format: 'markdown',
        content: `Cadastro pelo site em ${navigation.submitted_at}.\n\n**WhatsApp:** ${phone}\n\n**Dados da visita**\n\n\`\`\`json\n${JSON.stringify(navigation, null, 2)}\n\`\`\``
      }
    });
    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('GPT Experts lead integration failed:', error.message);
    return send(res, 502, { error: 'integration_failed' });
  }
}
