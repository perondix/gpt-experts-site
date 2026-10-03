document.documentElement.classList.add('js');

const header = document.querySelector('.site-header');

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 30);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealElements = document.querySelectorAll('.reveal');

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  revealElements.forEach((element) => revealObserver.observe(element));
}

const steps = document.querySelectorAll('.journey-step');
if ('IntersectionObserver' in window && !reduceMotion) {
  const stepObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('active', entry.isIntersecting));
  }, { threshold: 0.65 });
  steps.forEach((step) => stepObserver.observe(step));
} else {
  steps.forEach((step) => step.classList.add('active'));
}

const applicationDialog = document.querySelector('#application-dialog');
const applicationForm = document.querySelector('#application-form');
const applicationStatus = document.querySelector('#application-status');
const applicationSuccess = document.querySelector('#application-success');
const applicationSubmit = applicationForm.querySelector('button[type="submit"]');
let applicationTrigger = null;
let applicationSource = 'direct';

const visitStartedAt = new Date();
const landingPage = safePageUrl(window.location.href);
const visitedSections = [{ section: 'topo', at: visitStartedAt.toISOString() }];
let maxScrollPercent = 0;
const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'ttclid', 'msclkid'];
const campaign = Object.fromEntries(campaignKeys.flatMap((key) => {
  const value = new URLSearchParams(window.location.search).get(key);
  return value ? [[key, value.slice(0, 250)]] : [];
}));

function safePageUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}${url.hash}`.slice(0, 500);
  } catch {
    return '';
  }
}

window.addEventListener('scroll', () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  maxScrollPercent = Math.max(maxScrollPercent, scrollable > 0 ? Math.round(window.scrollY / scrollable * 100) : 100);
}, { passive: true });

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || !entry.target.id || visitedSections.some((visit) => visit.section === entry.target.id)) return;
      visitedSections.push({ section: entry.target.id, at: new Date().toISOString() });
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('main section[id]').forEach((section) => sectionObserver.observe(section));
}

function openApplication(event, trigger = event?.currentTarget) {
  if (event) event.preventDefault();
  if (applicationDialog.open) return;
  applicationTrigger = trigger || document.activeElement;
  applicationSource = applicationTrigger?.dataset.openApplication || 'direct';
  applicationDialog.showModal();
  document.body.classList.add('application-open');
  applicationForm.querySelector('#lead-name').focus();
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open-application], a[href="#aplicar"]');
  if (trigger) openApplication(event, trigger);
});
document.querySelectorAll('[data-close-application]').forEach((button) => button.addEventListener('click', () => applicationDialog.close()));
applicationDialog.addEventListener('click', (event) => {
  if (event.target === applicationDialog) applicationDialog.close();
});
applicationDialog.addEventListener('close', () => {
  document.body.classList.remove('application-open');
  applicationTrigger?.focus();
  if (!applicationSuccess.hidden) {
    applicationSuccess.hidden = true;
    applicationForm.hidden = false;
    applicationForm.reset();
    applicationStatus.textContent = '';
  }
});
if (window.location.hash === '#aplicar') openApplication();

applicationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  applicationStatus.textContent = '';
  if (!applicationForm.reportValidity()) return;

  const form = new FormData(applicationForm);
  const name = String(form.get('name') || '').trim().replace(/\s+/g, ' ');
  const email = String(form.get('email') || '').trim().toLowerCase();
  const phone = String(form.get('phone') || '').trim();
  if (name.length < 3 || name.split(' ').length < 2) {
    applicationStatus.textContent = 'Informe seu nome completo.';
    applicationForm.querySelector('#lead-name').focus();
    return;
  }
  if (phone.replace(/\D/g, '').length < 10) {
    applicationStatus.textContent = 'Informe um WhatsApp com DDD.';
    applicationForm.querySelector('#lead-phone').focus();
    return;
  }

  const navigationEntry = performance.getEntriesByType('navigation')[0];
  const payload = {
    name, email, phone,
    consent: form.get('consent') === 'on',
    website: String(form.get('website') || ''),
    navigation: {
      landing_page: landingPage,
      current_page: safePageUrl(window.location.href),
      referrer: safePageUrl(document.referrer),
      campaign,
      cta: applicationSource,
      visited_sections: visitedSections.slice(0, 20),
      visit_started_at: visitStartedAt.toISOString(),
      submitted_at: new Date().toISOString(),
      time_on_page_seconds: Math.round((Date.now() - visitStartedAt.getTime()) / 1000),
      max_scroll_percent: maxScrollPercent,
      navigation_type: navigationEntry?.type || '',
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      viewport: { width: window.innerWidth, height: window.innerHeight },
      screen: { width: window.screen.width, height: window.screen.height }
    }
  };

  applicationSubmit.disabled = true;
  applicationSubmit.textContent = 'ENVIANDO...';
  try {
    const response = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('submission-failed');
    applicationForm.hidden = true;
    applicationSuccess.hidden = false;
    applicationSuccess.querySelector('button').focus();
  } catch {
    applicationStatus.textContent = 'Não foi possível enviar agora. Tente novamente em instantes.';
  } finally {
    applicationSubmit.disabled = false;
    applicationSubmit.textContent = 'ENVIAR MEU INTERESSE';
  }
});
