// ═══════════════════════════════════════════════
// SAM SHOOT NAV & SIDEBAR LOGIC
// ═══════════════════════════════════════════════
(() => {
    let lastScrollTop = 0;
    const header = document.querySelector('.site-header');
    const sidebar = document.getElementById('sidebar');
  
    window.addEventListener('scroll', () => {
      let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (header && scrollTop > lastScrollTop && scrollTop > header.offsetHeight && !(sidebar && sidebar.classList.contains('is-open'))) {
        header.classList.add('nav-up');
      } else if (header) {
        header.classList.remove('nav-up');
      }
      lastScrollTop = scrollTop;
    });
  })();

// Mobile sidebar: opens from the side when the hamburger button is
// tapped, closes via the X button, the overlay, Escape, or picking a link
(() => {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = document.getElementById('sidebarClose');
  if (!menuBtn || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', openSidebar);
  closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('.sidebar-links a').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
})();
  
  // ═══════════════════════════════════════════════
  // SAM SHOOT FOOTER OBSERVER LOGIC
  // ═══════════════════════════════════════════════
  (() => {
    const footerEl = document.querySelector('.site-footer');
    if(footerEl) {
      const footerObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            footerObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px' });
      footerObs.observe(footerEl);
    }
  })();
  
  // ═══════════════════════════════════════════════
  // REVEAL ON SCROLL & LAZY IMAGES (services page)
  // ═══════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => document.body.classList.add('loaded'));
    const revealTargets = document.querySelectorAll('.reveal, .section-title-huge, .section-underline, .price-tag, .cta-section');
  
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.classList.contains('reveal')
            ? (Array.from(entry.target.parentElement.children).indexOf(entry.target) * 120)
            : 0;
          setTimeout(() => { entry.target.classList.add('in-view'); }, delay);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  
    revealTargets.forEach(target => revealObserver.observe(target));
  
    const lazyImages = document.querySelectorAll('.img-wrap img');
    lazyImages.forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('img-loaded');
      } else {
        img.addEventListener('load', () => img.classList.add('img-loaded'));
        img.addEventListener('error', () => img.classList.add('img-loaded'));
      }
    });
  });