(() => {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const GAP = 18;
  const tiles = Array.from(document.querySelectorAll('#portfolio .tile'));
  let ready = false;

  function ratioOf(tile) {
    const img = tile.querySelector('img');
    if (img && img.naturalWidth > 0) return img.naturalHeight / img.naturalWidth;
    const w = +tile.dataset.w, h = +tile.dataset.h;
    return w && h ? h / w : 1;
  }

  function layout() {
    if (window.innerWidth <= 900) { grid.classList.remove('mj'); return; }
    const n = window.innerWidth > 1100 ? 3 : 2;
    const colW = (grid.clientWidth - GAP * (n - 1)) / n;
    const old = Array.from(grid.querySelectorAll('.grid-col'));
    const cols = Array.from({ length: n }, () => {
      const d = document.createElement('div');
      d.className = 'grid-col';
      return d;
    });
    const hs = new Array(n).fill(0);
    tiles.forEach(t => {
      if (t.dataset.broken) return;
      const k = hs.indexOf(Math.min(...hs));
      cols[k].appendChild(t);
      hs[k] += colW * ratioOf(t) + GAP;
    });
    cols.forEach(c => grid.appendChild(c));
    old.forEach(c => c.remove());
    grid.classList.add('mj');
  }

  const imgs = tiles.map(t => t.querySelector('img')).filter(Boolean);
  const waits = imgs.map(img => new Promise(res => {
    if (img.complete) return res();
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
  }));

  Promise.race([Promise.all(waits), new Promise(r => setTimeout(r, 5000))]).then(() => {
    imgs.forEach(img => {
      if (img.complete && img.naturalWidth === 0) {
        const t = img.closest('.tile');
        t.dataset.broken = '1';
        t.style.display = 'none';
      }
    });
    ready = true;
    layout();
  });

  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (ready) layout(); }, 250);
  });
})();
