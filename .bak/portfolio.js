/* VK Photography – Portfolio
   Justified-row gallery (every row fills the full width, no gaps),
   category filters, lightbox with swipe, scroll reveal. */
document.addEventListener('DOMContentLoaded', async () => {
    const gallery = document.getElementById('gallery');
    const filterBar = document.getElementById('filters');
    const totalPhotos = 40; // portfolio/portfolio1 ... portfolio40 (missing numbers are skipped)

    const captions = {
        1:  ["Rooted in Love", "Maternity"],            2:  ["Golden Hour Promise", "Maternity"],
        4:  ["The Quiet Glow", "Maternity"],            5:  ["After the Rain", "Maternity"],
        6:  ["A Night to Remember", "Couple"],          7:  ["Palace Evenings", "Couple"],
        8:  ["Close Enough to Whisper", "Couple"],      9:  ["Timeless Elegance", "Portrait"],
        10: ["Grace in Silk", "Maternity"],             11: ["Written in the Clouds", "Couple"],
        12: ["Under the Streetlight", "Couple"],        13: ["Our Little Surprise", "Family"],
        14: ["Pure Happiness", "Pre-Wedding"],          15: ["Together, Always", "Couple"],
        16: ["Hold Me Close", "Couple"],                17: ["City Lights and Us", "Pre-Wedding"],
        18: ["Shy Smile", "Portrait"],                  19: ["Waiting in the Glow", "Maternity"],
        20: ["Joy in Every Frame", "Haldi"],            21: ["Silhouette of Grace", "Portrait"],
        22: ["Back to Back, Heart to Heart", "Pre-Wedding"], 23: ["Soft Whispers", "Couple"],
        24: ["Under Two Rainbows", "Proposal"],         25: ["Little Steps, Big Smile", "Kids"],
        26: ["Village Tales", "Traditional"],           27: ["A Kiss of Blessing", "Haldi"],
        28: ["Daddy's Little Girl", "Family"],          29: ["Wide-Eyed Wonder", "Kids"],
        30: ["The Yellow Squad", "Haldi"],              31: ["Little Pianist", "Kids"],
        32: ["Hand in Hand", "Kids"],                   33: ["Among the Wild Grass", "Kids"],
        34: ["Butterfly Wishes", "Kids"],               35: ["Old-World Romance", "Couple"],
        36: ["Art Meets Motherhood", "Maternity"],      37: ["Swinging into Joy", "Kids"],
        38: ["Rays of Love", "Couple"],                 39: ["Little Gentleman", "Kids"],
        40: ["Moments Worth Keeping", "Portrait"]
    };

    /* ---------- load photos (real sizes) ---------- */
    const exts = ['webp', 'jpg', 'jpeg', 'png'];
    const loadPhoto = n => new Promise(resolve => {
        const tryLoad = i => {
            if (i >= exts.length) return resolve(null);
            const im = new Image();
            im.onload = () => resolve({ n, src: im.src, w: im.naturalWidth, h: im.naturalHeight });
            im.onerror = () => tryLoad(i + 1);
            im.src = `portfolio/portfolio${n}.${exts[i]}`;
        };
        tryLoad(0);
    });
    const photos = (await Promise.all(Array.from({ length: totalPhotos }, (_, k) => loadPhoto(k + 1))))
        .filter(Boolean);

    /* ---------- build items ---------- */
    photos.forEach((p, idx) => {
        const [title, cat] = captions[p.n] || ['Archive No. ' + String(p.n).padStart(2, '0'), 'Gallery'];
        p.title = title; p.cat = cat; p.ratio = p.w / p.h;
        const item = document.createElement('figure');
        item.className = 'gallery-item';
        item.dataset.index = idx;
        item.dataset.cat = cat;
        item.innerHTML = `
            <img src="${p.src}" width="${p.w}" height="${p.h}" loading="lazy" alt="${title} - ${cat} photography">
            <figcaption class="item-overlay"><span>${title}</span><small>${cat}</small></figcaption>`;
        p.el = item;
        gallery.appendChild(item);
    });

    /* ---------- filters ---------- */
    let active = 'All';
    const cats = ['All', ...Array.from(new Set(photos.map(p => p.cat)))
        .sort((a, b) => photos.filter(p => p.cat === b).length - photos.filter(p => p.cat === a).length)];
    filterBar.innerHTML = cats.map(c =>
        `<button type="button" class="filter-btn${c === 'All' ? ' active' : ''}" data-cat="${c}">${c}</button>`).join('');
    filterBar.addEventListener('click', e => {
        const b = e.target.closest('.filter-btn');
        if (!b || b.dataset.cat === active) return;
        active = b.dataset.cat;
        filterBar.querySelectorAll('.filter-btn').forEach(x => x.classList.toggle('active', x === b));
        gallery.classList.add('is-switching');
        setTimeout(() => {
            photos.forEach(p => { p.el.hidden = !(active === 'All' || p.cat === active); });
            layout();
            gallery.classList.remove('is-switching');
            observeItems();
        }, 250);
    });

    /* ---------- justified layout ---------- */
    const gapPx    = () => innerWidth <= 480 ? 6 : innerWidth <= 768 ? 10 : 16;
    const targetH  = () => { const w = innerWidth; return w > 1400 ? 340 : w > 1000 ? 280 : w > 700 ? 220 : w > 480 ? 190 : 170; };

    function layout() { return;
        const list = photos.filter(p => !p.el.hidden);
        const W = gallery.clientWidth;
        if (!list.length || !W) return;
        const gap = gapPx(), target = targetH();
        gallery.style.gap = gap + 'px';

        const rows = []; let row = [], sum = 0;
        list.forEach(p => {
            row.push(p); sum += p.ratio;
            if (sum * target + gap * (row.length - 1) >= W) { rows.push(row); row = []; sum = 0; }
        });
        if (row.length) rows.push(row);

        // last row too short to fill nicely -> fold it into the previous row
        if (rows.length > 1) {
            const last = rows[rows.length - 1];
            const s = last.reduce((a, p) => a + p.ratio, 0);
            if ((W - gap * (last.length - 1)) / s > target * 1.35) {
                rows.pop();
                rows[rows.length - 1] = rows[rows.length - 1].concat(last);
            }
        }

        rows.forEach(r => {
            const s = r.reduce((a, p) => a + p.ratio, 0);
            const h = (W - gap * (r.length - 1)) / s;
            let used = 0;
            r.forEach((p, k) => {
                const w = k === r.length - 1 ? W - used : Math.floor(p.ratio * h);
                p.el.style.width = w + 'px';
                p.el.style.height = h.toFixed(2) + 'px';
                used += w + gap;
            });
        });
    }
    let rt;
    const relayout = () => { clearTimeout(rt); rt = setTimeout(layout, 60); };
    window.addEventListener('resize', relayout);
    window.addEventListener('load', relayout);
    layout();

    /* ---------- scroll reveal ---------- */
    const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-visible'); obs.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    function observeItems() {
        photos.forEach((p, i) => {
            if (p.el.hidden || p.el.classList.contains('is-visible')) return;
            p.el.style.transitionDelay = `${(i % 4) * 0.08}s`;
            io.observe(p.el);
        });
    }
    observeItems();
    document.querySelectorAll('.cta-section h2, .cta-button').forEach(el => io.observe(el));

    /* ---------- lightbox ---------- */
    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.innerHTML = `<button class="lb-close" aria-label="Close">&times;</button>
        <button class="lb-prev" aria-label="Previous">&#8249;</button>
        <figure><img alt=""><figcaption></figcaption></figure>
        <button class="lb-next" aria-label="Next">&#8250;</button>
        <div class="lb-count"></div>`;
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption'), lbCount = lb.querySelector('.lb-count');
    let order = [], cur = 0;
    const show = i => {
        cur = (i + order.length) % order.length;
        const p = order[cur];
        lbImg.src = p.src; lbImg.alt = p.title;
        lbCap.innerHTML = `${p.title} <small>${p.cat}</small>`;
        lbCount.textContent = `${cur + 1} / ${order.length}`;
    };
    const open = p => {
        order = photos.filter(x => !x.el.hidden);   // navigate within the current filter
        show(order.indexOf(p));
        lb.classList.add('open'); document.body.style.overflow = 'hidden';
    };
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
    gallery.addEventListener('click', e => {
        const it = e.target.closest('.gallery-item');
        if (it) open(photos[+it.dataset.index]);
    });
    lb.querySelector('.lb-close').onclick = close;
    lb.querySelector('.lb-prev').onclick = () => show(cur - 1);
    lb.querySelector('.lb-next').onclick = () => show(cur + 1);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(cur - 1);
        if (e.key === 'ArrowRight') show(cur + 1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
        x0 = null;
    });
});
