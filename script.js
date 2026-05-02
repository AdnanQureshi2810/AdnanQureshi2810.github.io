/* ============================================
   Personal Website v3 — World-Class Interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Page Loader ──
  const loader = document.getElementById('page-loader');
  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('loaded');
    }, 1400);
  });

  // Fallback: hide loader after 3s max
  setTimeout(() => {
    loader.classList.add('loaded');
  }, 3000);

  // ── Scroll Progress Bar ──
  const scrollProgress = document.getElementById('scroll-progress');
  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgress.style.width = progress + '%';
  }

  // ── Floating Particles ──
  const particlesContainer = document.getElementById('particles');
  const PARTICLE_COUNT = 10;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (8 + Math.random() * 12) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    particle.style.width = (2 + Math.random() * 3) + 'px';
    particle.style.height = particle.style.width;
    particle.style.opacity = 0;
    particlesContainer.appendChild(particle);
  }

  // ── Parallax on scroll (hero only — blobs use CSS animation) ──
  const heroImage = document.querySelector('.hero-image-wrapper');
  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY;

    // Subtle parallax on hero image
    if (heroImage && scrollY < window.innerHeight) {
      heroImage.style.transform = `translateY(${scrollY * 0.04}px)`;
    }

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateParallax();
        updateScrollProgress();
      });
      ticking = true;
    }
  }, { passive: true });

  // ── Navigation scroll effect ──
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Mobile menu toggle ──
  const toggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('nav-mobile');

  toggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    toggle.classList.toggle('active');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      mobileMenu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // ── Scroll-triggered fade-in with stagger ──
  const animateTargets = document.querySelectorAll(
    '.section-title, .about-text, .detail-card, .metric-card, .research-card, ' +
    '.pub-item, .timeline-item, .grant-item, .skill-group, .contact-form, .contact-intro'
  );

  animateTargets.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const parent = entry.target.parentElement;
          const siblings = Array.from(parent.children).filter(c => c.classList.contains('fade-in'));
          const index = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = (index * 0.08) + 's';

          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );

  animateTargets.forEach(el => observer.observe(el));

  // ── Animated counters ──
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
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(eased * target);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        if (target >= 50) el.textContent = target + '+';
      }
    }

    requestAnimationFrame(update);
  }

  // ── Mouse-follow glow on hero ──
  const hero = document.querySelector('.hero');
  if (hero) {
    const glow = document.createElement('div');
    glow.style.cssText = `
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(196, 30, 30, 0.05) 0%, transparent 70%);
      pointer-events: none;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
      opacity: 0;
      z-index: 0;
    `;
    hero.style.position = 'relative';
    hero.appendChild(glow);

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left - 250;
      const y = e.clientY - rect.top - 250;
      glow.style.transform = `translate(${x}px, ${y}px)`;
      glow.style.opacity = '1';
    });

    hero.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
    });
  }

  // ── Magnetic button effect ──
  const magneticBtns = document.querySelectorAll('.magnetic');

  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // ── Contact form handling ──
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        status.textContent = 'Message sent! I\'ll get back to you soon.';
        status.className = 'form-status success';
        form.reset();
      } else {
        throw new Error('Form submission failed');
      }
    } catch {
      status.textContent = 'Something went wrong. Please email me directly.';
      status.className = 'form-status error';
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // ── Smooth scroll ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ── Active nav link highlighting ──
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

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
});
