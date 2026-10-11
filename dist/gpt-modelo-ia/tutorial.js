(() => {
  const promptText = (id) => Array.from(document.querySelector(`#prompt-${id}`).children)
    .map((paragraph) => Array.from(paragraph.childNodes)
      .map((node) => node.nodeName === 'BR' ? '\n' : node.textContent)
      .join('').trim()).join('\n\n');

  const copyPrompt = async (id) => {
    const text = promptText(id);
    const status = document.getElementById(`status-${id}`);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = 'Prompt copiado. Cole no ChatGPT.';
      return true;
    } catch {
      // Select the visible prompt for manual copying when clipboard access fails.
      const content = document.getElementById(`prompt-${id}`);
      content.closest('details').open = true;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(content);
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'Texto selecionado. Use Ctrl+C ou ⌘C para copiar.';
      return false;
    }
  };

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const copied = await copyPrompt(button.dataset.copy);
      if (copied) {
        button.textContent = 'Copiado ✓';
        window.setTimeout(() => { button.textContent = 'Copiar prompt ↗'; }, 2500);
      }
    });
  });

  document.querySelectorAll('[data-open]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      // Keep native link navigation; start copying during the same click gesture.
      void copyPrompt(link.dataset.open);
    });
  });
})();
