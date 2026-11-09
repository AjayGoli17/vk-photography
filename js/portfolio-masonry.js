/* Gap-free portfolio masonry (desktop/tablet).
   Places each tile into whichever column is currently shortest, so the
   columns stay balanced and no big empty areas are left. Mobile (<=900px)
   is still handled by home.js. */
(function () {
  var grid = document.getElementById('grid');
  if (!grid) return;

  var style = document.createElement('style');
  style.textContent =
    '.grid.vk-masonry{display:flex;align-items:flex-start;column-count:auto;column-gap:0;gap:18px}' +
    '.grid.vk-masonry .vk-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column}' +
    '.grid.vk-masonry .tile{margin-bottom:18px}';
  document.head.appendChild(style);

  var tiles = Array.prototype.slice.call(document.querySelectorAll('#portfolio .tile'));
  var timer;

  function ratio(tile) {
    var img = tile.querySelector('img');
    if (img && img.naturalWidth > 0) return img.naturalHeight / img.naturalWidth;
    var w = parseFloat(tile.getAttribute('data-w')) || 1;
    var h = parseFloat(tile.getAttribute('data-h')) || 1;
    return h / w;
  }

  function layout() {
    if (window.innerWidth <= 900) {
      grid.classList.remove('vk-masonry');
      return;
    }
    var n = window.innerWidth <= 1100 ? 2 : 3;
    var cols = [], heights = [], i;
    grid.replaceChildren();
    grid.classList.add('vk-masonry');
    for (i = 0; i < n; i++) {
      var c = document.createElement('div');
      c.className = 'vk-col';
      grid.appendChild(c);
      cols.push(c);
      heights.push(0);
    }
    tiles.forEach(function (tile) {
      var s = 0;
      for (i = 1; i < n; i++) if (heights[i] < heights[s] - 0.001) s = i;
      cols[s].appendChild(tile);
      heights[s] += ratio(tile) + 0.03; /* 0.03 ~ the 18px gap */
    });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(layout, 250); /* after home.js's own resize handler */
  }

  layout();
  window.addEventListener('resize', schedule);
  window.addEventListener('load', layout);
  tiles.forEach(function (t) {
    var img = t.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', schedule);
  });
})();
