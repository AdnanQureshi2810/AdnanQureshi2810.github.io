/* ============================================
   Personal Website v4 — Interactions
   B&W Dark · Restrained Violet · Glass
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  // ── Scroll progress bar ────────────────────────────────────
  const scrollProgress = document.getElementById('scroll-progress');
  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (scrollProgress) scrollProgress.style.width = progress + '%';
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollProgress();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  updateScrollProgress();

  // ── Cursor-following glow (page-wide, mouse only) ──────────
  // Moved with a transform once per frame, so pointer moves never trigger layout.
  const glow = document.getElementById('glow');
  if (glow && finePointer && !reduceMotion) {
    let gx = 0, gy = 0, glowQueued = false;
    document.addEventListener('mousemove', e => {
      gx = e.clientX; gy = e.clientY;
      if (glowQueued) return;
      glowQueued = true;
      requestAnimationFrame(() => {
        glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
        glow.classList.add('is-active');
        glowQueued = false;
      });
    }, { passive: true });
    document.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
  }

  // ── Mobile menu toggle ─────────────────────────────────────
  const navToggle = document.getElementById('nav-toggle');
  const navMobile = document.getElementById('nav-mobile');
  if (navToggle && navMobile) {
    const setMenu = open => {
      navMobile.classList.toggle('open', open);
      navToggle.classList.toggle('active', open);
      navToggle.setAttribute('aria-expanded', String(open));
    };
    navToggle.addEventListener('click', () => setMenu(!navMobile.classList.contains('open')));
    navMobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navMobile.classList.contains('open')) {
        setMenu(false);
        navToggle.focus();
      }
    });
    document.addEventListener('click', e => {
      if (navMobile.classList.contains('open') && !e.target.closest('#nav')) setMenu(false);
    });
  }

  // ── Active nav link highlighting ───────────────────────────
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  if (sections.length && navLinks.length) {
    const navObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            navLinks.forEach(link => {
              link.classList.toggle('active',
                link.getAttribute('href') === '#' + entry.target.id
              );
            });
          }
        });
      },
      { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' }
    );
    sections.forEach(s => navObserver.observe(s));
  }

  // ── Scroll-triggered reveal with stagger ───────────────────
  const animateTargets = document.querySelectorAll(
    '.section-eyebrow, .section-h2, .about-text, .detail-card, .metric-group, .r-card, ' +
    '.impact-item, .pub-item, .timeline-item, .grant-item, .skill-row, .cta-panel'
  );
  animateTargets.forEach(el => el.classList.add('fade-in'));

  if (reduceMotion) {
    animateTargets.forEach(el => el.classList.add('visible'));
  } else {
    const fadeObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const parent = entry.target.parentElement;
            const siblings = parent ? Array.from(parent.children).filter(c => c.classList.contains('fade-in')) : [entry.target];
            const index = Math.max(0, siblings.indexOf(entry.target));
            entry.target.style.setProperty('--stagger', (index * 0.07) + 's');
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    animateTargets.forEach(el => fadeObserver.observe(el));
  }

  // ── Timeline rail draws in on scroll ───────────────────────
  if (!reduceMotion) {
    const timelines = document.querySelectorAll('.timeline');
    timelines.forEach(t => t.classList.add('will-draw'));
    const railObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-drawn');
            railObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    timelines.forEach(t => railObserver.observe(t));
  }

  // ── Animated metric counters ───────────────────────────────
  // HTML default = final value (SEO/no-JS safe). Reset to 0 only when about
  // to enter the viewport, then animate up. If observer never fires (slow JS,
  // tab not scrolled), the real value stays visible.
  if (!reduceMotion) {
    const counters = document.querySelectorAll('.metric-number[data-target]');
    const counterObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.target, 10);
            animateCounter(el, target);
            counterObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(c => counterObserver.observe(c));
  }

  function animateCounter(el, target) {
    const duration = 1600;
    const suffix = el.dataset.suffix || '';
    el.textContent = '0';  // reset just before animation
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(eased * target);
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(update);
  }

  // ── Research cards: cursor glow + subtle tilt ──────────────
  if (finePointer && !reduceMotion) {
    const MAX_TILT = 4; // degrees
    document.querySelectorAll('.r-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        card.style.setProperty('--ry', ((px - 0.5) * 2 * MAX_TILT) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 2 * MAX_TILT) + 'deg');
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  // ── Ambient videos: play only while on screen ──────────────
  // Videos ship with preload="none" + a poster, so nothing downloads until a
  // video nears the viewport. Reduced-motion and Save-Data users keep the poster.
  const videos = document.querySelectorAll('video[data-autoplay]');
  if (!reduceMotion && !saveData && videos.length) {
    const videoObserver = new IntersectionObserver(
      entries => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) {
            target.play().catch(() => { /* autoplay blocked — poster stays */ });
          } else {
            target.pause();
          }
        });
      },
      { rootMargin: '200px 0px' }
    );
    videos.forEach(v => {
      // Per-video playback rate (default 0.6× for a meditative, ambient feel).
      const rate = parseFloat(v.dataset.playback) || 0.6;
      v.defaultPlaybackRate = rate;
      v.playbackRate = rate;
      v.addEventListener('loadedmetadata', () => { v.playbackRate = rate; });
      videoObserver.observe(v);
    });
  }

  // ── Magnetic button effect (subtle) ────────────────────────
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }
});
