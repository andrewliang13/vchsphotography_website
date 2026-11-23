/* Scroll pop-in for cards and photos.
   Loaded in <head> (not deferred) so items are hidden before first paint. */
(() => {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ITEMS = '.gallery-item, .person-card, .feature-grid > *, .card-row, .pillar';
  const SPRING = 'cubic-bezier(.34, 1.36, .64, 1)';
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const root = document.documentElement;

  const css = `
html.motion :is(${ITEMS}):not(.is-settled) {
  opacity: 0;
  translate: 0 2.75rem;
  scale: .92;
  transform-origin: 50% 100%;
  transition:
    opacity .55s ease-out var(--pop-d, 0ms),
    translate .95s ${SPRING} var(--pop-d, 0ms),
    scale .95s ${SPRING} var(--pop-d, 0ms);
}
html.motion :is(${ITEMS}):not(.is-settled) img {
  scale: 1.14;
  transition:
    scale 1.5s ${EASE} var(--pop-d, 0ms),
    opacity .6s ${EASE};
}
html.motion :is(${ITEMS}).is-popped { opacity: 1; translate: 0 0; scale: 1; }
html.motion :is(${ITEMS}).is-popped img { scale: 1; }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  root.classList.add('motion');

  const settle = (el) => {
    el.classList.add('is-settled');
    el.style.removeProperty('--pop-d');
  };

  const init = () => {
    try {
      const io = new IntersectionObserver(
        (entries) => {
          const entering = entries
            .filter((e) => e.isIntersecting)
            .sort(
              (a, b) =>
                a.boundingClientRect.top - b.boundingClientRect.top ||
                a.boundingClientRect.left - b.boundingClientRect.left
            );
          entering.forEach((entry, i) => {
            const el = entry.target;
            io.unobserve(el);
            const delay = Math.min(i, 7) * 75;
            el.style.setProperty('--pop-d', `${delay}ms`);
            requestAnimationFrame(() => el.classList.add('is-popped'));
            // Hand transitions back to the page's own hover styles once done.
            setTimeout(() => settle(el), delay + 1600);
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
      );
      document.querySelectorAll(ITEMS).forEach((el) => io.observe(el));
    } catch (err) {
      root.classList.remove('motion');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
