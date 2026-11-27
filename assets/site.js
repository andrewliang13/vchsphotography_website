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
    formEndpoint: 'https://formsubmit.co/ajax/vchsphotography@gmail.com',
    inquiryEmail: 'vchsphotography@gmail.com',
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
    if (media) {
      media.classList.add('is-alive');
      const slides = [...media.querySelectorAll('img')];
      slides.forEach((img) => {
        if (img.dataset.src) img.src = img.dataset.src;
      });
      if (slides.length > 1) {
        let at = 0;
        setInterval(() => {
          if (document.hidden) return;
          const next = slides[(at + 1) % slides.length];
          if (!next.complete || !next.naturalWidth) return;
          slides[at].classList.remove('is-active');
          at = (at + 1) % slides.length;
          next.classList.add('is-active');
        }, 6500);
      }
    }

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
    const preset = buttons.find((button) => button.hasAttribute('data-default'));
    if (preset) preset.click();
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

    const selected = () => photographers.find((p) => p.id === select?.value) || null;

    const clubEmail = () => (siteConfig.inquiryEmail || '').trim();

    const updateRoute = () => {
      const person = selected();
      const club = clubEmail();
      const email = person ? (person.email || '').trim() : '';
      if (!person) {
        if (route) {
          route.textContent = club
            ? `No preference — your request goes to the club inbox (${club}).`
            : `We’ll copy a DM draft for ${siteConfig.instagramHandle}.`;
        }
      } else if (email) {
        if (route) route.textContent = `Your request goes to the club inbox, with ${person.name} copied.`;
      } else if (club) {
        if (route) route.textContent = `Your request goes to the club inbox (${club}), asking for ${person.name}.`;
      } else {
        if (route) route.textContent = `We’ll copy a DM draft naming ${person.name} for ${siteConfig.instagramHandle}.`;
      }
    };

    fetch(photographersUrl)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        photographers = Array.isArray(list) ? list : [];
        if (!select) return;
        const pref = new URLSearchParams(location.search).get('photographer') || '';
        select.replaceChildren(
          new Option('Any available photographer', 'any'),
          ...photographers.map((p) => new Option(p.name, p.id))
        );
        if (pref && photographers.some((p) => p.id === pref)) select.value = pref;
        else select.value = 'any';
        updateRoute();
      })
      .catch(() => {
        if (select) select.replaceChildren(new Option('Any available photographer', 'any'));
        updateRoute();
      })
      .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
      });

    const dateInput = bookForm.querySelector('input[type="date"]');
    if (dateInput) {
      const now = new Date();
      dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    select?.addEventListener('change', updateRoute);

    const fieldLabel = (field) =>
      (bookForm.querySelector(`label[for="${field.id}"]`)?.textContent || field.name || 'This field').trim();

    const setError = (field, message) => {
      const wrap = field.closest('.field') || field.parentElement;
      let note = wrap.querySelector('.field-error');
      if (message) {
        if (!note) {
          note = document.createElement('p');
          note.className = 'field-error';
          note.id = `${field.id || field.name}-error`;
          wrap.appendChild(note);
        }
        note.textContent = message;
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', note.id);
      } else {
        note?.remove();
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
      }
    };

    const validate = (field) => {
      const value = String(field.value || '').trim();
      if (field.required && !value) return `${fieldLabel(field)} is required.`;
      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return 'Enter a valid email address, like name@example.com.';
      }
      if (field.type === 'date' && value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(`${value}T00:00:00`) < today) return 'Choose a date that is today or later.';
      }
      return '';
    };

    const fields = [...bookForm.querySelectorAll('input:not([name="company_website"]), select, textarea')];
    fields.forEach((field) => {
      field.addEventListener('blur', () => {
        if (field.getAttribute('aria-invalid') === 'true' || field.value) setError(field, validate(field));
      });
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') setError(field, validate(field));
      });
    });

    const panel = document.createElement('div');
    panel.className = 'form-state';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.hidden = true;
    bookForm.after(panel);

    const showPanel = (kind, title, html) => {
      panel.className = `form-state form-state-${kind}`;
      panel.innerHTML = `<h3 tabindex="-1">${title}</h3>${html}`;
      panel.hidden = false;
      panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      panel.querySelector('h3').focus({ preventScroll: true });
    };

    const escapeHtml = (text) =>
      String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    const setBusy = (busy) => {
      if (!submitBtn) return;
      submitBtn.disabled = busy;
      bookForm.setAttribute('aria-busy', String(busy));
      if (busy) {
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';
      } else if (submitBtn.dataset.label) {
        submitBtn.textContent = submitBtn.dataset.label;
      }
    };

    bookForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const trap = bookForm.querySelector('[name="company_website"]');
      if (trap && trap.value.trim()) return;

      let firstBad = null;
      fields.forEach((field) => {
        const message = validate(field);
        setError(field, message);
        if (message && !firstBad) firstBad = field;
      });
      if (firstBad) {
        if (success) {
          success.textContent = 'Please fix the highlighted fields.';
          success.classList.add('is-on', 'is-error');
        }
        firstBad.focus();
        return;
      }
      success?.classList.remove('is-on', 'is-error');
      panel.hidden = true;

      const data = Object.fromEntries(new FormData(bookForm).entries());
      const person = selected();
      const club = clubEmail();
      const personEmail = person ? (person.email || '').trim() : '';
      const who = person ? person.name : 'Any available photographer';
      const service = data.service || 'Photography';
      const subjectLine = `Booking request: ${service} — ${data.name}`;

      // Human-readable labels become the rows of the email table.
      const rows = {
        Name: data.name,
        Email: data.email,
        Organization: data.organization || '—',
        'Inquiry type': data.inquiry_type,
        Service: service,
        Photographer: who,
        'Community / nonprofit': data.nonprofit || 'No',
        'Preferred date': data.preferred_date || 'Flexible',
        'Preferred time': data.preferred_time || 'Flexible',
        Location: data.location,
        Budget: data.budget || 'Requesting a quote',
        'Project description': data.description,
      };
      const summary = Object.entries(rows).map(([k, v]) => `${k}: ${v}`).join('\n');
      const mailHref = `mailto:${club}?${personEmail && personEmail !== club ? `cc=${encodeURIComponent(personEmail)}&` : ''}subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(summary)}`;
      const endpoint = (siteConfig.formEndpoint || '').trim();

      const fallback = (reason) => {
        setBusy(false);
        showPanel(
          'error',
          'We couldn’t send your request',
          `<p>${escapeHtml(reason)} Your details are still in the form.</p>
           <div class="actions">
             <a class="btn btn-navy" href="${mailHref}">Email it to ${escapeHtml(club)}</a>
             <button type="button" class="btn btn-ghost" data-retry>Try again</button>
           </div>`
        );
        panel.querySelector('[data-retry]')?.addEventListener('click', () => {
          panel.hidden = true;
          bookForm.requestSubmit();
        });
      };

      if (!endpoint) {
        fallback('Online booking is offline right now.');
        return;
      }

      const body = {
        ...rows,
        _subject: subjectLine,
        _replyto: data.email,
        _template: 'table',
        _captcha: 'false',
      };
      if (personEmail && personEmail !== club) body._cc = personEmail;

      setBusy(true);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then((r) => r.json().catch(() => ({})).then((res) => ({ ok: r.ok, res })))
        .then(({ ok, res }) => {
          clearTimeout(timer);
          if (!ok || String(res.success) !== 'true') {
            fallback(
              /activat/i.test(res.message || '')
                ? 'Online requests are still being set up.'
                : 'The booking service didn’t accept the request.'
            );
            return;
          }
          setBusy(false);
          bookForm.reset();
          fields.forEach((field) => setError(field, ''));
          updateRoute();
          bookForm.hidden = true;
          showPanel(
            'ok',
            'Request sent',
            `<p>Thanks, ${escapeHtml(data.name)}. Your ${escapeHtml(service.toLowerCase())} request went to the club inbox${
              personEmail ? ` and ${escapeHtml(person.name)}` : ''
            }. An officer will reply to <strong>${escapeHtml(data.email)}</strong> within 2–3 school days.</p>
             <p class="form-note">This is not a confirmed booking until an officer replies.</p>
             <div class="actions"><button type="button" class="btn btn-ghost" data-again>Send another request</button></div>`
          );
          panel.querySelector('[data-again]')?.addEventListener('click', () => {
            panel.hidden = true;
            bookForm.hidden = false;
            bookForm.querySelector('input, select, textarea')?.focus();
          });
        })
        .catch(() => {
          clearTimeout(timer);
          fallback('The connection timed out or dropped.');
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
          body: JSON.stringify({
            ...payload,
            _subject: kind === 'sponsor' ? 'VCHS Photography sponsorship inquiry' : 'VCHS Photography inquiry',
            _template: 'table',
            _captcha: 'false',
            ...(payload.email ? { _replyto: payload.email } : {}),
          }),
        })
          .then((response) => {
            if (!response.ok) throw new Error('send failed');
            return response.json().catch(() => ({}));
          })
          .then((res) => {
            if (res && String(res.success) === 'false') throw new Error('send failed');
            form.reset();
            show(
              kind === 'sponsor'
                ? 'Thank you. Your sponsorship inquiry was submitted. An officer will follow up through school-approved channels.'
                : 'Thank you. Your inquiry was submitted. An officer will follow up — this is not a confirmed booking.'
            );
          })
          .catch(() => {
            if (email) {
              const subject = encodeURIComponent(
                kind === 'sponsor' ? 'VCHS Photography sponsorship inquiry' : 'VCHS Photography inquiry'
              );
              window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(summary)}`;
              show(`We couldn’t send it directly, so your email app should open instead. If nothing opens, email ${email}.`);
              return;
            }
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
