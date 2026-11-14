/* VK Photography - masonry with equal column heights and no cropping.
   Column widths are solved from the photo aspect ratios so every column ends on the same line. */
(function () {
  var gallery = document.getElementById('gallery');
  if (!gallery) return;
  var timer = null, lastCols = 0;

  function colCount() { return window.innerWidth <= 999 ? 2 : 3; }

  function fit() {
    var gap = parseFloat(getComputedStyle(gallery).columnGap) || 10;
    var data = [].slice.call(gallery.children).map(function (col) {
      var vis = [].slice.call(col.querySelectorAll('.gallery-item:not([hidden])'));
      var S = 0;
      vis.forEach(function (it) {
        var img = it.querySelector('img');
        var w = parseFloat(img.getAttribute('width')), h = parseFloat(img.getAttribute('height'));
        S += (w && h) ? h / w : 1;
      });
      return { col: col, n: vis.length, S: S };
    });
    var act = data.filter(function (d) { return d.n > 0; });
    data.forEach(function (d) { d.col.style.display = d.n ? 'flex' : 'none'; });
    if (!act.length) return;
    var W = gallery.clientWidth - (act.length - 1) * gap;
    var num = W, den = 0;
    act.forEach(function (d) { num += (d.n - 1) * gap / d.S; den += 1 / d.S; });
    var H = num / den;
    act.forEach(function (d) { d.col.style.width = ((H - (d.n - 1) * gap) / d.S) + 'px'; });
  }

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
    fit();
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(build, 30); }

  new MutationObserver(function () {
    if (gallery.querySelector(':scope > .gallery-item')) schedule();
  }).observe(gallery, { childList: true });
  new MutationObserver(schedule).observe(gallery, { attributes: true, attributeFilter: ['hidden'], subtree: true });

  window.addEventListener('resize', function () {
    if (colCount() !== lastCols) schedule(); else fit();
  });
})();
