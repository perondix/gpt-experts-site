(() => {
  const endpoint = document.body.dataset.guideEndpoint || '/api/lead-magnet';
  const form = document.getElementById('lead-form');
  const status = document.getElementById('lead-status');
  const gate = document.getElementById('acesso');
  const content = document.getElementById('guide-content');
  const footer = document.getElementById('guide-footer');
  const loading = document.getElementById('access-loading');

  function unlock(data, focus = false) {
    if (data.ok !== true || typeof data.content !== 'string' || !data.content) throw new Error('invalid_response');
    // Trusted markup comes only from this site's authenticated API.
    content.innerHTML = data.content;
    content.hidden = false;
    gate.hidden = true;
    footer.hidden = false;
    loading.hidden = true;
    if (focus) {
      content.scrollIntoView({ behavior: 'auto', block: 'start' });
      content.querySelector('#guide-title').focus({ preventScroll: true });
    }
  }

  const messages = {
    invalid_fields: 'Confira seu e-mail e tente novamente.',
    too_many_requests: 'Aguarde um minuto antes de tentar novamente.',
    integration_unavailable: 'Não foi possível liberar o tutorial agora. Tente novamente em alguns instantes.',
    integration_failed: 'Não conseguimos concluir seu cadastro. Tente novamente; o tutorial será liberado após a confirmação.'
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button');
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Liberando acesso…';
    status.removeAttribute('data-error');
    status.textContent = 'Registrando seu acesso…';
    const data = new FormData(form);
    const params = new URLSearchParams(location.search);
    const campaign = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      .flatMap((key) => params.get(key) ? [[key, params.get(key).slice(0, 150)]] : []));
    try {
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), website: data.get('website'), marketing_consent: false, campaign, referrer: document.referrer }),
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
      button.textContent = 'Acessar tutorial';
    }
  });

  content.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const text = content.querySelector(`#copy-${button.dataset.copy}`);
    const state = content.querySelector(`#status-${button.dataset.copy}`);
    try {
      await navigator.clipboard.writeText(text.textContent);
      state.textContent = 'Texto copiado. Cole no local indicado acima.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(text);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      state.textContent = 'Texto selecionado. Use a opção Copiar do seu dispositivo.';
    }
  });

  async function restore() {
    try {
      const response = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (response.ok) { unlock(await response.json()); return; }
      if (response.status !== 401) throw new Error('restore_failed');
    } catch {
      status.setAttribute('data-error', '');
      status.textContent = 'Não foi possível verificar um acesso anterior. Recarregue para tentar novamente ou informe seu e-mail.';
    }
    loading.hidden = true;
    gate.hidden = false;
  }
  void restore();
})();
