(() => {
  const form = document.getElementById('lead-form');
  const status = document.getElementById('lead-status');
  const gate = document.getElementById('acesso');
  const content = document.getElementById('guide-content');
  const progressKey = 'gpt-experts:agent-guide:progress:v1';

  function initGuide() {
    let completed = [];
    try { const stored = JSON.parse(localStorage.getItem(progressKey) || '[]'); if (Array.isArray(stored)) completed = stored; } catch {}
    const boxes = Array.from(content.querySelectorAll('[data-complete]'));
    function updateProgress() {
      const checked = boxes.filter((box) => box.checked).map((box) => box.dataset.complete);
      content.querySelector('#guide-progress').value = checked.length;
      content.querySelector('#progress-label').textContent = `${checked.length} de ${boxes.length} etapas`;
      try { localStorage.setItem(progressKey, JSON.stringify(checked)); } catch {}
    }
    boxes.forEach((box) => {
      box.checked = completed.includes(box.dataset.complete);
      box.addEventListener('change', updateProgress);
    });
    updateProgress();
    const briefing = content.querySelector('#briefing-form');
    const original = content.querySelector('#prompt-briefing').textContent;
    briefing.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(briefing);
      const replacements = {
        '[o que quero produzir]': data.get('task'), '[quem vai usar]': data.get('audience'),
        '[o que a pessoa vai fornecer]': data.get('input'), '[qual entrega ela deve receber]': data.get('output'),
        '[como vou avaliar]': data.get('quality')
      };
      let prompt = original;
      for (const [placeholder, value] of Object.entries(replacements)) if (value?.trim()) prompt = prompt.replace(placeholder, () => value.trim());
      content.querySelector('#prompt-briefing').textContent = prompt;
      content.querySelector('#prompt-briefing').closest('details').open = true;
      content.querySelector('#status-briefing').textContent = 'Prompt personalizado. Agora você pode copiar.';
    });
  }

  function unlock(data, focus = false) {
    if (data.ok !== true || typeof data.content !== 'string' || !data.content) throw new Error('invalid_response');
    // Only the site's authenticated API returns the trusted tutorial markup.
    content.innerHTML = data.content;
    content.hidden = false;
    gate.hidden = true;
    document.querySelector('.text-cta').textContent = 'Continuar meu guia ↓';
    document.querySelector('.text-cta').href = '#guide-content';
    initGuide();
    if (focus) {
      content.scrollIntoView({ behavior: 'auto', block: 'start' });
      content.querySelector('#guide-title').focus({ preventScroll: true });
    }
  }

  const messages = {
    invalid_fields: 'Confira seu e-mail e tente novamente.',
    too_many_requests: 'Aguarde um minuto antes de tentar novamente.',
    integration_unavailable: 'Não foi possível liberar o guia agora. Tente novamente em alguns instantes.',
    integration_failed: 'Não conseguimos concluir seu cadastro. Tente novamente; o guia será liberado após a confirmação.'
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button');
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'LIBERANDO SEU GUIA…';
    status.removeAttribute('data-error');
    status.textContent = 'Registrando seu acesso…';
    const data = new FormData(form);
    const params = new URLSearchParams(location.search);
    const campaign = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      .flatMap((key) => params.get(key) ? [[key, params.get(key).slice(0, 150)]] : []));
    try {
      const response = await fetch('/api/lead-magnet', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), website: data.get('website'), marketing_consent: data.get('marketing') === 'on', campaign, referrer: document.referrer }),
        signal: AbortSignal.timeout(30000)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'unknown');
      unlock(result, true);
      form.reset();
      status.textContent = '';
    } catch (error) {
      status.setAttribute('data-error', '');
      status.textContent = messages[error.message] || 'Não foi possível concluir. Confira sua conexão e tente novamente.';
    } finally {
      button.disabled = false;
      button.textContent = 'LIBERAR GUIA GRATUITO ↗';
    }
  });

  async function copy(id) {
    const text = content.querySelector(`#prompt-${id}`).textContent;
    const state = content.querySelector(`#status-${id}`);
    try {
      await navigator.clipboard.writeText(text);
      state.textContent = 'Prompt copiado. Cole no ChatGPT.';
      return true;
    } catch {
      const element = content.querySelector(`#prompt-${id}`);
      element.closest('details').open = true;
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      state.textContent = 'Texto selecionado. Use Ctrl+C ou ⌘C para copiar.';
      return false;
    }
  }
  content.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (button) {
      if (await copy(button.dataset.copy)) {
        button.textContent = 'Copiado ✓';
        setTimeout(() => { button.textContent = 'Copiar prompt ↗'; }, 2500);
      }
    }
    const link = event.target.closest('[data-open]');
    if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) void copy(link.dataset.open);
  });

  fetch('/api/lead-magnet', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) })
    .then(async (response) => { if (response.ok) unlock(await response.json()); })
    .catch(() => {});
})();
