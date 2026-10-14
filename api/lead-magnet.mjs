import { guideHtml } from '../lib/agent-guide.mjs';
import { createLeadMagnetHandler } from '../lib/lead-magnet-handler.mjs';

export default createLeadMagnetHandler({
  guideHtml, scope: 'agente-ai-gpt', cookieName: 'gpt_agent_guide', cookiePath: '/api/lead-magnet',
  noteTitle: 'Lead magnet — Guia Agente AI GPT', noteIntro: 'Acesso ao guia Agente AI GPT da GPT Experts.'
});
