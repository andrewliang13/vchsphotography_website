(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.querySelector('[data-site-bar]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-site-nav]');
  const hero = document.querySelector('[data-hero]');
  const pageDots = document.querySelector('#page-dots');

  if (pageDots && !reduce) {
    document.documentElement.classList.add('has-page-snap');
  }

  let siteConfig = {
    formEndpoint: '',
    inquiryEmail: '',
    instagramHandle: '@vchs_photography',
  };

  const configUrl = document.querySelector('script[src*="site.js"]')?.src.includes('../')
    ? '../data/site.json'
    : 'data/site.json';

  fetch(configUrl)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return;
      siteConfig = {
        formEndpoint: (data.formEndpoint || '').trim(),
        inquiryEmail: (data.inquiryEmail || '').trim(),
        instagramHandle: data.instagramHandle || '@vchs_photography',
      };
      document.querySelectorAll('[data-inquiry-form]').forEach((form) => {
        if (!form.dataset.endpoint && siteConfig.formEndpoint) {
          form.dataset.endpoint = siteConfig.formEndpoint;
        }
      });
    })
    .catch(() => {});

  if (toggle && nav) {
    const close = () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Menu';
    };
    toggle.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  if (bar && hero) {
    bar.classList.add('is-over-hero');
    const observer = new IntersectionObserver(
      ([entry]) => {
        const onHero = entry.isIntersecting;
        bar.classList.toggle('is-over-hero', onHero);
        if (pageDots) pageDots.classList.toggle('is-ink', !onHero);
      },
      { threshold: 0.12 }
    );
    observer.observe(hero);
  }

  if (pageDots) {
    const pageLinks = [...pageDots.querySelectorAll('a')];
    const sections = [...document.querySelectorAll('#home, main > .page-section')];
    const markPage = (id) => {
      pageLinks.forEach((link) => {
        if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        markPage(visible.target.id);
      },
      { threshold: [0.35, 0.62] }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  if (!reduce) {
    const media = hero?.querySelector('.hero-media');
    if (media) media.classList.add('is-alive');

    const heroCopy = document.querySelector('[data-hero-copy]');
    if (heroCopy) {
      requestAnimationFrame(() => heroCopy.classList.add('is-ready'));
    }

    const reveals = [...document.querySelectorAll('.reveal')];
    if (reveals.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
      );
      reveals.forEach((node, i) => {
        node.style.setProperty('--reveal-delay', `${Math.min(i % 6, 5) * 70}ms`);
        io.observe(node);
      });
    }

    document.querySelectorAll('img').forEach((img) => {
      const mark = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth) mark();
      else img.addEventListener('load', mark, { once: true });
    });
  } else {
    document.querySelectorAll('.reveal').forEach((node) => node.classList.add('is-in'));
    document.querySelectorAll('[data-hero-copy]').forEach((node) => node.classList.add('is-ready'));
    document.querySelectorAll('img').forEach((img) => img.classList.add('is-loaded'));
  }

  document.querySelectorAll('[data-filter-group]').forEach((group) => {
    const buttons = [...group.querySelectorAll('[data-filter]')];
    const items = [...document.querySelectorAll(group.dataset.filterGroup)];
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.filter;
        buttons.forEach((other) => {
          const on = other === button;
          other.classList.toggle('is-active', on);
          other.setAttribute('aria-pressed', String(on));
        });
        items.forEach((item) => {
          const cats = (item.dataset.categories || item.dataset.category || '')
            .split('|')
            .map((part) => part.trim())
            .filter(Boolean);
          const show = value === 'all' || cats.includes(value) || item.dataset.album === value;
          item.hidden = !show;
          item.style.display = show ? '' : 'none';
        });
        document.dispatchEvent(new CustomEvent('vchs:filters'));
      });
    });
  });

  const params = new URLSearchParams(window.location.search);
  const photographerParam = params.get('photographer');
  if (photographerParam) {
    const select = document.querySelector('#photographer');
    if (select) {
      const option = [...select.options].find((item) => item.value === photographerParam);
      if (option) select.value = photographerParam;
    }
  }

  function payloadLines(payload) {
    return Object.entries(payload)
      .filter(([, v]) => String(v || '').trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return Promise.resolve();
  }

  const bookForm = document.querySelector('[data-book-form]');
  if (bookForm) {
    const select = bookForm.querySelector('[data-book-photographer]');
    const route = bookForm.querySelector('[data-book-route]');
    const submitBtn = bookForm.querySelector('[data-book-submit]');
    const success = bookForm.querySelector('[data-form-success]');
    const photographersUrl = 'data/photographers.json';
    let photographers = [];

    const show = (message) => {
      if (!success) return;
      success.textContent = message;
      success.classList.add('is-on');
    };

    const selected = () => photographers.find((p) => p.id === select?.value) || null;

    const emailsFor = (list) =>
      [...new Set(list.map((p) => (p.email || '').trim()).filter(Boolean))];

    const updateRoute = () => {
      const person = selected();
      if (!person) {
        const all = emailsFor(photographers);
        if (route) {
          route.textContent = all.length
            ? `No preference — opens one email to all ${all.length} photographers who listed an address.`
            : `No photographer emails listed yet. We’ll copy a DM draft for ${siteConfig.instagramHandle}.`;
        }
        if (submitBtn) {
          submitBtn.textContent = all.length ? 'Email all photographers' : 'Copy for club DM';
        }
        return;
      }
      const email = (person.email || '').trim();
      if (email) {
        if (route) route.textContent = `Email opens to ${person.name} only.`;
        if (submitBtn) submitBtn.textContent = `Email ${person.name}`;
      } else {
        if (route) {
          route.textContent = `${person.name} has no public email yet. We’ll copy a DM draft naming them for ${siteConfig.instagramHandle}.`;
        }
        if (submitBtn) submitBtn.textContent = `DM club for ${person.name}`;
      }
    };

    fetch(photographersUrl)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        photographers = Array.isArray(list) ? list : [];
        if (!select) return;
        const pref = new URLSearchParams(location.search).get('photographer') || '';
        const options = [
          '<option value="any">Any available photographer</option>',
          ...photographers.map((p) => {
            const hasEmail = Boolean((p.email || '').trim());
            const mark = hasEmail ? '' : ' (club DM)';
            return `<option value="${p.id}">${p.name}${mark}</option>`;
          }),
        ];
        select.innerHTML = options.join('');
        if (pref && photographers.some((p) => p.id === pref)) select.value = pref;
        else select.value = 'any';
        updateRoute();
      })
      .catch(() => {
        if (select) {
          select.innerHTML = '<option value="any">Any available photographer</option>';
        }
        updateRoute();
      });

    select?.addEventListener('change', updateRoute);

    bookForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const trap = bookForm.querySelector('[name="company_website"]');
      if (trap && trap.value.trim()) return;

      const required = [...bookForm.querySelectorAll('[required]')];
      let ok = true;
      required.forEach((field) => {
        const valid = Boolean(String(field.value || '').trim());
        field.setAttribute('aria-invalid', String(!valid));
        if (!valid) ok = false;
      });
      if (!ok) return;

      const payload = Object.fromEntries(new FormData(bookForm).entries());
      delete payload.company_website;
      const person = selected();
      const allEmails = emailsFor(photographers);
      const toEmail = person
        ? (person.email || '').trim()
        : allEmails.join(',');
      const label = person ? person.name : 'Any available photographer';
      payload.photographer = label;
      if (!person) payload.route = 'Sent to all listed photographers — reply if you can take this shoot';
      if (person && !toEmail) payload.route = `Please connect me with ${person.name}`;
      const summary = payloadLines(payload);

      if (toEmail) {
        const subject = encodeURIComponent(
          person
            ? `VCHS Photography booking inquiry for ${person.name}`
            : 'VCHS Photography booking inquiry — any available photographer'
        );
        const body = encodeURIComponent(summary);
        window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
        show(
          person
            ? `Your email app should open to ${person.name}. If nothing opens, message ${siteConfig.instagramHandle}. This is not a confirmed booking.`
            : `Your email app should open to all ${allEmails.length} photographers. If nothing opens, message ${siteConfig.instagramHandle}.`
        );
        return;
      }

      copyText(summary)
        .then(() => {
          show(
            person
              ? `Summary copied. Paste it into a DM to ${siteConfig.instagramHandle} and ask for ${person.name}.`
              : `Summary copied. Paste it into a DM to ${siteConfig.instagramHandle} and ask for any available photographer.`
          );
        })
        .catch(() => {
          show(`Please message ${siteConfig.instagramHandle} with your project details.`);
        });
    });
  }

  document.querySelectorAll('[data-inquiry-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const trap = form.querySelector('[name="company_website"]');
      if (trap && trap.value.trim()) return;

      const required = [...form.querySelectorAll('[required]')];
      let ok = true;
      required.forEach((field) => {
        const valid =
          field.type === 'checkbox' || field.type === 'radio'
            ? field.checked
            : Boolean(String(field.value || '').trim());
        field.setAttribute('aria-invalid', String(!valid));
        if (!valid) ok = false;
      });
      if (!ok) return;

      const endpoint = (
        form.dataset.endpoint ||
        window.VCHS_FORM_ENDPOINT ||
        siteConfig.formEndpoint ||
        ''
      ).trim();
      const email = (siteConfig.inquiryEmail || '').trim();
      const success = form.querySelector('[data-form-success]');
      const payload = Object.fromEntries(new FormData(form).entries());
      delete payload.company_website;
      const summary = payloadLines(payload);
      const kind = form.dataset.formKind || 'inquiry';

      const show = (message) => {
        if (!success) return;
        success.textContent = message;
        success.classList.add('is-on');
      };

      if (endpoint) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((response) => {
            if (!response.ok) throw new Error('send failed');
            form.reset();
            show(
              kind === 'sponsor'
                ? 'Thank you. Your sponsorship inquiry was submitted. An officer will follow up through school-approved channels.'
                : 'Thank you. Your inquiry was submitted. An officer will follow up — this is not a confirmed booking.'
            );
          })
          .catch(() => {
            show(
              `The form could not be delivered. Please message ${siteConfig.instagramHandle} or use the school contact page.`
            );
          });
        return;
      }

      if (email) {
        const subject = encodeURIComponent(
          kind === 'sponsor' ? 'VCHS Photography sponsorship inquiry' : 'VCHS Photography booking inquiry'
        );
        const body = encodeURIComponent(summary);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        show(
          `Your email app should open with the inquiry. If nothing opens, message ${siteConfig.instagramHandle}.`
        );
        return;
      }

      copyText(summary)
        .then(() => {
          show(
            `Summary copied. Paste it into a DM to ${siteConfig.instagramHandle}. Include which photographer you want, or “any available.” This form did not email the club.`
          );
        })
        .catch(() => {
          show(
            `Please message ${siteConfig.instagramHandle} on Instagram with your project details and photographer preference.`
          );
        });
    });
  });

  const impactRoot = document.querySelector('[data-impact]');
  if (impactRoot) {
    const impactUrl = impactRoot.dataset.impact.startsWith('../')
      ? '../data/impact.json'
      : 'data/impact.json';
    fetch(impactUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.publish) {
          impactRoot.hidden = true;
          return;
        }
        const grid = impactRoot.querySelector('[data-impact-grid]');
        if (!grid) return;
        grid.replaceChildren(
          ...data.metrics
            .filter((m) => String(m.value || '').trim())
            .map((m) => {
              const el = document.createElement('article');
              el.className = 'metric';
              el.innerHTML = `<strong>${m.value}</strong><span>${m.label}</span>`;
              return el;
            })
        );
        impactRoot.hidden = !grid.children.length;
      })
      .catch(() => {
        impactRoot.hidden = true;
      });
  }

  const sponsorRoot = document.querySelector('[data-sponsors]');
  if (sponsorRoot) {
    const url = sponsorRoot.dataset.sponsors.startsWith('../')
      ? '../data/sponsors.json'
      : 'data/sponsors.json';
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const list = sponsorRoot.querySelector('[data-sponsor-list]');
        const note = sponsorRoot.querySelector('[data-sponsor-note]');
        if (note) note.textContent = data.intro || '';
        if (!list) return;
        if (!data.entries?.length) {
          list.innerHTML = data.seeking
            ? '<p class="lede">No public sponsors listed yet. Businesses interested in supporting shared gear or community projects can use the inquiry form below.</p>'
            : '';
          return;
        }
        list.replaceChildren(
          ...data.entries.map((s) => {
            const el = document.createElement('article');
            el.className = 'sponsor-card';
            const name = s.url
              ? `<a href="${s.url}" target="_blank" rel="noreferrer">${s.name}</a>`
              : s.name;
            el.innerHTML = `<h3>${name}</h3><p>${s.blurb || ''}</p>`;
            return el;
          })
        );
      })
      .catch(() => {});
  }
})();
