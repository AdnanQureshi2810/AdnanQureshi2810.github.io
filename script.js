/* ============================================
   Personal Website v4 — Interactions
   B&W Dark · Restrained Violet · Glass
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

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

  // ── Cursor-following glow (page-wide) ──────────────────────
  const glow = document.getElementById('glow');
  if (glow) {
    document.addEventListener('mousemove', e => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    });
  }

  // ── Mobile menu toggle ─────────────────────────────────────
  const navToggle = document.getElementById('nav-toggle');
  const navMobile = document.getElementById('nav-mobile');
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMobile.classList.toggle('open');
      navToggle.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', isOpen);
    });
    navMobile.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navMobile.classList.remove('open');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── Smooth scroll for anchor links ─────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

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

  // ── Scroll-triggered fade-in with stagger ──────────────────
  const animateTargets = document.querySelectorAll(
    '.section-eyebrow, .section-h2, .about-text, .detail-card, .metric-card, .r-card, ' +
    '.pub-item, .timeline-item, .grant-item, .skill-group, .cta-panel, .badge'
  );
  animateTargets.forEach(el => el.classList.add('fade-in'));

  const fadeObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const parent = entry.target.parentElement;
          const siblings = parent ? Array.from(parent.children).filter(c => c.classList.contains('fade-in')) : [entry.target];
          const index = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = (Math.max(0, index) * 0.06) + 's';
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  animateTargets.forEach(el => fadeObserver.observe(el));

  // ── Animated metric counters ───────────────────────────────
  // HTML default = final value (SEO/no-JS safe). Reset to 0 only when about
  // to enter the viewport, then animate up. If observer never fires (slow JS,
  // tab not scrolled), the real value stays visible.
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

  // ── Research card cursor-radial glow + tilt ────────────────
  document.querySelectorAll('.r-card').forEach(t => {
    t.addEventListener('mousemove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', ((e.clientX - r.left)/r.width*100)+'%');
      t.style.setProperty('--my', ((e.clientY - r.top)/r.height*100)+'%');
    });
  });

  // ── Per-video playback rate (default 0.6× for meditative ambient) ──
  document.querySelectorAll('.hero-video, .r-card-video').forEach(v => {
    const rate = parseFloat(v.dataset.playback) || 0.6;
    v.playbackRate = rate;
    v.addEventListener('loadedmetadata', () => { v.playbackRate = rate; });
  });

  // ── Magnetic button effect (subtle) ────────────────────────
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
});
