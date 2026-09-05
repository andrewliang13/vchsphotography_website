(function () {
  const GAP = 6;
  const TARGET = window.matchMedia('(max-width: 767px)').matches ? 140 : 220;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* —— Lightbox —— */
  function visibleItems() {
    return [...document.querySelectorAll('.gallery-item')].filter((el) => {
      const section = el.closest('[data-category-section]');
      if (section && section.hidden) return false;
      return el.offsetParent !== null || getComputedStyle(el).display !== 'none';
    });
  }

  function ensureLightbox() {
    let root = document.getElementById('photo-lightbox');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'photo-lightbox';
    root.className = 'photo-lightbox';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Photo viewer');
    root.innerHTML = `
      <div class="photo-lightbox__backdrop" data-lightbox-close></div>
      <button type="button" class="photo-lightbox__close" data-lightbox-close aria-label="Close">
        <span aria-hidden="true">×</span>
      </button>
      <button type="button" class="photo-lightbox__nav photo-lightbox__nav--prev" data-lightbox-prev aria-label="Previous photo">
        <span aria-hidden="true">‹</span>
      </button>
      <button type="button" class="photo-lightbox__nav photo-lightbox__nav--next" data-lightbox-next aria-label="Next photo">
        <span aria-hidden="true">›</span>
      </button>
      <figure class="photo-lightbox__figure">
        <img class="photo-lightbox__img" alt="" />
        <figcaption class="photo-lightbox__caption"></figcaption>
      </figure>
    `;
    document.body.appendChild(root);
    return root;
  }

  let index = -1;
  let lastFocus = null;

  function fullSrc(src) {
    return String(src).replace('/web/', '/full/');
  }

  function openAt(i) {
    const items = visibleItems();
    if (!items.length) return;
    index = ((i % items.length) + items.length) % items.length;
    const item = items[index];
    const img = item.querySelector('img');
    const caption = item.querySelector('figcaption');
    if (!img) return;

    const root = ensureLightbox();
    const large = root.querySelector('.photo-lightbox__img');
    const cap = root.querySelector('.photo-lightbox__caption');
    const thumb = img.currentSrc || img.src;
    const full = fullSrc(thumb);
    const loadToken = String(index);

    large.dataset.loadToken = loadToken;
    large.alt = img.alt || '';
    // Show the grid image immediately, then swap to the high-res file.
    large.src = thumb;
    if (full !== thumb) {
      const hi = new Image();
      hi.onload = () => {
        if (large.dataset.loadToken === loadToken) large.src = full;
      };
      hi.onerror = () => {};
      hi.src = full;
    }
    cap.textContent = caption ? caption.textContent.replace(/\s+/g, ' ').trim() : '';

    const multi = items.length > 1;
    root.querySelector('[data-lightbox-prev]').hidden = !multi;
    root.querySelector('[data-lightbox-next]').hidden = !multi;

    if (root.hidden) {
      lastFocus = document.activeElement;
      root.hidden = false;
      document.body.classList.add('lightbox-open');
      requestAnimationFrame(() => root.classList.add('is-open'));
      root.querySelector('.photo-lightbox__close').focus();
    }
  }

  function closeLightbox() {
    const root = document.getElementById('photo-lightbox');
    if (!root || root.hidden) return;

    const finish = () => {
      root.hidden = true;
      root.classList.remove('is-open');
      document.body.classList.remove('lightbox-open');
      const large = root.querySelector('.photo-lightbox__img');
      large.removeAttribute('src');
      index = -1;
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
      lastFocus = null;
    };

    if (reduceMotion) {
      finish();
      return;
    }

    root.classList.remove('is-open');
    window.setTimeout(finish, 220);
  }

  function step(delta) {
    if (index < 0) return;
    openAt(index + delta);
  }

  document.addEventListener('click', (event) => {
    const item = event.target.closest('.gallery-item');
    if (item && item.closest('.masonry')) {
      event.preventDefault();
      const items = visibleItems();
      const i = items.indexOf(item);
      if (i >= 0) openAt(i);
      return;
    }

    if (event.target.closest('[data-lightbox-close]')) {
      closeLightbox();
      return;
    }
    if (event.target.closest('[data-lightbox-prev]')) {
      step(-1);
      return;
    }
    if (event.target.closest('[data-lightbox-next]')) {
      step(1);
    }
  });

  document.addEventListener('keydown', (event) => {
    const root = document.getElementById('photo-lightbox');
    const open = root && !root.hidden;

    if (!open) {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.classList?.contains('gallery-item')) {
        event.preventDefault();
        const items = visibleItems();
        const i = items.indexOf(event.target);
        if (i >= 0) openAt(i);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.gallery-item').forEach((item) => {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', 'View larger photo');
    });
  });
})();
