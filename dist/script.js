document.documentElement.classList.add('js');

const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 30);
}

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
  mobileNav.hidden = true;
  header.classList.remove('menu-active');
  document.body.classList.remove('menu-open');
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  if (isOpen) {
    closeMenu();
  } else {
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Fechar menu');
    mobileNav.hidden = false;
    header.classList.add('menu-active');
    document.body.classList.add('menu-open');
    mobileNav.querySelector('a').focus();
  }
});

mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    closeMenu();
    menuButton.focus();
  }
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 800 && !mobileNav.hidden) closeMenu();
});
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
