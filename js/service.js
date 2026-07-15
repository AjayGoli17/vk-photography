// ═══════════════════════════════════════════════
// SAM SHOOT NAV & SIDEBAR LOGIC
// ═══════════════════════════════════════════════
(() => {
    let lastScrollTop = 0;
    const header = document.getElementById('mainHeader');
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
  
    window.addEventListener('scroll', () => {
      let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight && !sidebar.classList.contains('active')) {
        header.classList.add('nav-up');
      } else {
        header.classList.remove('nav-up');
      }
      lastScrollTop = scrollTop;
    });
  
    function toggleSidebar() {
      sidebar.classList.toggle('active');
      sidebarOverlay.classList.toggle('active');
      document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    }
    menuToggle.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
    document.querySelectorAll('.sidebar-links a, .sidebar-btn').forEach(link => {
      link.addEventListener('click', () => { if(sidebar.classList.contains('active')) toggleSidebar(); });
    });
  })();
  
  // ═══════════════════════════════════════════════
  // SAM SHOOT FOOTER OBSERVER LOGIC
  // ═══════════════════════════════════════════════
  (() => {
    const footerEl = document.getElementById('siteFooter');
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