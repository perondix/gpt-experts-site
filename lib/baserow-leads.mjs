import { Client, SSEClientTransport } from '@modelcontextprotocol/client';

const TABLE_ID = 1334579;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export async function createBaserowLead({ endpoint, name, email, phone, campaign }) {
  const url = new URL(endpoint);
  if (url.origin !== 'https://api.baserow.io' || !/^\/mcp\/[^/]+\/sse$/.test(url.pathname)) {
    throw new Error('Invalid Baserow MCP endpoint');
  }

  const client = new Client({ name: 'GPT Experts', version: '1.0.0' });
  const transport = new SSEClientTransport(url);
  const lead = { Name: name, email, WhatsApp: phone, 'Aceitou termos': true };
  for (const key of UTM_KEYS) {
    if (campaign[key]) lead[key.toUpperCase()] = campaign[key];
  }

  try {
    const deadline = AbortSignal.timeout(12_000);
    await client.connect(transport, { signal: deadline, timeout: 6000 });
    const result = await client.callTool({
      name: 'create_rows',
      arguments: {
        table_id: TABLE_ID,
        rows: [lead]
      }
    }, { signal: deadline, timeout: 6000 });
    if (result.isError) throw new Error('Baserow refused row creation');
    const record = result.structuredContent ?? JSON.parse(result.content?.find(item => item.type === 'text')?.text ?? 'null');
    const rows = Array.isArray(record) ? record : record?.rows;
    if (!Number.isInteger(rows?.[0]?.id)) {
      throw new Error('Baserow did not confirm row creation');
    }
  } finally {
    await transport.close();
  }
}
