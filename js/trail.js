/* Pixel cursor trail: the pointer leaves squares snapped to a grid behind it.
   Each square starts full size, shrinks, turns into a diamond and fades out.
   Drawn in the current palette's text colour; off for touch and reduced motion. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return;

  const GRID = 12;      // px between cells
  const SIZE = 9;       // square size when fresh
  const LIFE = 280;     // ms a cell lives
  const canvas = document.createElement('canvas');
  canvas.className = 'trail';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  };
  size();
  addEventListener('resize', size);

  const cells = [];
  let last = null;
  const add = (x, y, t) => {
    const gx = Math.round(x / GRID) * GRID, gy = Math.round(y / GRID) * GRID;
    const prev = cells[cells.length - 1];
    if (prev && prev.x === gx && prev.y === gy) { prev.t = t; return; }
    cells.push({ x: gx, y: gy, t });
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const t = performance.now();
    // fill the gap on fast moves so the trail stays a continuous line of cells
    if (last) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      const steps = Math.min(40, Math.floor(Math.hypot(dx, dy) / GRID));
      for (let i = 1; i <= steps; i++) add(last.x + (dx * i) / (steps + 1), last.y + (dy * i) / (steps + 1), t);
    }
    add(e.clientX, e.clientY, t);
    last = { x: e.clientX, y: e.clientY };
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  addEventListener('pointerleave', () => { last = null; });

  let raf = 0;
  function frame(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#0040FF';
    while (cells.length && now - cells[0].t > LIFE) cells.shift();
    for (const c of cells) {
      const k = (now - c.t) / LIFE;              // 0 fresh → 1 gone
      const s = SIZE * (1 - 0.6 * k);
      ctx.globalAlpha = 0.75 * (1 - k);
      ctx.save();
      ctx.translate(c.x, c.y);
      if (k > 0.45) ctx.rotate(Math.PI / 4);   // older cells turn into diamonds
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    raf = cells.length ? requestAnimationFrame(frame) : 0;
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
})();
