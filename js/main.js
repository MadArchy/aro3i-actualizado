const PAGE_HISTORY = [];
let currentPage = 'home';

function updateBackButton() {
  const backBtn = document.getElementById('page-back-btn');
  if (!backBtn) return;
  const show = currentPage !== 'home';
  backBtn.classList.toggle('is-visible', show);
  backBtn.setAttribute('aria-hidden', show ? 'false' : 'true');
  backBtn.tabIndex = show ? 0 : -1;
}

function showPage(id, options = {}) {
  const pushHistory = options.pushHistory !== false;
  if (pushHistory && currentPage && currentPage !== id) {
    PAGE_HISTORY.push(currentPage);
  }

  document.querySelectorAll('.page').forEach((p) => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  const el = document.getElementById('page-' + id);
  if (!el) return;
  currentPage = id;
  el.style.display = 'block';
  el.classList.add('active');
  updateBackButton();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => {
    el.querySelectorAll('.reveal').forEach((r) => r.classList.remove('vis'));
    triggerReveal();
  }, 50);
  playHeroVideo(id);
}

function goBackPage() {
  if (PAGE_HISTORY.length) {
    showPage(PAGE_HISTORY.pop(), { pushHistory: false });
    return;
  }
  showPage('home', { pushHistory: false });
}

const HERO_VIDEOS = {
  floss: 'floss-hero-video',
  pick: 'pick-hero-video',
  flow: 'flow-hero-video',
  ez: 'ez-hero-video',
  fuel: 'fuel-hero-video',
};
let heroVideoTimer;

function playHeroVideo(pageId) {
  document.querySelectorAll('.prod-hero-video').forEach((v) => {
    v.classList.remove('is-playing');
    try { v.pause(); } catch (e) {}
  });
  if (heroVideoTimer) {
    clearTimeout(heroVideoTimer);
    heroVideoTimer = null;
  }

  const videoId = HERO_VIDEOS[pageId];
  if (!videoId) return;
  const video = document.getElementById(videoId);
  if (!video) return;

  try { video.currentTime = 0; } catch (e) {}
  video.muted = true;
  const attemptPlay = video.play();

  const fadeOut = () => {
    video.classList.remove('is-playing');
    try { video.pause(); } catch (e) {}
  };

  const armFallback = () => {
    const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6;
    heroVideoTimer = setTimeout(fadeOut, Math.min(dur, 8) * 1000);
  };

  video.classList.add('is-playing');
  video.onended = fadeOut;

  if (attemptPlay && typeof attemptPlay.then === 'function') {
    attemptPlay.then(armFallback).catch(fadeOut);
  } else {
    armFallback();
  }
}

function triggerReveal() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('vis');
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.07 }
  );
  document.querySelectorAll('.reveal:not(.vis)').forEach((node) => obs.observe(node));
}

window.addEventListener('load', triggerReveal);
document.addEventListener('scroll', () => {}, true);

const activePageEl = document.querySelector('.page.active');
if (activePageEl && activePageEl.id && activePageEl.id.startsWith('page-')) {
  currentPage = activePageEl.id.replace('page-', '');
}
updateBackButton();

/* Letter-by-letter reveal (right-to-left) for elements marked
   with [data-letter-reveal]. Runs once on load. */
function initLetterReveal() {
  const nodes = document.querySelectorAll('[data-letter-reveal]');
  if (!nodes.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  nodes.forEach((node) => {
    if (node.dataset.letterRevealDone === '1') return;
    const text = (node.textContent || '').trim();
    if (!text) return;

    const chars = Array.from(text);
    node.textContent = '';

    const baseDelay = parseFloat(node.dataset.letterDelay) || 0.028;
    const startDelay = parseFloat(node.dataset.letterStart) || 0.15;
    const total = chars.length;

    chars.forEach((ch, i) => {
      const span = document.createElement('span');
      if (ch === ' ') {
        span.className = 'letter space';
        span.innerHTML = '&nbsp;';
      } else {
        span.className = 'letter';
        span.textContent = ch;
      }
      const fromRight = total - 1 - i;
      const delay = reduce ? 0 : startDelay + fromRight * baseDelay;
      span.style.setProperty('--delay', delay.toFixed(3) + 's');
      span.setAttribute('aria-hidden', 'true');
      node.appendChild(span);
    });

    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    sr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    node.appendChild(sr);

    node.dataset.letterRevealDone = '1';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLetterReveal);
} else {
  initLetterReveal();
}

function setNavOpen(open) {
  const links = document.getElementById('nav-links');
  const burger = document.getElementById('nav-burger');
  const back = document.getElementById('nav-backdrop');
  if (!links || !burger) return;
  links.classList.toggle('is-open', open);
  burger.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (back) back.classList.toggle('is-visible', open);
  document.body.classList.toggle('has-nav-open', open);
}

window.ARO_closeMobileNav = function () {
  setNavOpen(false);
};

document.body.addEventListener('click', (e) => {
  if (e.target.closest('#nav-burger')) {
    const links = document.getElementById('nav-links');
    setNavOpen(!(links && links.classList.contains('is-open')));
    return;
  }
  if (e.target.closest('#nav-backdrop')) {
    setNavOpen(false);
    return;
  }
  if (e.target.closest('#nav-cart-mobile')) {
    setNavOpen(false);
  }
  if (e.target.closest('#page-back-btn')) {
    e.preventDefault();
    goBackPage();
    setNavOpen(false);
    return;
  }
  const pageEl = e.target.closest('[data-page]');
  if (pageEl) {
    if (pageEl.tagName === 'A' || pageEl.getAttribute('role') === 'button') {
      e.preventDefault();
    }
    showPage(pageEl.dataset.page);
    setNavOpen(false);
    return;
  }
  const scrollEl = e.target.closest('[data-scroll-to]');
  if (scrollEl) {
    e.preventDefault();
    const target = document.getElementById(scrollEl.dataset.scrollTo);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
    setNavOpen(false);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const links = document.getElementById('nav-links');
  if (links && links.classList.contains('is-open')) setNavOpen(false);
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 960) setNavOpen(false);
});

document.body.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const pageEl = e.target.closest('[data-page][role="button"]');
  if (pageEl) {
    e.preventDefault();
    showPage(pageEl.dataset.page);
  }
});
