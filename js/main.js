function showPage(id) {
  document.querySelectorAll('.page').forEach((p) => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  const el = document.getElementById('page-' + id);
  if (!el) return;
  el.style.display = 'block';
  el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => {
    el.querySelectorAll('.reveal').forEach((r) => r.classList.remove('vis'));
    triggerReveal();
  }, 50);
  playHeroVideo(id);
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
