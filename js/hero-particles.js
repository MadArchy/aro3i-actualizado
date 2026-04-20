/* ──────────────────────────────────────────────────────────────
   Hero particle field — inspired by antigravity.google
   Soft floating particles with cursor repulsion + constellation lines.
────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const hero = document.querySelector('.hero');
  if (!hero) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-particles';
  canvas.setAttribute('aria-hidden', 'true');
  const gridEl = hero.querySelector('.hero-grid');
  if (gridEl && gridEl.parentNode === hero) {
    hero.insertBefore(canvas, gridEl.nextSibling);
  } else {
    hero.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const state = {
    w: 0,
    h: 0,
    particles: [],
    pointer: { x: -9999, y: -9999, active: false },
    raf: 0,
    visible: true,
  };

  const CONFIG = {
    baseCount: 70,
    perMegaPixel: 55,
    maxCount: 180,
    minRadius: 0.6,
    maxRadius: 1.9,
    driftSpeed: 0.18,
    linkDistance: 120,
    repelRadius: 140,
    repelStrength: 55,
    damping: 0.94,
    returnForce: 0.0015,
    colorCore: 'rgba(0, 201, 177, 0.9)',
    colorHalo: 'rgba(0, 201, 177, 0.18)',
    linkColor: 'rgba(0, 201, 177, 0.22)',
  };

  function resize() {
    const rect = hero.getBoundingClientRect();
    state.w = Math.max(1, Math.floor(rect.width));
    state.h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(state.w * DPR);
    canvas.height = Math.floor(state.h * DPR);
    canvas.style.width = state.w + 'px';
    canvas.style.height = state.h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    const mp = (state.w * state.h) / 1_000_000;
    const count = Math.min(
      CONFIG.maxCount,
      Math.max(CONFIG.baseCount, Math.round(CONFIG.baseCount + mp * CONFIG.perMegaPixel))
    );
    state.particles = new Array(count).fill(null).map(() => createParticle());
  }

  function createParticle() {
    const angle = Math.random() * Math.PI * 2;
    const speed = CONFIG.driftSpeed * (0.4 + Math.random() * 0.9);
    return {
      x: Math.random() * state.w,
      y: Math.random() * state.h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: CONFIG.minRadius + Math.random() * (CONFIG.maxRadius - CONFIG.minRadius),
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = e.clientX - rect.left;
    state.pointer.y = e.clientY - rect.top;
    state.pointer.active = true;
  }
  function onPointerLeave() {
    state.pointer.active = false;
    state.pointer.x = -9999;
    state.pointer.y = -9999;
  }

  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave, { passive: true });

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        state.visible = entry.isIntersecting;
        if (state.visible && !state.raf) loop();
      }
    },
    { threshold: 0.01 }
  );
  io.observe(hero);

  let resizeRaf = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  };
  window.addEventListener('resize', onResize);

  function step() {
    const { particles, pointer, w, h } = state;
    const linkDistSq = CONFIG.linkDistance * CONFIG.linkDistance;
    const repelSq = CONFIG.repelRadius * CONFIG.repelRadius;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < repelSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / CONFIG.repelRadius) * CONFIG.repelStrength;
          p.vx += (dx / dist) * force * 0.016;
          p.vy += (dy / dist) * force * 0.016;
        }
      }

      const cx = w * 0.5;
      const cy = h * 0.5;
      p.vx += (cx - p.x) * CONFIG.returnForce * 0.0025;
      p.vy += (cy - p.y) * CONFIG.returnForce * 0.0025;

      p.vx *= CONFIG.damping + 0.05;
      p.vy *= CONFIG.damping + 0.05;

      const sp = Math.hypot(p.vx, p.vy);
      const target = CONFIG.driftSpeed * 0.9;
      if (sp < target) {
        const a = Math.atan2(p.vy || Math.random() - 0.5, p.vx || Math.random() - 0.5);
        p.vx = Math.cos(a) * target;
        p.vy = Math.sin(a) * target;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = w + 20;
      else if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      else if (p.y > h + 20) p.y = -20;

      p.twinkle += 0.02;
    }

    ctx.strokeStyle = CONFIG.linkColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDistSq) {
          const t = 1 - d2 / linkDistSq;
          ctx.globalAlpha = t * 0.55;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const tw = 0.75 + Math.sin(p.twinkle) * 0.25;

      ctx.fillStyle = CONFIG.colorHalo;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = CONFIG.colorCore;
      ctx.globalAlpha = tw;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function loop() {
    if (!state.visible) {
      state.raf = 0;
      return;
    }
    step();
    state.raf = requestAnimationFrame(loop);
  }

  resize();
  loop();
})();
