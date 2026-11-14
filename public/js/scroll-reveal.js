(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // [selector, effect, stagger?]
  var groups = [
    ['.services-head', 'up'],
    ['.shop-teaser-head', 'up'],
    ['.shop-teaser-grid .shop-card', 'up', true],
    ['.shop-teaser-more', 'up'],
    ['.videos-head', 'up'],
    ['.tc-head', 'up'],
    ['.tc-wrap', 'up'],
    ['.tc-controls', 'up'],
    ['.tc-hero', 'zoom'],
    ['.footer-brand', 'up'],
    ['.footer-col', 'up', true],
    ['.footer-bottom', 'fade']
  ];

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      io.unobserve(el);
      el.classList.add('sr-in');
      el.addEventListener('animationend', function done(e) {
        if (e.target !== el) return;
        el.removeEventListener('animationend', done);
        el.classList.remove('sr', 'sr-in', 'sr-up', 'sr-zoom', 'sr-fade');
        el.style.animationDelay = '';
      });
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

  groups.forEach(function (g) {
    var list = document.querySelectorAll(g[0]);
    list.forEach(function (el, i) {
      el.classList.add('sr', 'sr-' + g[1]);
      if (g[2]) el.style.animationDelay = (i * 120) + 'ms';
      io.observe(el);
    });
  });
})();
