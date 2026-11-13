/* VK Photography - balanced masonry. Each photo goes into the currently shortest column,
   so photos read left to right and the column bottoms stay even. */
(function () {
  var gallery = document.getElementById('gallery');
  if (!gallery) return;
  var timer = null, lastCols = 0;

  function colCount() { return window.innerWidth <= 999 ? 2 : 3; }

  function build() {
    var n = colCount();
    lastCols = n;
    var items = [].slice.call(gallery.querySelectorAll('.gallery-item'));
    if (!items.length) return;
    items.sort(function (a, b) { return a.dataset.index - b.dataset.index; });

    var cols = [], heights = [];
    for (var c = 0; c < n; c++) {
      var el = document.createElement('div');
      el.className = 'gallery-col';
      cols.push(el); heights.push(0);
    }
    items.forEach(function (it) {
      if (it.hidden) { cols[0].appendChild(it); return; }
      var img = it.querySelector('img');
      var w = parseFloat(img.getAttribute('width')), h = parseFloat(img.getAttribute('height'));
      var rel = (w && h) ? h / w : 1;
      var k = heights.indexOf(Math.min.apply(null, heights));
      cols[k].appendChild(it);
      heights[k] += rel + 0.03;
    });
    gallery.replaceChildren.apply(gallery, cols);
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(build, 30); }

  new MutationObserver(function () {
    if (gallery.querySelector(':scope > .gallery-item')) schedule();
  }).observe(gallery, { childList: true });
  new MutationObserver(schedule).observe(gallery, { attributes: true, attributeFilter: ['hidden'], subtree: true });

  window.addEventListener('resize', function () { if (colCount() !== lastCols) schedule(); });
})();
