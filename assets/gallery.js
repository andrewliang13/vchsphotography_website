(function () {
  const GAP = 6;
  const TARGET = window.matchMedia('(max-width: 767px)').matches ? 140 : 220;

  function aspectOf(item) {
    const img = item.querySelector('img');
    if (!img) return 1;
    const w = Number(img.getAttribute('width')) || img.naturalWidth || 1;
    const h = Number(img.getAttribute('height')) || img.naturalHeight || 1;
    return w / h;
  }

  function justify(container) {
    const items = [...container.querySelectorAll('.gallery-item')].filter(
      (el) => el.offsetParent !== null || getComputedStyle(el).display !== 'none'
    );
    if (!items.length) return;

    container.classList.add('is-justified');
    const width = container.clientWidth;
    if (width <= 0) return;

    let row = [];
    let rowAspect = 0;

    const flush = (fill) => {
      if (!row.length) return;
      const gaps = GAP * Math.max(row.length - 1, 0);
      const rowHeight = fill ? (width - gaps) / rowAspect : TARGET;
      row.forEach((item) => {
        const a = aspectOf(item);
        item.style.setProperty('--row-h', `${rowHeight}px`);
        item.style.width = `${a * rowHeight}px`;
        item.classList.remove('is-row-fill');
      });
      row = [];
      rowAspect = 0;
    };

    items.forEach((item) => {
      const a = aspectOf(item);
      const nextAspect = rowAspect + a;
      const gaps = GAP * row.length;
      const projected = TARGET * nextAspect + gaps;

      if (row.length && projected > width) {
        flush(true);
      }

      row.push(item);
      rowAspect += a;
    });

    // Last row: keep target height, don't stretch awkwardly
    flush(false);
  }

  function run() {
    document.querySelectorAll('.masonry').forEach(justify);
  }

  const ready = () => {
    const imgs = [...document.querySelectorAll('.masonry img')];
    let left = imgs.length;
    if (!left) {
      run();
      return;
    }
    const done = () => {
      left -= 1;
      if (left <= 0) run();
    };
    imgs.forEach((img) => {
      if (img.complete) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
  };

  window.addEventListener('resize', () => {
    clearTimeout(window.__galleryJustifyTimer);
    window.__galleryJustifyTimer = setTimeout(run, 120);
  });

  document.addEventListener('DOMContentLoaded', ready);
  // Re-run when filters hide/show sections
  document.addEventListener('click', (event) => {
    if (event.target.closest('.portfolio-filter')) {
      setTimeout(run, 30);
    }
  });
})();
