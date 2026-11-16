/* ==========================================================================
   Isha Salvi — portfolio
   Smooth scroll (Lenis) + GSAP/ScrollTrigger, hash router with page-slide
   transitions. Home intro follows the Figma "Home page ANIMATION -1…-5" frames.
   ========================================================================== */
(() => {
  const { projects, about: aboutMedia, myspace } = window.SITE;
  const A = window.ABOUT;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'expo.out' });

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const bySlug = (s) => projects.find((p) => p.slug === s);
  const arrow = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" aria-hidden="true"><path d="M1 9 9 1M3 1h6v6"/></svg>';

  /* ---------- smooth scroll ---------- */
  const lenis = reduce ? null : new Lenis({ lerp: 0.075, wheelMultiplier: 0.85, smoothWheel: true });
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (y, opts = {}) => (lenis ? lenis.scrollTo(y, { immediate: true, force: true, ...opts }) : window.scrollTo(0, y));
  const velocity = () => (lenis ? lenis.velocity : 0);

  /* ---------- media slot ---------- */
  function media(m, { cls = '', alt = '', attrs = '', lazy = true } = {}) {
    return `<figure class="media ${cls}" style="--ar:${m.w}/${m.h}" data-label="${esc(m.label)} · ${m.w}×${m.h}" ${attrs}>` +
      `<img src="${m.src}" alt="${esc(alt)}" ${lazy ? 'loading="lazy"' : ''} decoding="async" width="${m.w}" height="${m.h}"></figure>`;
  }
  // Missing exports fall back to a labelled placeholder instead of a broken image.
  document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') e.target.closest('.media, .morph__tile')?.classList.add('is-missing');
  }, true);

  /* ---------- word split + reveals ---------- */
  function split(el) {
    if (el.dataset.splitDone) return $$('.wi', el);
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(part);
            else frag.append(h(`<span class="w"><span class="wi">${esc(part)}</span></span>`));
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    return $$('.wi', el);
  }
  function lineDelays(words) {
    const tops = [...new Set(words.map((w) => Math.round(w.parentNode.offsetTop)))].sort((a, b) => a - b);
    return words.map((w) => tops.indexOf(Math.round(w.parentNode.offsetTop)));
  }
  function revealText(el, delay = 0) {
    const words = split(el);
    if (reduce) return gsap.set(words, { yPercent: 0 });
    const lines = lineDelays(words);
    return gsap.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1.4, ease: 'expo.out', delay, stagger: (i) => lines[i] * 0.09 });
  }
  function setupReveals(root) {
    $$('[data-split]', root).forEach((el) => {
      if (el.closest('[data-manual]')) return;
      const words = split(el);
      gsap.set(words, { yPercent: reduce ? 0 : 110 });
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => revealText(el) });
    });
    $$('[data-reveal-img]', root).forEach((el) => {
      if (el.dataset.revealed) return;
      if (reduce) return gsap.set(el, { clipPath: 'inset(0% 0% 0% 0%)' });
      const img = $('img', el);
      ScrollTrigger.create({
        trigger: el, start: 'top 95%', once: true,
        onEnter: () => {
          el.dataset.revealed = '1';
          gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.out' });
          gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2.2, ease: 'expo.out' });
        },
      });
    });
    $$('[data-fade]', root).forEach((el) => {
      gsap.set(el, { autoAlpha: 0, y: 30 });
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.6, ease: 'power3.out' }) });
    });
  }

  /* ---------- marquee driven by scroll velocity ---------- */
  // Content is rendered twice in a row, so wrapping at half the width is seamless.
  function marquee(track, { dir = 1, speed = 50 } = {}) {
    let x = 0, boost = 1, half = 0;
    const setX = gsap.quickSetter(track, 'x', 'px');
    const ro = new ResizeObserver(() => { half = track.scrollWidth / 2; });
    ro.observe(track);
    const tick = (time, dt) => {
      const v = velocity();
      boost += (1 + Math.min(Math.abs(v) * 0.25, 6) - boost) * 0.06;
      x -= dir * (v < -0.5 ? -1 : 1) * speed * boost * (dt / 1000);
      if (half) x = (((x % half) + half) % half) - half;
      setX(x);
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); ro.disconnect(); };
  }

  /* ---------- theme + clock ---------- */
  const root = document.documentElement;
  const PALETTES = window.PALETTES || [];
  const currentPalette = () => {
    const bg = root.style.getPropertyValue('--bg').trim().toLowerCase();
    return PALETTES.find((p) => p.bg.toLowerCase() === bg) || null;
  };
  const randomBtn = $('[data-theme-random]');
  function paintTheme() {
    const pal = currentPalette();
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(!pal && (b.dataset.themeSet === 'dark') === dark)));
    randomBtn.setAttribute('aria-pressed', String(!!pal));
    randomBtn.title = pal ? `${pal.name} — click for another palette` : 'Random colour palette';
  }
  $$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
    window.applyPalette?.(null);
    root.dataset.theme = b.dataset.themeSet;
    paintTheme();
  }));
  // Randomiser: a pixel palette that gives a little wiggle on hover
  const palIco = $('.nav__ico', randomBtn);
  randomBtn.addEventListener('pointerenter', () => { if (!reduce) gsap.fromTo(palIco, { rotate: 0 }, { keyframes: { rotate: [-14, 10, -5, 0] }, duration: 0.7, ease: 'power2.out', overwrite: true }); });
  // Shuffled deck: every palette appears once before any repeats, and a palette never follows
  // its own inverse (pairs are listed next to their inverses, so a family is index / 2).
  const family = (p) => Math.floor(PALETTES.indexOf(p) / 2);
  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  let deck = [];
  const recent = []; // the last few palettes shown, so a fresh deck doesn't start with one of them
  const MODES = [{ name: 'Light', mode: 'light' }, { name: 'Dark', mode: 'dark' }];
  const ALL = PALETTES.concat(MODES);
  const famOf = (p) => (p.mode ? 'modes' : family(p));
  let picked = null; // what the randomiser last showed, palettes and the two modes alike
  function deal(prev) {
    if (!deck.length) deck = shuffle(ALL);
    const ok = (p) => !prev || famOf(p) !== famOf(prev);
    if (!deck.some(ok)) deck = shuffle(ALL.filter((p) => !deck.includes(p))).concat(deck); // only the inverse is left: hold it back
    let i = deck.findIndex((p) => ok(p) && !recent.includes(p));
    if (i < 0) i = deck.findIndex(ok);
    const next = deck.splice(i, 1)[0];
    recent.push(next);
    if (recent.length > 4) recent.shift();
    return next;
  }
  randomBtn.addEventListener('click', () => {
    if (!reduce) {
      // a full turn with a small press
      gsap.fromTo(palIco, { rotate: 0, scale: 0.78 }, { rotate: 360, scale: 1, duration: 0.9, ease: 'expo.out', overwrite: true });
    }
    const next = deal(picked || currentPalette() || MODES.find((m) => m.mode === (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))));
    picked = next;
    if (next.mode) { window.applyPalette?.(null); root.dataset.theme = next.mode; }
    else window.applyPalette?.(next);
    paintTheme();
    randomBtn.title = `${next.name} — click for another palette`;
  });
  paintTheme();

  const clockFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const clock = $('[data-clock]');
  const paintClock = () => { clock.textContent = clockFmt.format(new Date()).replace(/\s/g, ''); };
  paintClock();
  setInterval(paintClock, 15000);

  /* ---------- cursor ---------- */
  const cursor = $('.cursor');
  if (!touch) {
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.6, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.6, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]');
      cursor.classList.toggle('is-view', !!t);
      if (t) $('.cursor__label', cursor).textContent = t.dataset.cursor;
    });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
  }

  /* ---------- More Info drawer ---------- */
  const drawer = $('[data-drawer]');
  const drawerTab = $('[data-drawer-toggle]', drawer);
  // Persona illustrations for "Users & their goals" (white line art, used as masks so they take the panel colour).
  const avatar = (i) => {
    const url = `url('assets/brand/persona-${(i % 3) + 1}.png')`; // inline, so the path resolves from the page
    return `<span class="drawer__avatar" style="-webkit-mask-image:${url};mask-image:${url}" aria-hidden="true"></span>`;
  };
  // Long Figma paragraphs come through as one block: break them into 2–3 sentence paragraphs.
  function paragraphs(text) {
    if (text.includes('\n')) return text.split(/\n+/).map((t) => t.trim()).filter(Boolean);
    if (text.length < 320) return [text];
    const sentences = text.match(/[^.!?]+[.!?]+["”’)]*\s*/g) || [text];
    const out = [];
    let cur = '';
    sentences.forEach((s) => { cur += s; if (cur.length >= 200) { out.push(cur.trim()); cur = ''; } });
    if (cur.trim()) { if (cur.length < 60 && out.length) out[out.length - 1] += ` ${cur.trim()}`; else out.push(cur.trim()); }
    return out;
  }
  function setDrawer(p) {
    const has = p && p.info && p.info.length;
    drawer.classList.toggle('is-available', !!has);
    if (!has) return;
    $('[data-drawer-body]', drawer).innerHTML = '<h2 class="drawer__title">More Info</h2>' + p.info.map((s) => {
      let body;
      if (s.type === 'pairs' && /^users/i.test(s.heading)) {
        body = `<div class="drawer__users">${s.items.map(([t, d, ...rest], i) => `
          <div class="drawer__user">${avatar(i)}<h4>${esc(t)}</h4>${[d, ...rest].map((r) => {
            if (!/^[A-Z][\w ]{1,20}:\s/.test(r)) return `<p>${esc(r)}</p>`;
            const [k, v] = r.split(/:\s(.+)/);
            return `<p class="drawer__user-row"><b>${esc(k)}</b>${esc(v || '')}</p>`;
          }).join('')}</div>`).join('')}</div>`;
      } else if (s.type === 'flow') {
        // a journey: numbered steps joined by arrows
        body = s.items.map(([t, steps]) => `<div class="drawer__flow"><h4>${esc(t)}</h4><ol>${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`).join('');
      } else if (s.type === 'pairs') {
        body = s.items.map(([t, d]) => `<div class="drawer__pair"><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join('');
      } else {
        body = s.items.flatMap(paragraphs).map((t) => `<p>${esc(t)}</p>`).join('');
      }
      return `<section class="drawer__sec"><h3>${esc(s.heading)}</h3>${body}</section>`;
    }).join('');
  }
  function openDrawer(open) {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    drawerTab.setAttribute('aria-expanded', String(open));
    if (open) { lenis?.stop(); $('.drawer__panel', drawer).scrollTop = 0; $('[data-drawer-close]', drawer).focus(); }
    else { lenis?.start(); }
  }
  drawerTab.addEventListener('click', () => openDrawer(!drawer.classList.contains('is-open')));
  $$('[data-drawer-close]').forEach((b) => b.addEventListener('click', () => { openDrawer(false); drawerTab.focus(); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) { openDrawer(false); drawerTab.focus(); } });

  /* ==========================================================================
     HOME — intro (Figma ANIMATION frames) + gallery
     ========================================================================== */

  let homeMemory = null; // { current, slug } restored when coming back from a project

  function HomeView() {
    const COPIES = 3; // the column holds three copies of the projects and wraps within the middle one
    const n = projects.length;
    const el = h(`
      <div class="view" data-view="home">
        <section class="home" aria-label="Selected work">
          <div class="home__stage">
            <div class="intro">
              <div class="hero" data-manual>
                <h1 class="hero__name"><span data-split data-base>Isha Salvi</span><i class="hero__rule"></i></h1>
                <p class="hero__role"><span data-split data-base>Creative Director, Product designer</span><i class="hero__rule"></i></p>
                <p class="hero__tagline" data-split>I make things look good. <b>And actually work.</b></p>
              </div>
              <p class="work" aria-hidden="true">${[...'WORK'].map((c) => `<span class="ch">${c}</span>`).join('')}</p>
              <div class="loader-sq" aria-hidden="true"><i></i></div>
            </div>
            <div class="gallery">
              <nav class="g-list g-fade" aria-label="Projects" style="--n:${projects.length}">
                ${projects.map((p, i) => `
                  <div class="g-row">
                    <${p.noPage ? 'span' : 'a'} class="g-item${p.noPage ? ' is-static' : ''}" ${p.noPage ? '' : `href="#work-${p.slug}"`} data-slug="${p.slug}">
                      <span class="g-item__n">${String(i + 1).padStart(2, '0')}/</span><span class="g-item__t">${esc(p.list)}</span>
                    </${p.noPage ? 'span' : 'a'}>
                  </div>`).join('')}
              </nav>
              <div class="g-col">
                <div class="g-track">
                  ${Array.from({ length: COPIES }, (_, c) => projects.map((p) => `
                    ${p.noPage
                      ? `<div class="g-fig is-static" data-slug="${p.slug}" style="--w:${p.cover.w};--x:${p.coverX}" ${c === 1 ? `role="img" aria-label="${esc(p.title)}, ${p.nda ? 'under NDA' : 'ongoing'}"` : 'aria-hidden="true"'}>`
                      : `<a class="g-fig" href="#work-${p.slug}" data-slug="${p.slug}" data-cursor="View" style="--w:${p.cover.w};--x:${p.coverX}"
                      ${c === 1 ? `aria-label="${esc(p.title)} — view case study"` : 'aria-hidden="true" tabindex="-1"'}>`}
                      ${media(p.cover, { alt: '', lazy: false })}
                      <span class="g-tags"><span class="g-tag">${esc(p.kind || 'Website')}</span>${p.nda ? '<span class="g-tag">Under NDA</span>' : p.ongoing ? '<span class="g-tag">Ongoing</span>' : ''}</span>
                    </${p.noPage ? 'div' : 'a'}>`).join('')).join('')}
                </div>
              </div>
              <div class="g-info g-fade" aria-live="polite"></div>
            </div>
            <div class="morph" aria-hidden="true">
              ${projects.map((p) => `<div class="morph__tile"><img src="${p.cover.src}" alt="" decoding="async"><i></i></div>`).join('')}
            </div>
          </div>
        </section>
      </div>`);

    const stage = $('.home__stage', el);
    const hero = $('.hero', el);
    const work = $('.work', el);
    const sq = $('.loader-sq', el);
    const gallery = $('.gallery', el);
    const track = $('.g-track', el);
    const figs = $$('.g-fig', el);          // all copies
    const setB = figs.slice(n, 2 * n);       // the middle copy: what the morph lands on
    const info = $('.g-info', el);
    const links = $$('.g-item', el);
    const rows = $$('.g-row', el);
    const fades = $$('.g-fade', el);
    const morphEl = $('.morph', el);
    const tiles = $$('.morph__tile', el);
    const tileImgs = tiles.map((t) => $('img', t));
    const tileCovers = tiles.map((t) => $('i', t));
    const fill = $('i', sq);
    let hovered = null;
    let listShown = false;
    let active = null;
    let alive = true;
    let live = false;
    let offTick = null;
    let ctx;
    links.forEach((a) => {
      a.addEventListener('pointerenter', () => { hovered = a; });
      a.addEventListener('pointerleave', () => { if (hovered === a) hovered = null; });
      // a name in the list scrolls the column to that project; the cover or View case study opens it
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const i = projects.findIndex((p) => p.slug === a.dataset.slug);
        if (i < 0 || !geo.L) return;
        let d = geo.c[i] - wrap(vs.target);
        d -= Math.round(d / geo.L) * geo.L; // the shortest way round the loop
        vs.target += d;
      });
    });

    // list items blur in once, the first time the gallery opens
    function showList(instant = false) {
      if (listShown) return;
      listShown = true;
      if (instant || reduce) return gsap.set(rows, { autoAlpha: 1, filter: 'blur(0px)', y: 0 });
      gsap.fromTo(rows, { autoAlpha: 0, filter: 'blur(10px)', y: 14 },
        { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.05 });
    }
    function paintInfo(p, animate = true) {
      info.innerHTML = `
        <p class="g-info__title" data-split>${esc(p.title)}</p>
        <p class="g-info__full" data-split>${esc(p.fullName)}</p>
        <p class="g-info__desc" data-split>${esc(p.homeDesc)}</p>
        ${p.noPage ? `<p class="g-info__status">${p.nda ? 'Under NDA' : 'Ongoing'}</p>` : `<a class="g-info__cta" href="#work-${p.slug}" data-slug="${p.slug}">View case study ${arrow}</a>`}`;
      if (animate) $$('[data-split]', info).forEach((node, i) => revealText(node, i * 0.06));
    }
    function setActive(slug, animate = true) {
      if (slug === active) return;
      active = slug;
      links.forEach((a) => {
        if (a.dataset.slug === slug) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      paintInfo(bySlug(slug), animate);
    }

    // Sit each rule exactly on the glyph baseline of its line (font-agnostic).
    function placeRules() {
      $$('[data-base]', hero).forEach((span) => {
        const words = split(span);
        const last = words[words.length - 1];
        let base = $('.hero__base', last);
        if (!base) { base = h('<i class="hero__base" aria-hidden="true"></i>'); last.append(base); }
        const block = span.parentNode; // positioned h1 / p; offsetTop ignores the reveal transforms
        let y = 0;
        for (let node = base; node && node !== block; node = node.offsetParent) y += node.offsetTop;
        $('.hero__rule', block).style.top = `${Math.round(y)}px`;
      });
    }

    // ---- geometry ----
    const geo = {};
    const wrap = (v) => ((v % geo.L) + geo.L) % geo.L;
    function measure() {
      placeRules();
      const vw = innerWidth, vh = innerHeight;
      geo.vw = vw; geo.vh = vh;
      const fs = parseFloat(getComputedStyle(work).fontSize);
      const small = vw < 820 ? 40 : Math.max(36, (52 / 1512) * vw);
      geo.workScale = small / fs;
      geo.workStartY = vh * (746 / 982);
      geo.workEndY = vh * (447.5 / 982) - (fs * 1.2) / 2;
      geo.unit = vh * 0.7;
      // loop: one copy's height, and the offset that centres the middle copy's first project
      geo.top = figs.map((f) => f.offsetTop);
      geo.hgt = figs.map((f) => f.offsetHeight);
      geo.L = geo.top[2 * n] - geo.top[n];
      geo.b = vh / 2 - geo.hgt[n] / 2 - geo.top[n];
      // centre of each project measured along one loop, from the first project's centre
      geo.c = setB.map((f, i) => geo.top[n + i] + geo.hgt[n + i] / 2 - (geo.top[n] + geo.hgt[n] / 2));
    }

    /* ---- box → bar → row of tiles → rotate → image column (after Cathy Dolle's loader) ----
       Scrolling brings WORK to the centre with an outlined box. The box is a loader: it waits for
       the covers, snaps filled, then the rest plays on its own and hands over to the infinite column. */
    const GATE = 1.05; // scrub time at which WORK is centred and the outlined box has appeared
    const S0 = 12, G0 = 2, SP1 = 30; // tile size, packed gap, spread spacing (px)
    const M = { filled: 0, bar: 0, spread: 0, img: 0, rot: 0, settle: 0 };
    const coversReady = Promise.race([
      Promise.all(setB.map((f) => { const im = $('img', f); return im.complete ? 0 : new Promise((r) => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); }); })),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
    let finals = [];
    let morphTl = null;
    let morphed = false;

    function measureFinals() {
      gsap.set(figs, { skewY: 0 });
      gsap.set(track, { y: geo.b }); // where the column sits when the loop starts
      finals = setB.map((f) => {
        const r = f.getBoundingClientRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
      });
      const gaps = finals.slice(1).map((f, i) => f.cy - finals[i].cy);
      // on the diagonal the tiles already grow toward their final size, as in the reference
      geo.spMid = (gaps.reduce((x, y) => x + y, 0) / gaps.length) * 0.7;
      geo.szMid = Math.min(...finals.map((f) => f.w)) * 0.55;
    }

    function renderMorph() {
      const cx = innerWidth / 2, cy = innerHeight / 2;
      const done = M.settle >= 1;
      const rowW = n * S0 + (n - 1) * G0;
      fill.style.opacity = M.filled > 0 ? 1 : 0; // snaps filled in one frame, like the reference
      if (M.bar < 1) {
        // the filled box tightens slightly, then stretches sideways into a bar the width of the tile row
        const sz0 = lerp(17, 15, M.filled);
        sq.style.width = `${lerp(sz0, rowW, M.bar)}px`;
        sq.style.height = `${lerp(sz0, S0, M.bar)}px`;
        sq.style.visibility = 'visible';
        morphEl.style.visibility = 'hidden';
      } else {
        sq.style.visibility = 'hidden';
        morphEl.style.visibility = done ? 'hidden' : 'visible';
      }
      gsap.set(gallery, { autoAlpha: done ? 1 : 0 });
      const th = M.rot * Math.PI / 2; // row turns clockwise to vertical, first project on top
      const sp = lerp(lerp(S0 + G0, SP1, M.spread), geo.spMid, M.rot);
      const sz = lerp(S0, geo.szMid, M.rot);
      tiles.forEach((t, i) => {
        const k = i - (n - 1) / 2, f = finals[i];
        const w = lerp(sz, f.w, M.settle), hh = lerp(sz, f.h, M.settle);
        const x = lerp(cx + Math.cos(th) * sp * k, f.cx, M.settle);
        const y = lerp(cy + Math.sin(th) * sp * k, f.cy, M.settle);
        t.style.width = `${w}px`;
        t.style.height = `${hh}px`;
        t.style.transform = `translate3d(${x - w / 2}px, ${y - hh / 2}px, 0)`;
        tileImgs[i].style.opacity = M.img;
        tileCovers[i].style.opacity = 1 - M.img;
      });
    }

    function buildMorph() {
      measureFinals();
      Object.assign(M, { filled: 0, bar: 0, spread: 0, img: 0, rot: 0, settle: 0 });
      const H = 0.65; // hold on the filled box before it stretches
      return gsap.timeline({ paused: true, onUpdate: renderMorph, onComplete: startGallery })
        .to(M, { filled: 1, duration: 0.25, ease: 'power2.out' }, 0)
        .to(work, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' }, H - 0.1)
        .to(M, { bar: 1, duration: 0.45, ease: 'power3.inOut' }, H)
        .to(M, { spread: 1, duration: 0.55, ease: 'power3.out' }, H + 0.45)
        .to(M, { img: 1, duration: 0.5, ease: 'power1.inOut' }, H + 0.8)
        .to(M, { rot: 1, duration: 1.25, ease: 'power2.inOut' }, H + 1.25)
        .to(M, { settle: 1, duration: 0.95, ease: 'power2.inOut' }, H + 2.1)
        .to(fades, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, H + 2.9)
        .call(() => showList(), null, H + 2.9);
    }
    async function playMorph() {
      morphed = true;
      lockPage();
      // the outlined box waits for the covers, and shows for at least a beat
      await Promise.all([coversReady, new Promise((r) => setTimeout(r, reduce ? 0 : 1100))]);
      if (!alive) return;
      morphTl = buildMorph();
      morphTl.timeScale(reduce ? 20 : 1).play();
    }

    // The header's Work link: from the intro, run straight through it to the gallery.
    function toWork() {
      if (live || morphed) return;
      const end = GATE * geo.unit + 4;
      const go = (y) => { window.scrollTo(0, y); lenis?.scrollTo(y, { immediate: true, force: true }); };
      const pos = { y: window.scrollY };
      gsap.to(pos, { y: end, duration: reduce ? 0 : 1.6, ease: 'power2.inOut', onUpdate: () => go(pos.y) });
    }

    // The page itself stops scrolling once the loader shows; from then on input drives the loop.
    function lockPage() { lenis?.stop(); root.classList.add('is-locked'); }

    function buildIntro() {
      measure();
      gsap.set(work, { xPercent: -50, y: () => geo.workStartY });
      gsap.set(gallery, { autoAlpha: 0 });
      gsap.set(fades, { autoAlpha: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      tl.to(hero, { y: () => -geo.vh * 0.95, duration: 1, ease: 'power2.in' }, 0)
        .to(work, { y: () => geo.workEndY, scale: () => geo.workScale, duration: 1, ease: 'power2.inOut' }, 0)
        .to(sq, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, 0.75);
      ScrollTrigger.create({
        trigger: stage,
        start: 'top top',
        end: () => `+=${GATE * geo.unit}`,
        pin: true,
        scrub: reduce ? true : 1,
        animation: tl,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onUpdate: (self) => {
          // use scroll progress, not the scrubbed (lagging) timeline time
          const t = self.progress * tl.duration();
          document.body.classList.toggle('nav-accent', t < 0.08);
          if (t >= GATE - 0.02 && !morphed) playMorph();
        },
      });
    }

    /* ---- infinite column ---- */
    const vs = { target: 0, current: 0 };
    const onWheel = (e) => { vs.target += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; };
    let touchY = null;
    const onTouchStart = (e) => { touchY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (touchY == null) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      vs.target += (touchY - y) * 1.6;
      touchY = y;
    };
    const onTouchEnd = () => { touchY = null; };
    const onKey = (e) => {
      if (e.target.closest('input, textarea')) return;
      const step = { ArrowDown: 120, ArrowUp: -120, PageDown: innerHeight * 0.8, PageUp: -innerHeight * 0.8, ' ': innerHeight * 0.8 }[e.key];
      if (step) { e.preventDefault(); vs.target += e.shiftKey && e.key === ' ' ? -step : step; }
    };
    function listen(on) {
      const m = on ? 'addEventListener' : 'removeEventListener';
      window[m]('wheel', onWheel, { passive: true });
      window[m]('touchstart', onTouchStart, { passive: true });
      window[m]('touchmove', onTouchMove, { passive: false });
      window[m]('touchend', onTouchEnd);
      window[m]('keydown', onKey);
    }
    function startGallery() {
      if (live || !alive) return;
      live = true;
      lockPage();
      gallery.classList.add('is-live');
      $('.nav__work')?.setAttribute('aria-current', 'page'); // the projects scroll is the Work section
      morphEl.style.visibility = 'hidden';
      gsap.set(gallery, { autoAlpha: 1 });
      listen(true);
    }

    // Opacity falloff shaped on the reference list (active, then a steep cubic drop), with the floor
    // raised from its 0.15 to 0.35 so every project name stays readable.
    const falloff = (d) => 0.32 + 0.68 * Math.pow(Math.max(0, 1 - d), 2); // the project in view is lit, the rest sit back

    // Everything below is computed from the loop position, so a frame only writes and never measures.
    function startTick() {
      let skew = 0, last = 0;
      const imgs = figs.map((f) => $('img', f));
      const setY = gsap.quickSetter(track, 'y', 'px');
      const setSkew = figs.map((f) => gsap.quickSetter(f, 'skewY', 'deg'));
      const op = links.map(() => 0.35);
      const tick = () => {
        if (!live) return;
        vs.current += (vs.target - vs.current) * (reduce ? 1 : 0.085);
        const vel = vs.current - last;
        last = vs.current;
        const ty = geo.b - wrap(vs.current);
        setY(ty);
        skew += (clamp(vel * -0.25, -4, 4) - skew) * 0.08;
        const vh = geo.vh, mid = vh / 2;
        figs.forEach((f, i) => {
          const c = ty + geo.top[i] + geo.hgt[i] / 2;
          if (c < -geo.hgt[i] || c > vh + geo.hgt[i]) return;
          setSkew[i](reduce ? 0 : skew);
        });
        // fractional project index at the screen centre, around the loop
        const u = wrap(vs.current);
        let pos = 0;
        for (let i = 0; i < n; i++) {
          const a = geo.c[i], b = i + 1 < n ? geo.c[i + 1] : geo.L;
          if (u >= a && u < b) { pos = i + (u - a) / (b - a); break; }
        }
        links.forEach((a, i) => {
          let d = Math.abs(i - pos);
          d = Math.min(d, n - d); // the list wraps too
          const target = a === hovered ? 1 : falloff(d);
          op[i] += (target - op[i]) * 0.18;
          a.style.opacity = op[i].toFixed(4);
        });
        setActive(projects[Math.round(pos) % n].slug);
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    }

    const onResize = () => { measure(); if (morphTl && !live) { measureFinals(); renderMorph(); } };

    // Clicking a cover records it so the page transition can grow it into the project hero.
    el.addEventListener('click', (e) => {
      const fig = e.target.closest('.g-fig');
      if (!fig || fig.classList.contains('is-static')) return;
      const img = $('img', fig);
      pendingFlip = { rect: fig.getBoundingClientRect(), src: img.currentSrc || img.src, loaded: img.complete && img.naturalWidth > 0 };
    });

    return {
      el,
      route: 'home',
      toWork,
      enter() { // runs while the view is still sliding in
        if (!homeMemory) return;
        // coming back from a project: show the column where it was left
        measure();
        gsap.set([hero, work, sq], { autoAlpha: 0 });
        gsap.set(fades, { autoAlpha: 1 });
        gsap.set(gallery, { autoAlpha: 1 });
        gallery.classList.add('is-live');
        $('.nav__work')?.setAttribute('aria-current', 'page');
        showList(true);
        setActive(homeMemory.slug, false);
        vs.current = vs.target = homeMemory.current;
        gsap.set(track, { y: geo.b - wrap(vs.current) });
      },
      init({ first }) {
        window.addEventListener('resize', onResize);
        offTick = startTick();
        if (homeMemory) {
          homeMemory = null;
          morphed = true;
          startGallery();
          return;
        }
        if (!listShown) gsap.set(rows, { autoAlpha: 0 });
        ctx = gsap.context(() => buildIntro(), el);
        setActive(projects[0].slug, false);
        // load-in: rules draw, words rise, WORK rises from the fold
        const tl = gsap.timeline({ delay: first ? 0.2 : 0.05 });
        tl.fromTo($$('.hero__rule', el), { scaleX: 0 }, { scaleX: 1, duration: reduce ? 0 : 1.6, ease: 'expo.inOut', stagger: 0.12 }, 0);
        $$('.hero [data-split]', el).forEach((node, i) => { gsap.set(split(node), { yPercent: 110 }); tl.add(revealText(node), 0.35 + i * 0.12); });
        tl.fromTo($$('.work .ch', el), { yPercent: 100 }, { yPercent: 0, duration: reduce ? 0 : 1.6, stagger: 0.07 }, 0.5);
      },
      leave() {
        homeMemory = live ? { current: vs.current, slug: active } : null; // left during the intro: replay next time
      },
      destroy() {
        alive = false;
        listen(false);
        window.removeEventListener('resize', onResize);
        morphTl?.kill();
        offTick?.();
        ctx?.revert();
        root.classList.remove('is-locked');
        document.body.classList.remove('nav-accent');
      },
    };
  }

  /* ==========================================================================
     PROJECT
     ========================================================================== */
  function ProjectView(slug, { viaNext = false, viaPrev = false } = {}) {
    const p = bySlug(slug);
    if (!p || p.noPage) return HomeView();
    // next and previous move between case studies only; ongoing pitches without a page are skipped
    const cases = projects.filter((x) => !x.noPage);
    const i = cases.indexOf(p);
    const next = cases[(i + 1) % cases.length];
    const prev = cases[(i - 1 + cases.length) % cases.length];
    const lead = p.slug === 'bisff';
    const block = (b) => {
      switch (b.type) {
        case 'text': return `<p class="${lead ? 'p-lead' : 'p-text'}" data-split>${esc(b.text)}</p>`;
        case 'image': return media(b, { cls: b.contain ? 'is-contain' : '', alt: `${p.title} — case study visual`, attrs: 'data-reveal-img' });
        case 'pair': return `<div class="p-pair">${b.items.map((m) => media(m, { alt: `${p.title} — case study visual`, attrs: 'data-reveal-img' })).join('')}</div>`;
        case 'credit': return `<p class="p-credit" data-split>${esc(b.text)}</p>`;
        case 'chapter':
          return `<header class="p-chap"><p class="p-chap__label" data-fade><span>${esc(b.num)}</span>${esc(b.label)}</p><h2 class="p-chap__title" data-split>${esc(b.title)}</h2></header>`;
        case 'stats':
          return `<dl class="p-stats" data-fade>${b.items.map(([v, k]) => `<div><dt>${esc(v)}</dt><dd>${esc(k)}</dd></div>`).join('')}</dl>`;
        case 'cards':
          return `<div class="p-cards" data-fade>${b.items.map(([t, d], n) => `<div class="p-card">${avatar(n).replace('drawer__avatar', 'p-card__avatar')}<span>${String(n + 1).padStart(2, '0')}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>`;
        case 'sub':
          return `<div class="p-sub"><h3 data-split>${esc(b.title)}</h3><p data-split>${esc(b.text)}</p></div>`;
        // A screen recording. Until the .mp4 exists the slot shows its poster screenshot.
        case 'video':
          return `<div class="media p-video" style="--ar:${b.w}/${b.h}" data-reveal-img><img src="${esc(b.poster)}" alt="${esc(p.title)} — ${esc(b.alt || 'screen recording')}" loading="lazy" decoding="async"><video muted loop playsinline preload="none" poster="${esc(b.poster)}" data-src="${esc(b.src)}"></video></div>`;
        case 'composition':
          return `<div class="comp" style="--ar:${b.w}/${b.h};--cw:${b.w};--ch:${b.h}">${b.items.map((it) => {
            const pos = `--x:${it.x};--y:${it.y};--w:${it.w}`;
            return it.kind === 'text'
              ? `<p class="comp__${it.cls}" style="${pos}" data-split>${it.text.split('<br>').map(esc).join('<br>')}</p>`
              : `<div style="${pos}" data-fade>${media(it, { cls: 'is-contain', alt: '' })}</div>`;
          }).join('')}</div>`;
      }
      return '';
    };
    const el = h(`
      <div class="view" data-view="project">
        <div class="p-wrap">
        <article class="project" aria-labelledby="p-title">
          <div class="p-prev" aria-label="Previous project">
            <a class="p-prev__label" href="#work-${prev.slug}">Scroll up to previous project <b>${esc(prev.title)}</b></a>
            <i class="p-prev__line" aria-hidden="true"><i></i></i>
          </div>
          <header class="p-head">
            <h1 class="p-title" id="p-title" data-split>${esc(p.title)}</h1>
            ${p.slug === 'bisff' ? `<p class="p-full" data-split>${esc(p.fullName)}</p>` : ''}
            <p class="p-intro" data-split>${esc(p.intro)}</p>
          </header>
          <dl class="p-meta" style="--cols:${p.meta.length}" data-fade>
            ${p.meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v === 'Live'
              ? (p.liveUrl ? `<a class="live" href="${esc(p.liveUrl)}" target="_blank" rel="noopener">Live <span aria-hidden="true">↗</span></a>` : '<span class="live">Live <span aria-hidden="true">↗</span></span>')
              : esc(v)}</dd></div>`).join('')}
          </dl>
          ${media(p.hero, { cls: 'p-hero', alt: `${p.title} — hero`, attrs: 'data-hero data-reveal-img', lazy: false })}
          <div class="p-body">${p.blocks.map(block).join('')}</div>
        </article>
        <section class="p-next" aria-label="Next project"><a class="p-next__link" href="#work-${next.slug}">Next project: ${esc(next.title)}</a></section>
        </div>
        <div class="p-dim" aria-hidden="true"></div>
        <div class="p-rail" aria-hidden="true">
          <div class="p-rail__track"><i class="p-rail__fill"></i><i class="p-rail__tick p-rail__tick--next"></i></div>
          <div class="p-rail__dot"><i></i><p class="p-rail__label"><span class="p-rail__n">00</span><span class="p-rail__t">Overview</span></p></div>
        </div>
      </div>`);
    const heroSlot = $('[data-hero]', el);
    const heroImg = $('img', heroSlot);
    // Section rail, left edge: the line fills as you read, a dot rides its end, and the label beside it names the
    // chapter you are in. Each chapter gets a tick where it starts on the page.
    const progress = $('.p-rail', el);
    const railTrack = $('.p-rail__track', progress), railFill = $('.p-rail__fill', progress), railDot = $('.p-rail__dot', progress);
    const railN = $('.p-rail__n', progress), railT = $('.p-rail__t', progress), railLabel = $('.p-rail__label', progress);
    const chapters = $$('.p-chap', el).map((c) => ({ el: c, num: $('.p-chap__label span', c)?.textContent || '', name: ($('.p-chap__label', c)?.textContent || '').replace(/^\d+/, '').trim() }));
    let railMarks = []; // chapter start positions as 0..1 of the reading range
    let railCur = -2, railIdle = null;
    const count = { textContent: '' }; // kept so the hand-over code below stays unchanged
    function railMeasure(st) {
      railTrack.querySelectorAll('.p-rail__tick:not(.p-rail__tick--next)').forEach((t) => t.remove());
      const range = Math.max(1, st.end - st.start);
      railMarks = chapters.map((c) => {
        const y = c.el.getBoundingClientRect().top + window.scrollY - innerHeight * 0.5; // a chapter counts once its title reaches mid-screen
        return Math.min(1, Math.max(0, (y - st.start) / range));
      });
      railMarks.forEach((m) => { const t = document.createElement('i'); t.className = 'p-rail__tick'; t.style.top = `${m * READ * 100}%`; railTrack.append(t); });
    }
    const READ = 0.86; // share of the rail for reading; the rest is the run-up to the next project
    let railNext = false;
    function railAt(r) { railFill.style.transform = `scaleY(${r})`; railDot.style.top = `${r * 100}%`; }
    // past the end: the line carries on into the next-project zone and the label names what comes next
    function setNext(q) {
      if (q <= 0.001) { if (railNext) { railNext = false; railCur = -2; progress.classList.remove('is-next'); setProgress(1); } return; }
      if (!railNext) {
        railNext = true; progress.classList.add('is-next');
        railN.textContent = 'Next'; railT.textContent = next.title;
        railLabel.classList.remove('is-swap'); void railLabel.offsetWidth; railLabel.classList.add('is-swap');
      }
      railAt(READ + (1 - READ) * q);
      railLabel.classList.add('is-on'); clearTimeout(railIdle);
    }
    function setProgress(k) {
      if (railNext) return;
      railAt(k * READ);
      let cur = -1;
      railMarks.forEach((m, i) => { if (k >= m - 0.001) cur = i; });
      if (cur !== railCur) {
        railCur = cur;
        const c = chapters[cur];
        railN.textContent = c ? c.num : '00';
        railT.textContent = c ? c.name : 'Overview';
        railLabel.classList.remove('is-swap'); void railLabel.offsetWidth; railLabel.classList.add('is-swap');
      }
      // the label shows while you move and steps back when you stop, so it never sits on the content for long
      railLabel.classList.add('is-on');
      clearTimeout(railIdle); railIdle = setTimeout(() => railLabel.classList.remove('is-on'), 1400);
    }
    const dim = $('.p-dim', el);

    const prevFill = $('.p-prev__line i', el);
    const prevBar = $('.p-prev', el);
    let offPull = null;
    const wrap = $('.p-wrap', el);
    let leaving = false;
    let ctx;
    return {
      el,
      route: 'project',
      project: p,
      leaveTarget: wrap, // the pinned last screen is what gets pushed away
      enter() {
        if (!(viaNext || viaPrev) || reduce) return;
        // arriving from the previous project: the hero comes in blurred and large, then focuses
        heroSlot.dataset.revealed = '1';
        gsap.set(heroSlot, { clipPath: 'inset(0% 0% 0% 0%)' });
        gsap.fromTo(heroImg, { filter: 'blur(28px)', scale: 1.3 }, { filter: 'blur(0px)', scale: 1, duration: 2, ease: 'power3.out', delay: 0.55 });
      },
      init() {
        // pinned to the screen, so they must not move with the page when it is pushed away
        document.body.append(dim, progress);
        ctx = gsap.context(() => {
          setupReveals(el);
          // screen recordings load as they come near, play while on screen, and replace their poster once they can play
          $$('.p-video video', el).forEach((v) => {
            v.addEventListener('loadeddata', () => v.parentElement.classList.add('has-video'), { once: true });
            ScrollTrigger.create({
              trigger: v.parentElement, start: 'top 120%', end: 'bottom -20%',
              onToggle: (s) => {
                if (s.isActive && !v.src) v.src = v.dataset.src;
                if (s.isActive) v.play().catch(() => {}); else v.pause();
              }
            });
          });
          // hero parallax
          gsap.fromTo(heroImg, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: heroSlot, start: 'top bottom', end: 'bottom top', scrub: true } });
          // reading progress, bottom-left (as on the reference)
          ScrollTrigger.create({
            trigger: wrap, start: 'top top', end: 'bottom bottom',
            onRefresh: (st) => { railMeasure(st); setProgress(st.progress); },
            onUpdate: (st) => {
              if (leaving) return;
              setProgress(st.progress);
            },
          });
          // keep scrolling past the end: the last screen holds still, the line fills, the page dims,
          // then the next project takes over
          const setDim = gsap.quickSetter(dim, 'opacity');
          ScrollTrigger.create({
            trigger: wrap, start: 'bottom bottom', end: () => `+=${innerHeight * 0.9}`,
            pin: true, invalidateOnRefresh: true,
            onUpdate: (st) => {
              setNext(st.progress);
              setDim(st.progress * 0.42);
              if (st.progress > 0.985 && !leaving) {
                leaving = true;
                count.textContent = '0%';
                setProgress(0);
                pendingNext = true;
                location.hash = `work-${next.slug}`;
              }
            },
          });
        }, el);
        // the same at the top, in reverse: at the very top, keep scrolling up and the line above the title fills,
        // the page dims and gives a little, then the previous project comes down from above
        if (!reduce) {
          const NEED = () => innerHeight * 0.9;
          const setPrevLine = gsap.quickSetter(prevFill, 'scaleX');
          const setDim = gsap.quickSetter(dim, 'opacity');
          let pull = 0, idle = null, armedAt = performance.now() + 1400, touchY = null;
          const atTop = () => (lenis ? lenis.scroll : window.scrollY) <= 1;
          const show = () => {
            const k = Math.min(1, pull / NEED());
            setPrevLine(k); setDim(k * 0.42);
            gsap.set(wrap, { y: k * 46 });
            // the label only appears once you pull back at the top, as the page starts to dim
            prevBar.style.opacity = Math.min(1, k * 5);
            prevBar.classList.toggle('is-on', k > 0.02);
          };
          const relax = () => { clearTimeout(idle); idle = setTimeout(() => {
            if (leaving) return;
            gsap.to({ v: pull }, { v: 0, duration: 0.6, ease: 'power3.out', onUpdate() { pull = this.targets()[0].v; show(); } });
          }, 260); };
          const add = (d) => {
            if (leaving || busy) return;
            if (!atTop()) { if (pull) { pull = 0; show(); } armedAt = performance.now() + 350; return; }
            if (performance.now() < armedAt) return; // momentum from scrolling up the page doesn't count
            pull = Math.max(0, pull + d);
            show(); relax();
            if (pull >= NEED()) {
              leaving = true; clearTimeout(idle);
              count.textContent = '0%'; setProgress(0);
              pendingPrev = true;
              location.hash = `work-${prev.slug}`;
            }
          };
          const onWheel = (e) => { if (e.deltaY < 0) add(-e.deltaY); else if (pull) { pull = Math.max(0, pull - e.deltaY * 2); show(); } };
          const onTouchStart = (e) => { touchY = e.touches[0].clientY; };
          const onTouchMove = (e) => { if (touchY == null) return; const y = e.touches[0].clientY; add((y - touchY) * 1.6); touchY = y; };
          const onTouchEnd = () => { touchY = null; };
          const onKey = (e) => { if (['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey)) add(innerHeight * 0.3); };
          addEventListener('wheel', onWheel, { passive: true });
          addEventListener('touchstart', onTouchStart, { passive: true });
          addEventListener('touchmove', onTouchMove, { passive: true });
          addEventListener('touchend', onTouchEnd, { passive: true });
          addEventListener('keydown', onKey);
          offPull = () => {
            clearTimeout(idle);
            removeEventListener('wheel', onWheel); removeEventListener('touchstart', onTouchStart);
            removeEventListener('touchmove', onTouchMove); removeEventListener('touchend', onTouchEnd); removeEventListener('keydown', onKey);
          };
        }
        setDrawer(p);
      },
      destroy() { offPull?.(); ctx?.revert(); dim.remove(); progress.remove(); setDrawer(null); },
    };
  }

  /* ==========================================================================
     ABOUT
     ========================================================================== */
  // "at Zescorp, Bengaluru" → company in bold, as in the About design
  const company = (at) => {
    const m = at.match(/^(at\s+)?([^,]+)(,.*)?$/);
    return m ? `${m[1] || ''}<b>${esc(m[2])}</b>${esc(m[3] || '')}` : esc(at);
  };
  // Experience as a career story: each role parsed into company, city and a start/end month,
  // so the timeline bar can size every segment by how long it lasted.
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const toMonth = (s, now) => {
    if (/present/i.test(s)) return now;
    const m = s.trim().match(/^([a-z]{3})\w*\s+(\d{4})$/i);
    return m ? +m[2] * 12 + MONTHS.indexOf(m[1].toLowerCase()) : now;
  };
  const xpJobs = (() => {
    const d = new Date(), now = d.getFullYear() * 12 + d.getMonth();
    return (window.ABOUT.experience || []).map((j) => {
      const m = j.at.match(/^(at\s+)?([^,]+)(?:,\s*(.*))?$/) || [];
      const [a, b] = j.when.split(/\s*[\u2013\u2014-]\s*/);
      return { ...j, co: (m[2] || j.at).trim(), city: (m[3] || '').trim(), start: toMonth(a, now), end: toMonth(b || a, now) + 1, interior: /interior/i.test(j.role) };
    });
  })();
  function xpTimeline() {
    if (!xpJobs.length) return '';
    const t0 = Math.min(...xpJobs.map((j) => j.start)), t1 = Math.max(...xpJobs.map((j) => j.end));
    const pct = (m) => ((m - t0) / (t1 - t0)) * 100;
    const pivot = Math.min(...xpJobs.filter((j) => !j.interior).map((j) => j.start));
    const yrs = Math.floor((t1 - t0) / 12);
    return `
      <header class="xp__head">
        <h2 id="exp-h" class="xp__label">Experience</h2>
        <p class="xp__sum" data-split>${yrs}+ years. ${xpJobs.length} roles. From rooms to screens.</p>
      </header>
`;
  }
  // core skills, from the CV; the bracketed detail is shown as a quieter note
  const skills = [
    ['UI/UX Design', 'Interfaces that are clear first and beautiful second, from first sketch to shipped screen.'],
    ['Product Design', 'Framing the problem, shaping the solution and owning it through launch.'],
    ['User-Centered Design', 'Decisions grounded in research, interviews and real behaviour.'],
    ['Information Architecture', 'Structuring content and navigation so people find things first time.'],
    ['Wireframing & User Flows', 'Mapping every path, edge case and dead end before pixels.'],
    ['Interaction Design', 'Micro-interactions and feedback that make an interface feel alive.'],
    ['Interactive Prototyping', 'Clickable flows to test ideas with users and sell them to stakeholders.'],
    ['High-Fidelity UI Design', 'Pixel-precise screens, states and motion, ready to build.'],
    ['Design Systems', 'Tokens, components and documentation that scale across products.'],
    ['Responsive Web & Mobile', 'Layouts that work from a 320px phone to a wide desktop.'],
    ['Usability & QA Testing', 'Testing with users, then checking the build matches the design.'],
    ['Brand Identity & Visual Design', 'Logos, type, colour and the visual language that ties them together.'],
    ['Cross-functional Collaboration', 'Working in sprints with product, engineering and marketing.'],
    ['Design Rationale & Presenting', 'Explaining the why behind every decision, to boards and clients.'],
    ['AI-native Workflow', 'AI to explore, prototype and produce faster, with the thinking kept human.'],
  ];
  // tools, grouped by what they are used for
  const toolGroups = [
    ['design', ['Figma', 'Photoshop', 'Illustrator', 'AutoCAD']],
    ['prototype & build', ['Figma prototyping', 'Lovable', 'Claude Code']],
    ['ai', ['Claude', 'ChatGPT', 'Gemini', 'Freepik'], 'To move faster, never to think less.'],
  ];
  // the tool kit, with what each one is actually used for (from the CV)
  const toolkit = [
    ['Figma', 'Flows, wireframes, UI, prototypes and dev handoff'],
    ['Claude', 'Research, analysis and the publishing prompt behind .elsewhere'],
    ['ChatGPT', 'Copy exploration and campaign ideas'],
    ['Gemini', 'Campaign visuals and video assets'],
    ['Freepik', 'AI imagery: 90% of campaign visuals at The Data Duck'],
    ['Lovable', 'No-code prototypes for testing before development'],
    ['AutoCAD', 'Where it started: 2D drawings for interiors']
  ];
  // education and achievements as one timeline, newest first
  const milestones = (() => {
    const A = window.ABOUT, yr = (w) => (String(w).match(/\d{4}(?!.*\d{4})/) || [''])[0];
    return [
      ...(A.achievements || []).map((a) => ({ award: true, title: a.title, detail: a.detail, where: String(a.when).replace(/\s*·\s*\d{4}$/, ''), year: yr(a.when) })),
      ...(A.education || []).map((e) => ({ award: false, title: e.title, detail: e.detail.split(',')[0], where: e.detail.split(',').slice(1).join(',').trim(), year: String(e.when).replace(/^(\d{4})\s*[-\u2013]\s*\d{2}(\d{2})$/, '$1\u2013$2') }))
    ].sort((a, b) => parseInt(String(b.year).slice(-4)) - parseInt(String(a.year).slice(-4)));
  })();
  function AboutView() {
    const words = (list) => `<div class="marquee__words">${list.map((b) => `<span>${esc(b)}</span>`).join('')}</div>`;
    const el = h(`
      <div class="view" data-view="about">
        <article class="about">
          <header class="a-intro" data-rail="About">
            <h1 class="a-intro__name" data-split>${esc(A.name)}</h1>
            <p class="a-intro__lede" data-split>${esc(A.lede)}</p>
          </header>
          <div class="a-story">
            ${media(aboutMedia.portrait, { alt: 'Portrait of Isha Salvi', attrs: 'data-reveal-img', lazy: false })}
            <div class="a-story__copy">${A.story.map((t) => `<p data-split>${esc(t)}</p>`).join('')}</div>
          </div>

          <section class="a-brands" aria-label="Brands I have worked with" data-rail="Brands">
            <h2 class="a-label">Brands I have worked with</h2>
            <div class="marquee" data-strip="brands"><div class="marquee__track">${words(A.brands)}${words(A.brands)}</div></div>
          </section>

          <section class="services" aria-label="Services" data-rail="Services">
            ${A.services.map((s, i) => `
              <div class="svc" style="z-index:${i + 1}">
                <div class="svc__grid" aria-hidden="true"><i class="v1"></i><i class="v2"></i><i class="h1"></i><i class="h2"></i></div>
                <p class="svc__label">Services</p>
                <h2 class="svc__title" data-split>${esc(s.title).replace(/\n/g, "<br>")}</h2>
                <ul class="svc__list">${s.items.map((t) => `<li data-split>${esc(t)}</li>`).join('')}</ul>
                <div class="svc__art" aria-hidden="true"><i style="-webkit-mask-image:url('assets/services/svc-${['product', 'ai', 'brand'][i % 3]}.png');mask-image:url('assets/services/svc-${['product', 'ai', 'brand'][i % 3]}.png')"></i></div>
                <i class="svc__shade" aria-hidden="true"></i>
              </div>`).join('')}
          </section>

          <section class="xp" aria-labelledby="exp-h" data-rail="Experience">
            ${xpTimeline()}
            <ol class="xp__list">${xpJobs.map((j, n) => `
              <li class="xp__job" data-i="${n}" data-fade>
                <div class="xp__top">
                  <h3 class="xp__role">${esc(j.role)}<span class="xp__when">${esc(j.when)}</span></h3>
                  <p class="xp__at">[<b>${esc(j.co)}</b> \u00b7 ${esc(j.city)}]</p>
                </div>
                <p class="xp__line2">${esc(j.summary || j.points[0])}</p>
              </li>`).join('')}</ol>
          </section>

          <section class="sk" aria-labelledby="sk-h" data-rail="Skills & Tools">
            <h2 id="sk-h" class="sr-only">Skills and tools</h2>
            <div class="sk__top">
              <div class="sk__intro">
                <h3 class="sk__h">Skills</h3>
                <div class="sk__side">
                  <p class="sk__note" aria-live="polite">Everything I bring to a product, in one jar. Point at a skill to see what it means.</p>
                  <div class="steal" data-game>
                    <p class="steal__how"><b>Steal my skills.</b> Pick up the jar and shake it until the lid pops, and see how many you can shake out onto the tray.</p>
                    <div class="steal__bar">
                      <button type="button" class="steal__btn" data-shake>${reduce ? 'Tip one out' : 'Shake the jar'}</button>
                      <p class="steal__count"><b data-stolen>0</b> / ${skills.length} shaken out</p>
                    </div>
                    <div class="steal__end" hidden>
                      <p class="steal__win">Nice, you shook out all ${skills.length}. Now hire the original.</p>
                      <div class="steal__bar">
                        <a class="steal__btn is-solid" href="mailto:${A.email}">Email me \u2197</a>
                        <button type="button" class="steal__btn" data-refill>Put them back</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="sk__stage" data-stage>
                <div class="jar" data-jar>
                  <svg class="jar__glass" viewBox="0 0 850 900" aria-hidden="true">
                    <path class="jar__body" d="M232 213 C232 246 155 262 155 332 V760 Q155 880 280 880 H565 Q690 880 690 760 V332 C690 262 613 246 613 213 Z" />
                    <rect class="jar__neck" x="230" y="183" width="385" height="30" />
                    <path class="jar__shine" d="M190 380 V560" />
                  </svg>
                </div>
                <div class="sk__tray" aria-hidden="true"></div>
                <ul class="jar__chips">${skills.map(([name, note]) => `<li class="sk__chip" tabindex="0" data-note="${esc(note)}">${esc(name)}</li>`).join('')}</ul>
                <div class="jar jar--front" data-jar-front aria-hidden="true">
                  <svg class="jar__glass" viewBox="0 0 850 900" aria-hidden="true">
                    <path class="jar__body" d="M232 213 C232 246 155 262 155 332 V760 Q155 880 280 880 H565 Q690 880 690 760 V332 C690 262 613 246 613 213 Z" />
                    <rect class="jar__neck" x="230" y="183" width="385" height="30" />
                    <g class="jar__lid"><rect x="205" y="97" width="435" height="86" rx="20" /></g>
                  </svg>
                </div>
              </div>
            </div>
            <div class="tools">
              <h3 class="sk__h">Tools</h3>
              <div class="tools__groups">${toolGroups.map(([g, items, aside]) => `
                <div class="tools__group">
                  <p class="sk__group">${esc(g)}</p>
                  <ul class="sk__chips">${items.map((t) => `<li class="sk__chip is-tool">${esc(t)}</li>`).join('')}</ul>
                  ${aside ? `<p class="sk__aside">${esc(aside)}</p>` : ''}
                </div>`).join('')}</div>
            </div>
          </section>

          <section class="ms" aria-labelledby="ms-h" data-rail="Education & Awards">
            <h2 id="ms-h" class="sr-only">Education and achievements</h2>
            <ol class="ms__list">${milestones.map((m) => `
              <li class="ms__item" data-fade>
                <span class="ms__year">${esc(m.year)}</span>
                <span class="ms__title">${m.award && m.year !== '2022' ? '<img class="ms__icon" src="assets/about/trophy.png" alt="" aria-hidden="true">' : ''}${esc(m.title)}</span>
                <span class="ms__detail">${esc(m.detail)}<em>${esc(m.where)}</em></span>
                <span class="ms__tag">${m.award ? 'Award' : 'Education'}</span>
              </li>`).join('')}</ol>
          </section>

          <section class="a-testi" aria-label="Testimonials" data-rail="Testimonials">
            <div class="testi-pin">
              <header class="testi__head"><h2 class="sr-only">Testimonials</h2>
                <span class="testi__count"><b data-testi-n>01</b> / ${String(A.testimonials.length).padStart(2, '0')}</span></header>
              <div class="testi-track">
                ${A.testimonials.map((t, n) => `
                  <figure class="testi">
                    <span class="testi__n">${String(n + 1).padStart(2, '0')}</span>
                    <blockquote>${esc(t.quote)}</blockquote>
                    <figcaption><i class="testi__av" aria-hidden="true">${esc(t.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(''))}</i><span><b>${esc(t.name)}</b>${esc(t.role)}</span></figcaption>
                  </figure>`).join('')}
              </div>
              <div class="testi__bar" aria-hidden="true"><i></i></div>
            </div>
          </section>

          <footer class="a-foot" data-rail="Contact">
            <p class="a-foot__ask" data-split>Have a product that needs to feel simple?</p>
            <div class="a-foot__row">
              <a class="a-foot__mail" href="mailto:${A.email}">${A.email}<span aria-hidden="true">\u2197</span></a>
              <button type="button" class="a-foot__copy" data-copy="${A.email}">Copy</button>
            </div>
          </footer>
        </article>
        <div class="p-rail a-rail" aria-hidden="true">
          <div class="p-rail__track"><i class="p-rail__fill"></i></div>
          <div class="p-rail__dot"><i></i><p class="p-rail__label"><span class="p-rail__n">01</span><span class="p-rail__t">About</span></p></div>
        </div>
      </div>`);

    // brand logos, each at a height that suits its shape, running as one continuous band
    if (aboutMedia.logos?.length) {
      const set = aboutMedia.logos.map((l) => `<img class="brand" src="${l.src}" alt="${esc(l.label)}" width="${l.w}" height="${l.h}" style="height:${l.dh}px" loading="lazy" decoding="async">`).join('');
      $('[data-strip="brands"] .marquee__track', el).innerHTML = `<div class="brands">${set}</div><div class="brands" aria-hidden="true">${set}</div>`;
    }

    // copy the email with one click
    const copy = $('.a-foot__copy', el);
    copy && copy.addEventListener('click', () => {
      navigator.clipboard?.writeText(copy.dataset.copy).then(() => {
        copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
      }).catch(() => {});
    });

    // experience rows: hovering a role lights its tick on the timeline, and the other way round
    const segs = $$('.xp__seg', el);
    $$('.xp__job', el).forEach((job) => {
      const seg = segs.find((g) => g.dataset.i === job.dataset.i);
      const lit = (on) => { job.classList.toggle('is-lit', on); seg && seg.classList.toggle('is-lit', on); };
      job.addEventListener('pointerenter', () => lit(true));
      job.addEventListener('pointerleave', () => lit(false));
      seg && seg.addEventListener('pointerenter', () => lit(true));
      seg && seg.addEventListener('pointerleave', () => lit(false));
    });

    // skills: the line beside the jar follows the skill you point at
    const skNote = $('.sk__note', el), skIdle = skNote.textContent;
    $$('.sk__chip[data-note]', el).forEach((c) => {
      const show = () => { skNote.textContent = `${c.textContent}: ${c.dataset.note}`; };
      c.addEventListener('pointerenter', show); c.addEventListener('focus', show);
      c.addEventListener('pointerleave', () => { skNote.textContent = skIdle; });
    });

    // the skills jar: one physics world (Matter.js) holds the jar and a tray floor that runs the width of the screen.
    // Skills drop into the jar through a funnel and pile up. The jar is a kinematic body: pick it up and shake it
    // (drag, the button or a real phone shake) and its walls push the skills about. Shake hard enough and the lid
    // pops, skills fly out, land on the tray and stack, and each one is counted. All out: a win panel, then a refill.
    const stageEl = $('[data-stage]', el), jarEl = $('[data-jar]', el), chips = $$('.jar__chips .sk__chip', el);
    // The front half of the jar (rim, neck and lid) sits above the skills, so they read as going inside; it mirrors the back half.
    const jarFront = $('[data-jar-front]', el);
    if (jarFront) {
      const mirror = () => { jarFront.className = jarEl.className + ' jar--front'; jarFront.style.translate = jarEl.style.translate; };
      new MutationObserver(mirror).observe(jarEl, { attributes: true, attributeFilter: ['class', 'style'] }); mirror();
    }
    const countEl = $('[data-stolen]', el), endEl = $('.steal__end', el), shakeBtn = $('[data-shake]', el);
    let jar = null, outN = 0, endTimer = null;
    function makeJar() {
      const M = window.Matter; if (!M || !stageEl) return null;
      const { Engine, Bodies, Body, Composite } = M;
      jarEl.style.translate = '';
      const SW = stageEl.clientWidth, SH = stageEl.clientHeight;
      const jb = jarEl.getBoundingClientRect(), sb = stageEl.getBoundingClientRect();
      const jx = jb.left - sb.left, jy = jb.top - sb.top, sx = jb.width / 850, sy = jb.height / 900;
      const P = (x, y) => ({ x: jx + x * sx, y: jy + y * sy });
      const engine = Engine.create({ gravity: { y: 1.15 } });
      const T = 26, STEP = 1000 / 60;
      const Lx = P(155, 0).x, Rx = P(690, 0).x, neckY = P(0, 222).y, botY = P(0, 880).y, cx = P(422, 0).x, bellyY = P(0, 340).y;
      const m0 = P(240, 0).x, m1 = P(605, 0).x, mouthY = P(0, 260).y;
      const seg = (a, b2) => { const A1 = P(a[0], a[1]), B1 = P(b2[0], b2[1]), dx = B1.x - A1.x, dy = B1.y - A1.y;
        const q = Bodies.rectangle((A1.x + B1.x) / 2, (A1.y + B1.y) / 2, Math.hypot(dx, dy) + T / 2, T, { isStatic: true, angle: Math.atan2(dy, dx), friction: 0.1 });
        q.base = { x: q.position.x, y: q.position.y }; return q; };
      const parts = [
        seg([232, 213], [155, 332]), seg([613, 213], [690, 332]),          // shoulders
        seg([155, 332], [155, 770]), seg([690, 332], [690, 770]),          // sides
        seg([155, 770], [200, 850]), seg([200, 850], [282, 880]),          // rounded bottom corners
        seg([690, 770], [645, 850]), seg([645, 850], [563, 880]),
        seg([270, 880], [575, 880]),                                       // bottom
      ];
      // a funnel over the mouth while the jar fills, so every skill goes in; it comes off when the lid closes
      const funnel = [seg([238, 205], [40, -60]), seg([607, 205], [805, -60])];
      let funnelOn = false;
      const setFunnel = (on) => { if (on === funnelOn) return; funnelOn = on; funnel.forEach((q) => (on ? Composite.add(engine.world, q) : Composite.remove(engine.world, q))); };
      Composite.add(engine.world, parts.concat([
        Bodies.rectangle(SW / 2, SH - 2 + 30, SW * 2, 60, { isStatic: true }),
        Bodies.rectangle(-30, SH / 2, 60, SH * 6, { isStatic: true }),
        Bodies.rectangle(SW + 30, SH / 2, 60, SH * 6, { isStatic: true }),
      ]));
      const bodies = chips.map((c) => {
        const body = Bodies.rectangle(cx, -60, c.offsetWidth, c.offsetHeight, { restitution: 0.12, friction: 0.22, frictionAir: 0.014 });
        body.el = c; body.w = c.offsetWidth; body.h = c.offsetHeight; return body;
      });
      const upright = (ang) => { let x = ang % Math.PI; if (x > Math.PI / 2) x -= Math.PI; if (x < -Math.PI / 2) x += Math.PI; return x; };
      let raf = 0, last = 0, acc = 0, running = false, closed = false, lid = null, energy = 0, popAt = 0, started = false, gameOn = false, held = false;
      const pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }; // the jar's offset from where it stands
      const inBox = (b) => b.position.x > Lx + pos.x && b.position.x < Rx + pos.x && b.position.y < botY + pos.y + 6;
      const reach = (b) => (Math.abs(Math.sin(b.angle)) * b.w + Math.abs(Math.cos(b.angle)) * b.h) / 2; // half its height as it lies
      const settled = (b) => inBox(b) && b.position.y - reach(b) > neckY + pos.y - 2;
      const live = () => bodies.filter((b) => b.added && !b.out);
      const inJar = () => live().filter((b) => !b.busy && settled(b));
      const speed = (b) => Math.hypot(b.velocity.x, b.velocity.y);
      function close() {
        if (closed) return; closed = true; gameOn = true; setFunnel(false);
        const q = P(422, 205); lid = Bodies.rectangle(q.x + pos.x, q.y + pos.y, 400 * sx, 28, { isStatic: true }); lid.base = { x: q.x, y: q.y };
        Composite.add(engine.world, lid); jarEl.classList.remove('is-popped'); jarEl.classList.add('is-closed');
      }
      function open(popped) { if (lid) Composite.remove(engine.world, lid); lid = null; closed = false; jarEl.classList.remove('is-closed'); jarEl.classList.toggle('is-popped', !!popped); }
      // the lid goes back on once everything still in the jar has settled and nothing is in the air
      function waitClose() {
        let tries = 0;
        const go = () => {
          if (closed) return;
          tries++;
          const L = live();
          if (bodies.some((b) => !b.added) || L.some((b) => b.busy)) { setTimeout(go, 250); return; }
          let ok = true;
          L.forEach((b) => {
            if (settled(b)) { if (speed(b) > 0.7) ok = false; return; }
            ok = false;
            if (tries > 10 && speed(b) < 0.4) {
              if (inBox(b) || !gameOn) { const flat = b.w < (m1 - m0) * 0.85; Body.setPosition(b, { x: cx + pos.x, y: mouthY + pos.y + (flat ? -b.h : b.w / 2) }); Body.setAngle(b, flat ? 0 : Math.PI / 2); Body.setVelocity(b, { x: 0, y: 2 }); }
              else Body.setVelocity(b, { x: (b.position.x < cx + pos.x ? -1 : 1) * 4, y: -1 }); // resting on the outside of the glass: slide it off
            }
          });
          if (ok) close(); else setTimeout(go, 250);
        };
        setTimeout(go, 400);
      }
      const paint = () => {
        jarEl.style.translate = `${pos.x.toFixed(2)}px ${pos.y.toFixed(2)}px`;
        bodies.forEach((b) => { if (!b.added) return;
          b.el.style.transform = `translate3d(${(b.position.x - b.w / 2).toFixed(2)}px, ${(b.position.y - b.h / 2).toFixed(2)}px, 0) rotate(${upright(b.angle).toFixed(4)}rad)`; b.el.style.opacity = 1; });
      };
      const outside = (b) => (b.position.x < Lx + pos.x - 6 || b.position.x > Rx + pos.x + 6) && b.position.y > bellyY + pos.y;
      const tally = () => gameOn && bodies.forEach((b) => { if (b.added && !b.out && !b.busy && outside(b)) { b.out = true; b.el.classList.add('is-out'); onOut(b.el); } });
      // one fixed physics step: ease the jar toward where it is being held (or spring it home), carry its walls
      // along as moving bodies so they push the skills, then advance the world
      function step() {
        const px = pos.x, py = pos.y;
        if (held) { pos.x += (tgt.x - pos.x) * 0.28; pos.y += (tgt.y - pos.y) * 0.28; vel.x = pos.x - px; vel.y = pos.y - py; }
        else {
          vel.x = (vel.x + (tgt.x - pos.x) * 0.09) * 0.8; vel.y = (vel.y + (tgt.y - pos.y) * 0.09) * 0.8;
          pos.x += vel.x; pos.y += vel.y;
          if (pos.y > 0) { pos.y = 0; vel.y = 0; }
          if (Math.abs(vel.x) + Math.abs(vel.y) < 0.01 && Math.abs(tgt.x - pos.x) + Math.abs(tgt.y - pos.y) < 0.05) { pos.x = tgt.x; pos.y = tgt.y; }
        }
        // the jar never moves faster than the skills inside can follow
        let dx = pos.x - px, dy = pos.y - py; const dm = Math.hypot(dx, dy), MAXV = 22;
        if (dm > MAXV) { dx *= MAXV / dm; dy *= MAXV / dm; pos.x = px + dx; pos.y = py + dy; vel.x = dx; vel.y = dy; }
        const movers = lid ? parts.concat(funnelOn ? funnel : [], lid) : parts.concat(funnelOn ? funnel : []);
        movers.forEach((q) => { Body.setPosition(q, { x: q.base.x + pos.x, y: q.base.y + pos.y }); q.positionPrev.x = q.position.x - dx; q.positionPrev.y = q.position.y - dy; });
        // skills lying on the tray make room when the jar is lifted, so it never comes down on top of them
        if (pos.y < -6) bodies.forEach((b) => {
          if (!b.out || b.position.y < botY + pos.y) return;
          const half = b.w / 2 + 14;
          for (const ox of [pos.x, 0]) if (b.position.x > Lx + ox - half && b.position.x < Rx + ox + half) { Body.setVelocity(b, { x: (b.position.x < cx + ox ? -1 : 1) * 5, y: b.velocity.y }); break; }
        });
        Engine.update(engine, STEP); tally();
        energy = energy * 0.94 + Math.hypot(dx, dy);
      }
      const loop = (now) => {
        acc += Math.min(60, now - (last || now)); last = now;
        let n = 0; while (acc >= STEP && n < 3) { step(); acc -= STEP; n++; }
        if (n) paint();
        if (closed && energy > 150 && now - popAt > 1500 && inJar().length) pop(now);
        raf = requestAnimationFrame(loop);
      };
      // the lid pops: one or two skills slide up to the mouth, then are thrown out; gravity does the rest
      function eject(b) {
        b.busy = true; Composite.remove(engine.world, b);
        const side = Math.random() < 0.5 ? -1 : 1, x0 = b.position.x - pos.x, y0 = b.position.y - pos.y, a0 = b.angle;
        const a1 = Math.round((a0 - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2, st = { t: 0 };
        gsap.to(st, { t: 1, duration: 0.42, ease: 'power2.in',
          onUpdate() { Body.setPosition(b, { x: x0 + (cx + side * 16 - x0) * st.t + pos.x, y: y0 + (neckY - b.w / 2 - 14 - y0) * st.t + pos.y }); Body.setAngle(b, a0 + (a1 - a0) * st.t); },
          onComplete() {
            Composite.add(engine.world, b); b.busy = false;
            Body.setVelocity(b, { x: side * (4.5 + Math.random() * 5), y: -(10 + Math.random() * 4) });
            Body.setAngularVelocity(b, side * (0.04 + Math.random() * 0.08));
          } });
      }
      function pop(now) {
        // the lid jumps off just long enough for the thrown skills to get out; the rest stay sealed in
        popAt = now; energy = 0; jarEl.classList.remove('is-closed'); jarEl.classList.add('is-popped');
        const pool = inJar().sort((p, q) => p.position.y - q.position.y), n = Math.min(pool.length, Math.random() < 0.45 ? 2 : 1);
        pool.slice(0, n).forEach((b, k) => setTimeout(() => eject(b), 80 + k * 300));
        setTimeout(() => { if (closed) { jarEl.classList.remove('is-popped'); jarEl.classList.add('is-closed'); } }, 900 + n * 300);
      }
      function fill() {
        gameOn = false; open(false); setFunnel(true);
        bodies.forEach((b) => {
          b.out = false; b.busy = false; b.el.classList.remove('is-out'); b.el.style.opacity = 0;
          if (b.added) Composite.remove(engine.world, b); b.added = false;
          Body.setPosition(b, { x: cx + pos.x + (Math.random() - 0.5) * (m1 - m0) * 0.5, y: -b.w / 2 - 20 - Math.random() * 40 });
          Body.setVelocity(b, { x: 0, y: 0 }); Body.setAngle(b, Math.PI / 2 + (Math.random() - 0.5) * 0.5); Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.04);
        });
        if (reduce) { bodies.forEach((b) => { b.added = true; Composite.add(engine.world, b); }); for (let k = 0; k < 800; k++) step(); paint(); close(); return; }
        bodies.forEach((b, i) => setTimeout(() => { b.added = true; Composite.add(engine.world, b); }, i * 130));
        setTimeout(waitClose, bodies.length * 130 + 400);
      }
      const api = {
        drop() { if (started) return; started = true; fill(); api.resume(); },
        refill() { fill(); api.resume(); },
        get started() { return started; },
        hold(on) { held = on; if (!on) { tgt.x = 0; tgt.y = 0; } },
        aim(x, y) { tgt.x = x; tgt.y = y; },
        tgt,
        tipOne() { // reduced motion: one skill is set straight down on the tray
          const pool = inJar(); if (!pool.length) return; const b = pool[Math.floor(Math.random() * pool.length)];
          Body.setPosition(b, { x: Math.random() < 0.6 ? Math.max(b.w / 2 + 10, (Lx - b.w) * Math.random() + b.w / 2) : Math.min(SW - b.w / 2 - 10, Rx + 20 + b.w / 2 + Math.random() * Math.max(0, SW - Rx - b.w - 30)), y: botY - 160 });
          Body.setVelocity(b, { x: 0, y: 0 }); Body.setAngle(b, 0);
          for (let k = 0; k < 200; k++) step(); paint();
        },
        wobble() { if (reduce || !started || held) return; inJar().forEach((b) => { Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 4, y: b.velocity.y - 1.5 - Math.random() * 2 }); }); },
        pause() { cancelAnimationFrame(raf); running = false; last = 0; },
        resume() { if (!running && started && !reduce) { running = true; raf = requestAnimationFrame(loop); } },
        destroy() { cancelAnimationFrame(raf); running = false; Engine.clear(engine); jarEl.style.translate = ''; },
      };
      return api;
    }
    function onOut() {
      outN++; countEl.textContent = outN;
      if (!reduce) gsap.fromTo(countEl, { scale: 1.6 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
      if (outN >= chips.length) { endEl.hidden = false; shakeBtn.disabled = true; clearTimeout(endTimer); endTimer = setTimeout(refill, 20000); }
    }
    function resetScore() { clearTimeout(endTimer); outN = 0; countEl.textContent = 0; endEl.hidden = true; shakeBtn.disabled = false; skNote.textContent = skIdle; }
    function refill() { resetScore(); jar?.refill(); }
    $('[data-refill]', el)?.addEventListener('click', refill);
    // the jar is measured and built when it first comes into view, and rebuilt if the layout changes width,
    // so the physics always matches the drawing
    let builtW = 0, rebuildT = null, shakeTl = null;
    function buildJar(andDrop) {
      shakeTl?.kill(); jar?.destroy(); resetScore();
      jarEl.classList.remove('is-closed', 'is-popped');
      chips.forEach((c) => { c.classList.remove('is-out'); c.style.opacity = 0; });
      jar = makeJar(); builtW = stageEl.clientWidth;
      if (jar && andDrop) jar.drop();
    }
    const stageRO = window.ResizeObserver ? new ResizeObserver(() => {
      if (!jar || Math.abs(stageEl.clientWidth - builtW) < 2) return;
      clearTimeout(rebuildT); rebuildT = setTimeout(() => buildJar(true), 250);
    }) : null;
    // pick the jar up and shake it: it follows the pointer, lifted off the tray, and settles back when let go
    let drag = null;
    // (the skills sit on top of the jar, so the press is caught on the whole stage and checked against the jar)
    stageEl?.addEventListener('pointerdown', (e) => {
      if (!jar || reduce || e.button > 0) return;
      const r = jarEl.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      shakeTl?.kill();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; stageEl.setPointerCapture(e.pointerId); jarEl.classList.add('is-drag');
      jar.hold(true); jar.aim(0, -46); e.preventDefault();
    });
    stageEl?.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) jar.aim(clamp(e.clientX - drag.x, -170, 170), clamp(e.clientY - drag.y - 46, -230, -20)); });
    const letGo = () => { if (!drag) return; drag = null; jarEl.classList.remove('is-drag'); jar?.hold(false); };
    stageEl?.addEventListener('pointerup', letGo); stageEl?.addEventListener('pointercancel', letGo);
    function bigShake() {
      if (!jar || drag) return;
      if (reduce) { jar.tipOne(); return; }
      shakeTl?.kill(); jar.hold(true);
      const t = jar.tgt;
      shakeTl = gsap.timeline({ defaults: { ease: 'sine.inOut' }, onComplete: () => jar.hold(false), onInterrupt: () => jar?.hold(false) })
        .to(t, { x: 0, y: -70, duration: 0.22, ease: 'power2.out' })
        .to(t, { x: -95, y: -84, duration: 0.11 }).to(t, { x: 95, y: -64, duration: 0.15 }).to(t, { x: -90, y: -86, duration: 0.15 })
        .to(t, { x: 85, y: -66, duration: 0.15 }).to(t, { x: -70, y: -80, duration: 0.14 }).to(t, { x: 55, y: -68, duration: 0.13 })
        .to(t, { x: 0, y: -40, duration: 0.2 });
    }
    let askedMotion = false, motionAt = 0;
    shakeBtn?.addEventListener('click', () => {
      if (!askedMotion && typeof window.DeviceMotionEvent?.requestPermission === 'function') { askedMotion = true; DeviceMotionEvent.requestPermission().catch(() => {}); }
      bigShake();
    });
    const onMotion = (e) => {
      const a = e.acceleration || e.accelerationIncludingGravity; if (!a || !jar) return;
      const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0) - (e.acceleration ? 0 : 9.8);
      const n = performance.now(); if (m > 14 && n - motionAt > 1300) { motionAt = n; bigShake(); }
    };
    addEventListener('devicemotion', onMotion);
    let shakeAt = 0;
    jarEl?.addEventListener('pointerenter', () => { const n = performance.now(); if (!drag && n - shakeAt > 900) { shakeAt = n; jar?.wobble(); } });

    // section rail on the left edge, as on the project pages: a tick per section, a dot that rides the reading
    // position and a label naming the section you are in
    const rail = $('.a-rail', el), railTrack = $('.p-rail__track', rail), railFill = $('.p-rail__fill', rail), railDot = $('.p-rail__dot', rail);
    const railN = $('.p-rail__n', rail), railT = $('.p-rail__t', rail), railLabel = $('.p-rail__label', rail);
    const railSecs = $$('[data-rail]', el);
    let railMarks = [], railCur = -1, railIdle = null;
    const railMeasure = (st) => {
      railTrack.querySelectorAll('.p-rail__tick').forEach((t) => t.remove());
      const range = Math.max(1, st.end - st.start);
      railMarks = railSecs.map((sec, i) => i === 0 ? 0 : Math.min(1, Math.max(0, (sec.getBoundingClientRect().top + window.scrollY - innerHeight * 0.5 - st.start) / range)));
      railMarks.forEach((m) => { const t = document.createElement('i'); t.className = 'p-rail__tick'; t.style.top = `${m * 100}%`; railTrack.append(t); });
    };
    const railSet = (k) => {
      railFill.style.transform = `scaleY(${k})`; railDot.style.top = `${k * 100}%`;
      let cur = 0; railMarks.forEach((m, i) => { if (k >= m - 0.001) cur = i; });
      if (cur !== railCur) {
        railCur = cur; railN.textContent = String(cur + 1).padStart(2, '0'); railT.textContent = railSecs[cur].dataset.rail;
        railLabel.classList.remove('is-swap'); void railLabel.offsetWidth; railLabel.classList.add('is-swap');
      }
      railLabel.classList.add('is-on'); clearTimeout(railIdle); railIdle = setTimeout(() => railLabel.classList.remove('is-on'), 1400);
    };

    let ctx; const offs = [];
    return {
      el,
      route: 'about',
      init() {
        document.body.append(rail);
        offs.push(() => rail.remove());
        ctx = gsap.context(() => {
          setupReveals(el);
          // skills: build the jar once the page has laid out, drop the skills in when the jar comes into view,
          // and keep the physics running only while it is on screen
          if (window.Matter && stageEl) {
            offs.push(() => { shakeTl?.kill(); jar?.destroy(); stageRO?.disconnect(); clearTimeout(rebuildT); removeEventListener('devicemotion', onMotion); clearTimeout(endTimer); });
            const enter = () => { if (!jar) { buildJar(true); stageRO?.observe(stageEl); } else jar.resume(); };
            ScrollTrigger.create({ trigger: stageEl, start: 'top 75%', end: 'bottom top', onEnter: enter, onEnterBack: enter, onLeave: () => jar?.pause(), onLeaveBack: () => jar?.pause() });
          }
          ScrollTrigger.create({ trigger: $('.about', el), start: 'top top', end: 'bottom bottom',
            onRefresh: (st) => { railMeasure(st); railSet(st.progress); }, onUpdate: (st) => railSet(st.progress) });
          // over the blue services cards the rail switches to the card colours so it stays visible
          ScrollTrigger.create({ trigger: $('.services', el), start: 'top 20%', end: 'bottom 80%', onToggle: (st) => rail.classList.toggle('is-inv', st.isActive) });
          const pin = $('.testi-pin', el), tr = $('.testi-track', el);
          const dist = () => Math.max(0, tr.scrollWidth - innerWidth);
          // the progress bar and the 01 / 06 counter follow the sideways scroll
          const bar = $('.testi__bar i', el), num = $('[data-testi-n]', el), cards = $$('.testi', el);
          gsap.to(tr, {
            x: () => -dist(), ease: 'none',
            scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true,
              onUpdate: (st) => {
                if (bar) bar.style.transform = `scaleX(${st.progress})`;
                if (num) num.textContent = String(Math.min(cards.length, 1 + Math.floor(st.progress * cards.length))).padStart(2, '0');
              } },
          });
          // services: cards stay full-bleed; each one darkens as the next slides over it,
          // and its stitched icon assembles as it arrives and dissolves as it is covered
          $$('.svc', el).forEach((card, i, all) => {
            // the illustration rises in, sharpening, as the card arrives, and drifts up and fades as the next covers it
            const art = $('.svc__art i', card);
            const st = { a: 0, b: 0 }, upd = () => {
              const e = 1 - Math.pow(1 - st.a, 3), k = e * (1 - st.b);
              art.style.opacity = k.toFixed(3);
              art.style.transform = `translateY(${((1 - e) * 40 - st.b * 30).toFixed(1)}px) scale(${(0.94 + 0.06 * e).toFixed(3)})`;
              art.style.filter = `blur(${((1 - e) * 8 + st.b * 6).toFixed(1)}px)`;
            };
            upd();
            gsap.to(st, { a: 1, ease: 'none', onUpdate: upd, scrollTrigger: { trigger: card, start: 'top 85%', end: 'top 5%', scrub: 0.8 } });
            const next = all[i + 1];
            gsap.to(st, { b: 1, ease: 'none', onUpdate: upd, scrollTrigger: next
              ? { trigger: next, start: 'top 90%', end: 'top 20%', scrub: 0.8 }
              : { trigger: card, start: 'bottom 60%', end: 'bottom top', scrub: 0.8 } });
            if (next) gsap.to($('.svc__shade', card), { opacity: 0.45, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: 0.6 } });
          });
        }, el);
        $$('.marquee__track', el).forEach((t, i) => offs.push(marquee(t, { dir: i % 2 ? -1 : 1, speed: 60 })));
      },
      destroy() { offs.forEach((f) => f()); ctx?.revert(); },
    };
  }

  /* ==========================================================================
     MY SPACE
     ========================================================================== */
  function SpaceView() {
    // One block of posters as in the Figma My Space frame: 4 rows of 6, every other row shifted half a step.
    // The block is tiled 3 x 3 and wrapped, so the canvas never ends.
    const posters = myspace.flat();
    const COLS = 6, ROWS = 4;
    const cells = [];
    for (let by = 0; by < 3; by++) for (let bx = 0; bx < 3; bx++)
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const m = posters[(r * COLS + c) % posters.length];
        cells.push({ bx, by, r, c, m, main: bx === 1 && by === 1 });
      }
    const el = h(`
      <div class="view" data-view="my-space">
        <section class="space" aria-labelledby="space-h">
          <h1 id="space-h" class="sr-only">My Space</h1>
          <div class="space__zoom">
            <div class="space__world">
              ${cells.map((t) => `
                <button type="button" class="space__tile" style="--c:${t.bx * COLS + t.c};--r:${t.by * ROWS + t.r};--o:${t.r % 2}"
                  data-cursor="Open" data-src="${t.m.src}" data-label="${esc(t.m.label)}"
                  ${t.main ? `aria-label="${esc(t.m.label)}"` : 'tabindex="-1" aria-hidden="true"'}>
                  ${media(t.m, { alt: '' })}
                </button>`).join('')}
            </div>
          </div>
          <i class="space__center" aria-hidden="true"></i>
          <p class="space__hint">Scroll or drag in any direction</p>
        </section>
        <div class="lightbox" role="dialog" aria-modal="true" aria-label="Poster">
          <button type="button" data-close>Close</button>
          <div data-slot></div>
        </div>
      </div>`);
    const stage = $('.space', el);
    const zoom = $('.space__zoom', el);
    const world = $('.space__world', el);
    const lb = $('.lightbox', el);
    const geo = {};
    function measure() {
      // Figma frame: posters 91 x 114, 259px apart across, rows 215px apart, odd rows shifted by half a step.
      // Sizes follow the 1512px frame, with a floor so posters stay readable on phones.
      const u = Math.max(innerWidth / 1512, 0.62);
      geo.cx = 259 * u; geo.cy = 215 * u; geo.cell = geo.cx;
      stage.style.setProperty('--tw', `${91 * u}px`);
      stage.style.setProperty('--cx', `${geo.cx}px`);
      stage.style.setProperty('--cy', `${geo.cy}px`);
      geo.W = COLS * geo.cx;
      geo.H = ROWS * geo.cy;
      // resting pan that puts the first poster where the Figma frame has it (x 63, y 145 on a 1512 x 982 screen)
      geo.rx = geo.W - (756 - 63.3 + 84) * u;
      geo.ry = innerHeight / 2 - 145 * innerHeight / 982 + 50.5 * u;
    }
    const wrap = (v, m) => ((v % m) + m) % m;

    // pan state, eased toward the target like the rest of the site
    const pan = { x: 0, y: 0, tx: 0, ty: 0 };
    const setX = gsap.quickSetter(world, 'x', 'px');
    const setY = gsap.quickSetter(world, 'y', 'px');
    const tick = () => {
      const k = reduce ? 1 : 0.09;
      pan.x += (pan.tx - pan.x) * k;
      pan.y += (pan.ty - pan.y) * k;
      // the middle copy's corner sits on the screen centre at rest; wrapping keeps it endless
      setX(-geo.W - wrap(pan.x, geo.W));
      setY(-geo.H - wrap(pan.y, geo.H));
    };

    // input: wheel / trackpad in both axes, drag with a flick, arrow keys
    const onWheel = (e) => {
      e.preventDefault();
      const f = e.deltaMode === 1 ? 16 : 1;
      pan.tx += e.deltaX * f; pan.ty += e.deltaY * f;
    };
    let drag = null;
    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, sx: pan.tx, sy: pan.ty, moved: false, vx: 0, vy: 0, t: performance.now(), lx: e.clientX, ly: e.clientY };
      stage.classList.add('is-dragging');
    };
    const onMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      pan.tx = drag.sx - dx * 1.2; pan.ty = drag.sy - dy * 1.2;
      const now = performance.now(), dt = Math.max(1, now - drag.t);
      drag.vx = (e.clientX - drag.lx) / dt; drag.vy = (e.clientY - drag.ly) / dt;
      drag.lx = e.clientX; drag.ly = e.clientY; drag.t = now;
    };
    const onUp = () => {
      if (!drag) return;
      pan.tx -= drag.vx * 260; pan.ty -= drag.vy * 260; // flick carries on
      stage.classList.remove('is-dragging');
      const moved = drag.moved;
      drag = null;
      if (moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
    };
    let suppressClick = false;
    const onKey = (e) => {
      if (lb.classList.contains('is-open')) { if (e.key === 'Escape') closeLb(); return; }
      const st = geo.cell;
      const map = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -geo.cy], ArrowDown: [0, geo.cy] };
      if (map[e.key]) { e.preventDefault(); pan.tx += map[e.key][0]; pan.ty += map[e.key][1]; }
    };

    function closeLb() { lb.classList.remove('is-open'); }
    el.addEventListener('click', (e) => {
      if (suppressClick) { e.preventDefault(); return; }
      const tile = e.target.closest('.space__tile');
      if (tile) {
        $('[data-slot]', lb).innerHTML = media({ src: tile.dataset.src, w: 91, h: 114, label: tile.dataset.label }, { alt: tile.dataset.label, lazy: false });
        lb.classList.add('is-open'); $('[data-close]', lb).focus();
      } else if (e.target.closest('[data-close]') || e.target === lb) closeLb();
    });

    function listen(on) {
      const m = on ? 'addEventListener' : 'removeEventListener';
      stage[m]('wheel', onWheel, { passive: false });
      stage[m]('pointerdown', onDown);
      window[m]('pointermove', onMove);
      window[m]('pointerup', onUp);
      window[m]('pointercancel', onUp);
      document[m]('keydown', onKey);
      window[m]('resize', measure);
    }

    return {
      el,
      route: 'my-space',
      enter() {
        measure();
        // opening frame (after the reference): zoomed far out, a dense wall of small tiles
        gsap.set(zoom, { scale: 0.36 });
        stage.style.setProperty('--k', String(0.7 / 0.36));
        pan.x = pan.tx = geo.rx + geo.cx * 0.6; pan.y = pan.ty = geo.ry + geo.cy * 0.4;
        tick();
      },
      init() {
        root.classList.add('is-locked');
        lenis?.stop();
        measure();
        gsap.ticker.add(tick);
        listen(true);
        // zoom in: the canvas grows while each tile grows less, so the gaps open up
        const z = { s: 0.36, t: 0.7 };
        gsap.to(z, {
          s: 1, t: 1, duration: reduce ? 0 : 1.6, ease: 'power3.inOut', delay: 0.05,
          onUpdate: () => { gsap.set(zoom, { scale: z.s }); stage.style.setProperty('--k', String(z.t / z.s)); },
        });
        pan.tx = geo.rx; pan.ty = geo.ry; // and drifts to rest on the Figma layout
        gsap.fromTo($('.space__hint', el), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1, delay: 1.1 });
      },
      destroy() {
        listen(false);
        gsap.ticker.remove(tick);
        root.classList.remove('is-locked');
        lenis?.start();
      },
    };
  }

  /* ==========================================================================
     ROUTER + TRANSITIONS
     ========================================================================== */
  const app = $('#app');
  let current = null;
  let busy = false;
  let queued = false;
  let pendingFlip = null;
  let pendingNext = false; // set when the end-of-project scroll hands over to the next project
  let pendingPrev = false; // set when pulling up at the top of a project hands over to the previous one
  let workJump = false; // set by Work in the header: open home on the projects scroll
  let freshHome = false; // set by the logo: open home on the first frame instead of the remembered gallery

  function parse() {
    // plain #names (#about, #work-bisff) so links survive being shared
    const hash = location.hash.replace(/^#\/?/, '').replace('/', '-');
    if (hash.startsWith('work-')) { const slug = hash.slice(5); const pr = bySlug(slug); if (pr && !pr.noPage) return { name: 'project', slug }; return { name: 'home' }; }
    if (hash === 'about') return { name: 'about' };
    if (hash === 'my-space') return { name: 'my-space' };
    return { name: 'home' };
  }
  function make(r, opts) {
    if (r.name === 'project') return ProjectView(r.slug, opts);
    if (r.name === 'about') return AboutView();
    if (r.name === 'my-space') return SpaceView();
    return HomeView();
  }
  function markNav(r) {
    document.body.dataset.view = r.name;
    $$('[data-link]').forEach((a) => {
      if (a.dataset.link === r.name && r.name !== 'home') a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const titles = { home: 'Isha Salvi — Creative Director, Product Designer', about: 'About — Isha Salvi', 'my-space': 'My Space — Isha Salvi' };
    document.title = r.name === 'project' ? `${bySlug(r.slug)?.title || 'Work'} — Isha Salvi` : titles[r.name];
  }

  async function go() {
    if (busy) { queued = true; return; }
    busy = true;
    const r = parse();
    const viaNext = pendingNext && r.name === 'project';
    const viaPrev = pendingPrev && r.name === 'project';
    pendingNext = false; pendingPrev = false;
    const next = make(r, { viaNext, viaPrev });
    markNav(r);
    document.body.classList.remove('nav-hidden');

    if (!current) {
      app.append(next.el);
      next.enter?.();
      next.init({ first: true });
      current = next;
      busy = false;
      return;
    }

    openDrawer(false);
    current.leave?.();
    if (freshHome) { homeMemory = null; freshHome = false; }
    if (workJump) { workJump = false; if (r.name === 'home' && !homeMemory) homeMemory = { current: 0, slug: projects[0].slug }; }
    lenis?.stop();
    if (r.name === 'home' && !homeMemory) {
      // the intro is built for the top of the page; sliding it in over a scrolled page made it jump and overlap
      pendingFlip = null;
      await gsap.to(current.el, { autoAlpha: 0, duration: reduce ? 0.01 : 0.45, ease: 'power2.inOut' });
      current.destroy();
      current.el.remove();
      window.scrollTo(0, 0); lenis?.scrollTo(0, { immediate: true, force: true });
      app.append(next.el);
      next.enter?.();
      lenis?.start();
      next.init({ first: false });
      ScrollTrigger.refresh();
      $('#app').focus({ preventScroll: true });
      current = next;
      busy = false;
      if (queued) { queued = false; go(); }
      return;
    }
    const flip = pendingFlip; pendingFlip = null;
    next.el.classList.add('is-entering');
    app.append(next.el);
    next.enter?.();

    const dur = reduce ? 0.01 : 1.3;
    const tl = gsap.timeline({ defaults: { ease: 'expo.inOut', duration: dur } });
    // previous project: it comes down from above and the current page is pushed down; otherwise everything comes up from below
    tl.fromTo(next.el, { yPercent: viaPrev ? -100 : 100 }, { yPercent: 0 }, 0);
    // next project: the dimmed page is pushed up and away; anything else just fades back
    if (viaNext) tl.to(current.leaveTarget || current.el, { y: () => -innerHeight * 0.3 }, 0);
    else if (viaPrev) tl.to(current.leaveTarget || current.el, { y: () => innerHeight * 0.3 }, 0);
    else tl.to(current.el, { autoAlpha: 0.35 }, 0);

    let clone = null;
    const heroSlot = flip && $('[data-hero]', next.el);
    if (heroSlot && !reduce) {
      gsap.set(next.el, { yPercent: 0 });
      const to = heroSlot.getBoundingClientRect();
      gsap.set(next.el, { yPercent: 100 });
      heroSlot.dataset.revealed = '1';
      gsap.set(heroSlot, { autoAlpha: 0, clipPath: 'inset(0% 0% 0% 0%)' });
      clone = h(`<figure class="flip-clone media">${flip.loaded ? `<img src="${flip.src}" alt="">` : ''}</figure>`);
      document.body.append(clone);
      gsap.set(clone, { left: flip.rect.left, top: flip.rect.top, width: flip.rect.width, height: flip.rect.height });
      tl.to(clone, { left: to.left, top: to.top, width: to.width, height: to.height, duration: dur + 0.1 }, 0);
      tl.to(heroSlot, { autoAlpha: 1, duration: 0.4, ease: 'power1.inOut' }, dur - 0.2);
    }

    await tl;
    current.destroy();
    current.el.remove();
    next.el.classList.remove('is-entering');
    gsap.set(next.el, { clearProps: 'transform' });
    window.scrollTo(0, 0);
    scrollTo(0);
    lenis?.start();
    next.init({ first: false });
    ScrollTrigger.refresh();
    if (clone) gsap.to(clone, { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut', onComplete: () => clone.remove() });
    $('#app').focus({ preventScroll: true });
    current = next;
    busy = false;
    if (queued) { queued = false; go(); }
  }

  // nav tucks away while reading down a page and returns on the way up
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const hide = document.body.dataset.view !== 'home' && y > 140 && y > lastY;
    if (Math.abs(y - lastY) > 4) document.body.classList.toggle('nav-hidden', hide);
    lastY = y;
  }, { passive: true });

  // Header contrast: each header item looks at what is behind it (a solid background, a photo or a video) and,
  // where its colour would not be seen, turns light (or dark if the surface is bright), then goes back.
  (function navContrast() {
    const nav = $('.nav'); if (!nav) return;
    const items = ['.nav__logo', '.nav__clock', '.nav__random', '.nav__links a', '.nav__phone'].flatMap((q) => $$(q, nav));
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;color:var(--fg)'; probe.setAttribute('aria-hidden', 'true'); document.body.appendChild(probe);
    const probe2 = probe.cloneNode(); probe2.style.color = 'var(--bg)'; document.body.appendChild(probe2);
    const rgb = (str) => (String(str).match(/[\d.]+/g) || []).map(Number);
    const chan = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2]);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const canv = new WeakMap();
    // average colour of a small patch of an image or video frame at a point (the media is drawn down to 24 x 24)
    const sampleMedia = (m, x, y) => {
      try {
        if (m.tagName === 'IMG' ? !(m.complete && m.naturalWidth) : !(m.readyState >= 2 && m.videoWidth)) return null;
        let g = canv.get(m);
        if (!g || m.tagName === 'VIDEO') { const cv = document.createElement('canvas'); cv.width = cv.height = 24; g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(m, 0, 0, 24, 24); if (m.tagName === 'IMG') canv.set(m, g); }
        const r = m.getBoundingClientRect(), u = Math.round(clamp((x - r.left) / r.width, 0, 1) * 23), v = Math.round(clamp((y - r.top) / r.height, 0, 1) * 23);
        const d = g.getImageData(clamp(u - 1, 0, 21), clamp(v - 1, 0, 21), 3, 3).data; let R = 0, G = 0, B = 0;
        for (let i = 0; i < 36; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; }
        return [R / 9, G / 9, B / 9];
      } catch (e) { return null; }
    };
    const surfaceAt = (x, y) => {
      for (const t of document.elementsFromPoint(x, y)) {
        if (nav.contains(t) || t === probe || t === probe2 || t === document.documentElement) continue;
        if (t.tagName === 'IMG' || t.tagName === 'VIDEO') { const c = sampleMedia(t, x, y); if (c) return c; continue; }
        const cs = getComputedStyle(t);
        if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.backgroundColor.startsWith('color(')) continue;
        const bg = rgb(cs.backgroundColor);
        if (bg.length >= 3 && (bg.length === 3 || bg[3] > 0.6)) return bg.slice(0, 3);
      }
      return rgb(getComputedStyle(probe).color).map((v) => 255 - v); // nothing found: assume the opposite of the text colour
    };
    let busy = false;
    const check = () => {
      busy = false;
      if (document.body.classList.contains('nav-hidden')) return;
      const fg = rgb(getComputedStyle(probe).color).slice(0, 3), bgc = rgb(getComputedStyle(probe2).color).slice(0, 3);
      const hi = lum(fg) > lum(bgc) ? fg : bgc, lo = hi === fg ? bgc : fg; // the lighter and darker colour of the current palette
      const css = (c) => `rgb(${c.map(Math.round).join(',')})`;
      items.forEach((it) => {
        const b = it.getBoundingClientRect(); if (!b.width) return;
        const y = b.top + b.height / 2; let worst = 99, surf = null;
        for (const f of [0.12, 0.5, 0.88]) { const sf = surfaceAt(b.left + b.width * f, y), r = ratio(fg, sf); if (r < worst) { worst = r; surf = sf; } }
        const need = it.matches('.nav__clock, .nav__links a') ? 4.5 : 3; // text needs 4.5:1, icons and the logo 3:1
        const hiR = ratio(hi, surf), loR = ratio(lo, surf);
        if (worst >= need) it.style.removeProperty('color');
        else it.style.color = css(hiR >= loR ? hi : lo);
      });
    };
    const ask = () => { if (!busy) { busy = true; requestAnimationFrame(check); } };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask);
    addEventListener('hashchange', () => setTimeout(ask, 900)); document.addEventListener('click', () => setTimeout(ask, 120));
    setInterval(ask, 500); // pinned and animated sections move without the page scrolling
    ask();
  })();

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', go);
  // phone icon, top right: opens the contact details; a click outside or Escape closes them
  (function contactPop() {
    const btn = $('.nav__phone'), pop = $('#contact-pop');
    if (!btn || !pop) return;
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      if (open) { pop.hidden = false; requestAnimationFrame(() => pop.classList.add('is-open')); }
      else { pop.classList.remove('is-open'); setTimeout(() => { if (!pop.classList.contains('is-open')) pop.hidden = true; }, 300); }
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.nav__contact')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
    addEventListener('hashchange', () => set(false));
  })();
  // Work in the header: on the home page it runs the intro through to the gallery; elsewhere it is a normal link home.
  $('.nav__work')?.addEventListener('click', (e) => {
    if (current?.route === 'home' && current.toWork) { e.preventDefault(); current.toWork(); return; }
    // from any other page: open home straight on the projects scroll (where it was left, else at the first project)
    workJump = true;
  });
  // The logo always goes back to the start: the first frame with the name, even from the gallery.
  $('[data-logo]').addEventListener('click', (e) => {
    e.preventDefault();
    freshHome = true;
    if (location.hash === '#work') go(); // same hash would not fire hashchange
    else location.hash = 'work';
  });
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => ScrollTrigger.refresh(), 200); });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  go();
})();
