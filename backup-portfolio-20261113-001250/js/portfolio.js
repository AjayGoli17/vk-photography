document.addEventListener('DOMContentLoaded', async () => {
    const gallery = document.getElementById('gallery');
    const totalPhotos = 40; // number of files: portfolio/portfolio1.webp ... portfolioN.webp

    // Load a photo and read its REAL size (tries .webp, .jpg, .jpeg, .png)
    function loadPhoto(n) {
        return new Promise(resolve => {
            const exts = ['webp', 'jpg', 'jpeg', 'png'];
            const tryLoad = i => {
                if (i >= exts.length) {
                    console.warn('portfolio' + n + ' not found in portfolio/');
                    return resolve(null);
                }
                const im = new Image();
                im.onload = () => resolve({ n, src: im.src, w: im.naturalWidth, h: im.naturalHeight });
                im.onerror = () => tryLoad(i + 1);
                im.src = `portfolio/portfolio${n}.${exts[i]}`;
            };
            tryLoad(0);
        });
    }

    const photos = (await Promise.all(
        Array.from({ length: totalPhotos }, (_, k) => loadPhoto(k + 1))
    )).filter(Boolean);

    // Build masonry items (CSS columns place them)
    photos.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.index = idx;
        item.style.setProperty('--r', (p.w / p.h).toFixed(5));
        item.innerHTML = `
            <div class="gallery-image-wrapper">
                <img src="${p.src}" width="${p.w}" height="${p.h}" loading="lazy" class="parallax-img" alt="Photography portfolio ${p.n}">
            </div>
            <div class="item-overlay"><span>Archive No. ${String(p.n).padStart(2, '0')}</span></div>`;
        gallery.appendChild(item);
    });

    // Lightbox
    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.innerHTML = `<button class="lb-close" aria-label="Close">&times;</button>
        <button class="lb-prev" aria-label="Previous">&#8249;</button>
        <img alt="">
        <button class="lb-next" aria-label="Next">&#8250;</button>
        <div class="lb-count"></div>`;
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img'), lbCount = lb.querySelector('.lb-count');
    let cur = 0;
    const show = i => {
        cur = (i + photos.length) % photos.length;
        lbImg.src = photos[cur].src;
        lbCount.textContent = `${cur + 1} / ${photos.length}`;
    };
    const open = i => { show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };

    gallery.addEventListener('click', e => {
        const it = e.target.closest('.gallery-item');
        if (it) open(+it.dataset.index);
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

    // Scroll reveal
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    document.querySelectorAll('.gallery-item').forEach((item, idx) => {
        item.style.transitionDelay = `${(idx % 3) * 0.12}s`;
        observer.observe(item);
    });

    const ctaHeading = document.querySelector('.cta-section h2');
    const ctaButton = document.querySelector('.cta-button');
    if (ctaHeading) observer.observe(ctaHeading);
    if (ctaButton) { ctaButton.style.transitionDelay = '0.2s'; observer.observe(ctaButton); }
});

/* === VK-CAPTIONS: per-photo captions (shown in the hover overlay) === */
(function () {
    const captions = {
        1:  { t: "Rooted in Love",               c: "Maternity" },
        2:  { t: "Golden Hour Promise",          c: "Maternity" },
        4:  { t: "The Quiet Glow",               c: "Maternity" },
        5:  { t: "After the Rain",               c: "Maternity" },
        6:  { t: "A Night to Remember",          c: "Couple" },
        7:  { t: "Palace Evenings",              c: "Couple" },
        8:  { t: "Close Enough to Whisper",      c: "Couple" },
        9:  { t: "Timeless Elegance",            c: "Portrait" },
        10: { t: "Grace in Silk",                c: "Maternity" },
        11: { t: "Written in the Clouds",        c: "Couple" },
        12: { t: "Under the Streetlight",        c: "Couple" },
        13: { t: "Our Little Surprise",          c: "Family" },
        14: { t: "Pure Happiness",               c: "Pre-Wedding" },
        15: { t: "Together, Always",             c: "Couple" },
        16: { t: "Hold Me Close",                c: "Couple" },
        17: { t: "City Lights and Us",           c: "Pre-Wedding" },
        18: { t: "Shy Smile",                    c: "Portrait" },
        19: { t: "Waiting in the Glow",          c: "Maternity" },
        20: { t: "Joy in Every Frame",           c: "Haldi" },
        21: { t: "Silhouette of Grace",          c: "Portrait" },
        22: { t: "Back to Back, Heart to Heart", c: "Pre-Wedding" },
        23: { t: "Soft Whispers",                c: "Couple" },
        24: { t: "Under Two Rainbows",           c: "Proposal" },
        25: { t: "Little Steps, Big Smile",      c: "Kids" },
        26: { t: "Village Tales",                c: "Traditional" },
        27: { t: "A Kiss of Blessing",           c: "Haldi" },
        28: { t: "Daddy's Little Girl",          c: "Family" },
        29: { t: "Wide-Eyed Wonder",             c: "Kids" },
        30: { t: "The Yellow Squad",             c: "Haldi" },
        31: { t: "Little Pianist",               c: "Kids" },
        32: { t: "Hand in Hand",                 c: "Kids" },
        33: { t: "Among the Wild Grass",         c: "Kids" },
        34: { t: "Butterfly Wishes",             c: "Kids" },
        35: { t: "Old-World Romance",            c: "Couple" },
        36: { t: "Art Meets Motherhood",         c: "Maternity" },
        37: { t: "Swinging into Joy",            c: "Kids" },
        38: { t: "Rays of Love",                 c: "Couple" },
        39: { t: "Little Gentleman",             c: "Kids" },
        40: { t: "Moments Worth Keeping",        c: "Portrait" }
    };

    function applyCaption(item) {
        if (item.dataset.captioned) return;
        const img = item.querySelector('img');
        const span = item.querySelector('.item-overlay span');
        if (!img || !span) return;
        const m = /portfolio(\d+)\./.exec(img.getAttribute('src') || '');
        const cap = m && captions[Number(m[1])];
        if (!cap) return;
        span.textContent = cap.t;
        const old = item.querySelector('.item-overlay small');
        if (old) old.remove();
        const small = document.createElement('small');
        small.textContent = cap.c;
        span.after(small);
        img.alt = cap.t + ' - ' + cap.c + ' photography';
        item.dataset.captioned = '1';
    }

    document.addEventListener('DOMContentLoaded', function () {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;
        gallery.querySelectorAll('.gallery-item').forEach(applyCaption);
        new MutationObserver(function (muts) {
            muts.forEach(function (mu) {
                mu.addedNodes.forEach(function (n) {
                    if (n.nodeType === 1 && n.classList.contains('gallery-item')) applyCaption(n);
                });
            });
        }).observe(gallery, { childList: true });
    });
})();
/* === END VK-CAPTIONS === */


/* === VK-MASONRY: classic masonry, equal columns, no gaps, flush bottom === */
(function () {
    const GUTTER = 10; // space between photos in px (set to 0 for no space at all)

    const colsFor = w => w >= 1300 ? 4 : w >= 900 ? 3 : 2;

    function layout() {
        const g = document.getElementById('gallery');
        if (!g) return;
        const items = Array.from(g.querySelectorAll('.gallery-item'));
        const W = g.clientWidth;
        if (!items.length || !W) return;

        const gap = innerWidth <= 480 ? Math.min(GUTTER, 6) : GUTTER;
        const cols = colsFor(W);
        const colW = (W - gap * (cols - 1)) / cols;

        const ratio = it => {
            const im = it.querySelector('img');
            const w = im ? +im.getAttribute('width') : 0, h = im ? +im.getAttribute('height') : 0;
            return w && h ? w / h : 1.5;
        };

        // put every photo into the currently shortest column
        const colItems = Array.from({ length: cols }, () => []);
        const colH = new Array(cols).fill(0);
        items.forEach(it => {
            const h = colW / ratio(it);
            let c = 0;
            for (let i = 1; i < cols; i++) if (colH[i] < colH[c]) c = i;
            colItems[c].push({ it, h });
            colH[c] += h + gap;
        });

        // make all columns exactly the same height (tiny crop, invisible) so the bottom is flush
        const totals = colItems.map(list => list.reduce((a, o) => a + o.h, 0) + gap * (list.length - 1));
        const target = totals.reduce((a, b) => a + b, 0) / cols;

        g.style.setProperty('position', 'relative', 'important');
        g.style.setProperty('display', 'block', 'important');
        g.style.setProperty('columns', 'auto', 'important');
        g.style.setProperty('column-count', 'auto', 'important');
        g.style.setProperty('grid-template-columns', 'none', 'important');
        g.style.setProperty('height', target + 'px', 'important');

        colItems.forEach((list, c) => {
            if (!list.length) return;
            const sum = list.reduce((a, o) => a + o.h, 0);
            const f = (target - gap * (list.length - 1)) / sum;
            let top = 0;
            list.forEach(o => {
                const h = o.h * f;
                const s = o.it.style;
                s.setProperty('position', 'absolute', 'important');
                s.setProperty('left', (c * (colW + gap)).toFixed(2) + 'px', 'important');
                s.setProperty('top', top.toFixed(2) + 'px', 'important');
                s.setProperty('width', colW.toFixed(2) + 'px', 'important');
                s.setProperty('height', h.toFixed(2) + 'px', 'important');
                s.setProperty('margin', '0', 'important');
                s.setProperty('aspect-ratio', 'auto', 'important');
                s.setProperty('grid-column', 'auto', 'important');
                top += h + gap;
            });
        });
    }

    let t;
    const schedule = () => { clearTimeout(t); t = setTimeout(layout, 30); };

    document.addEventListener('DOMContentLoaded', function () {
        const g = document.getElementById('gallery');
        if (!g) return;
        new MutationObserver(schedule).observe(g, { childList: true });
        schedule();
    });
    window.addEventListener('load', schedule);
    window.addEventListener('resize', schedule);
})();
/* === END VK-MASONRY === */
