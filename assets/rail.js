/* Section rail: a short rounded bar on the left for each page section.
   The bar for the section in view turns darker and longer; hover shows its name. */
(() => {
  const css = `
.section-rail {
  position: fixed;
  left: clamp(.75rem, 1.6vw, 1.5rem);
  top: 50%;
  translate: 0 -50%;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.section-rail a {
  position: relative;
  display: block;
  width: 4px;
  height: 1.1rem;
  border-radius: 999px;
  background: rgba(128, 128, 128, .38);
  transition: height .35s cubic-bezier(.22, 1, .36, 1), background .3s ease;
}
.section-rail a::before { content: ""; position: absolute; inset: -.3rem -.6rem; }
.section-rail a:hover { background: rgba(128, 128, 128, .7); }
.section-rail a.is-current { height: 2.1rem; background: rgba(90, 90, 90, .85); }
.section-rail.on-dark a { background: rgba(255, 255, 255, .4); }
.section-rail.on-dark a.is-current { background: rgba(255, 255, 255, .92); }
.section-rail span {
  position: absolute;
  left: 1rem;
  top: 50%;
  translate: -.25rem -50%;
  white-space: nowrap;
  padding: .3rem .6rem;
  border-radius: 999px;
  background: rgba(17, 17, 17, .82);
  color: #fff;
  font: 500 .75rem/1.2 "Geist", ui-sans-serif, system-ui, sans-serif;
  opacity: 0;
  pointer-events: none;
  transition: opacity .2s ease, translate .2s ease;
}
.section-rail a:hover span,
.section-rail a:focus-visible span { opacity: 1; translate: 0 -50%; }
.section-rail a:focus-visible { outline: 2px solid #00467f; outline-offset: 3px; }
@media (max-width: 900px), (pointer: coarse) { .section-rail { display: none; } }
@media (prefers-reduced-motion: reduce) { .section-rail a, .section-rail span { transition: none; } }
`;

  const init = () => {
    let sections = [...document.querySelectorAll('main [data-label], body > [data-label]')];
    if (sections.length < 2) {
      sections = [...document.querySelectorAll('.portfolio-gallery, .portfolio-category')].filter(
        (s) => getComputedStyle(s).display !== 'none'
      );
      sections.forEach((s) => {
        const h = s.querySelector('.category-heading');
        if (h && !s.dataset.label) s.dataset.label = h.textContent.replace(/\s·\s\d+$/, '').trim();
      });
    }
    if (sections.length < 2 || sections.length > 30) return;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const rail = document.createElement('nav');
    rail.className = 'section-rail';
    rail.setAttribute('aria-label', 'Page sections');
    const links = sections.map((s, i) => {
      if (!s.id) s.id = `section-${i + 1}`;
      const a = document.createElement('a');
      a.href = `#${s.id}`;
      a.setAttribute('aria-label', s.dataset.label || `Section ${i + 1}`);
      const tip = document.createElement('span');
      tip.textContent = s.dataset.label || `Section ${i + 1}`;
      a.appendChild(tip);
      rail.appendChild(a);
      return a;
    });
    document.body.appendChild(rail);

    const update = () => {
      const mid = window.innerHeight * 0.45;
      let current = 0;
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= mid) current = i;
      });
      links.forEach((a, i) => {
        a.classList.toggle('is-current', i === current);
        if (i === current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      const dark = sections[current].matches('[data-hero], .hero');
      rail.classList.toggle('on-dark', dark);
    };
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      },
      { passive: true }
    );
    window.addEventListener('resize', update);
    update();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
