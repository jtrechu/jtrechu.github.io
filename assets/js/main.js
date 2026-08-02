(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('[data-theme-toggle]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');
  const header = document.querySelector('[data-header]');
  const themes = ['auto', 'light', 'dark'];

  const savedTheme = localStorage.getItem('site-theme') || 'auto';
  root.dataset.theme = savedTheme;

  const updateThemeLabel = () => {
    if (!themeButton) return;
    const current = root.dataset.theme || 'auto';
    themeButton.setAttribute('aria-label', `Colour theme: ${current}. Click to change.`);
    themeButton.setAttribute('title', `Colour theme: ${current}`);
  };

  themeButton?.addEventListener('click', () => {
    const currentIndex = themes.indexOf(root.dataset.theme || 'auto');
    const next = themes[(currentIndex + 1) % themes.length];
    root.dataset.theme = next;
    localStorage.setItem('site-theme', next);
    updateThemeLabel();
  });
  updateThemeLabel();

  menuButton?.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    nav?.classList.toggle('is-open', !isOpen);
    document.body.classList.toggle('nav-open', !isOpen);
  });

  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton?.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
    });
  });

  const setHeaderState = () => header?.classList.toggle('is-scrolled', window.scrollY > 16);
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.delay || 0);
        window.setTimeout(() => entry.target.classList.add('is-visible'), delay);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px' });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }
})();
