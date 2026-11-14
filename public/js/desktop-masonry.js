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

  // Pick the column for every tile so all columns end at (almost) the same
  // height -> no big empty gap under the shorter columns.
  function balance(hts, n) {
    const m = hts.length;
    function greedy() {
      const hs = new Array(n).fill(0), out = [];
      hts.forEach(h => { const k = hs.indexOf(Math.min(...hs)); out.push(k); hs[k] += h; });
      return out;
    }
    if (m > 15) return greedy();
    let best = greedy(), bestSpread = Infinity, bestMax = Infinity;
    const cur = new Array(m), hs = new Array(n).fill(0);
    (function walk(i) {
      if (i === m) {
        const mx = Math.max(...hs), mn = Math.min(...hs), spread = mx - mn;
        if (spread < bestSpread - 0.5 || (Math.abs(spread - bestSpread) <= 0.5 && mx < bestMax)) {
          bestSpread = spread; bestMax = mx; best = cur.slice();
        }
        return;
      }
      const seen = new Set();
      for (let k = 0; k < n; k++) {
        const key = Math.round(hs[k]);
        if (hs[k] === 0 && seen.has(key)) continue;
        seen.add(key);
        cur[i] = k; hs[k] += hts[i];
        walk(i + 1);
        hs[k] -= hts[i];
      }
    })(0);
    return best;
  }

  function layout() {
    if (window.innerWidth <= 900) {
      grid.classList.remove('mj');
      tiles.forEach(t => { t.style.height = ''; const im = t.querySelector('img'); if (im) { im.style.height = ''; im.style.objectFit = ''; } });
      return;
    }
    const n = window.innerWidth > 1100 ? 3 : 2;
    const colW = (grid.clientWidth - GAP * (n - 1)) / n;
    const old = Array.from(grid.querySelectorAll('.grid-col'));
    const cols = Array.from({ length: n }, () => {
      const d = document.createElement('div');
      d.className = 'grid-col';
      return d;
    });
    const visible = tiles.filter(t => !t.dataset.broken);
    const hts = visible.map(t => colW * ratioOf(t) + GAP);
    const assign = balance(hts, n);
    visible.forEach((t, i) => {
      t.style.height = '';
      const im = t.querySelector('img');
      if (im) { im.style.height = ''; im.style.objectFit = ''; }
      cols[assign[i]].appendChild(t);
    });

    // Make every column end at exactly the same height: stretch the tiles of
    // the shorter columns a little (photo is cropped slightly, not squashed).
    const sums = new Array(n).fill(0), counts = new Array(n).fill(0);
    visible.forEach((t, i) => { sums[assign[i]] += colW * ratioOf(t); counts[assign[i]]++; });
    const target = Math.max(...sums.map((s, k) => s + GAP * (counts[k] - 1)));
    visible.forEach((t, i) => {
      const k = assign[i];
      if (!counts[k]) return;
      const f = Math.min((target - GAP * (counts[k] - 1)) / sums[k], 1.4);
      if (f <= 1.001) return;
      t.style.height = (colW * ratioOf(t) * f) + 'px';
      const im = t.querySelector('img');
      if (im) { im.style.height = '100%'; im.style.objectFit = 'cover'; }
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
