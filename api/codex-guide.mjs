import { guideHtml } from '../lib/codex-guide.mjs';
import { createLeadMagnetHandler } from '../lib/lead-magnet-handler.mjs';

export default createLeadMagnetHandler({
  guideHtml, scope: 'app-web-codex', cookieName: 'gpt_codex_guide', cookiePath: '/api/codex-guide',
  noteTitle: 'Lead magnet — App Web com Codex', noteIntro: 'Acesso ao tutorial Codex + Supabase + Vercel da GPT Experts.'
});
