document.addEventListener('DOMContentLoaded', async () => {
    const gallery = document.getElementById('gallery');
    const totalPhotos = 39; // number of files: portfolio/portfolio1.webp ... portfolioN.webp

    // Load a photo and read its REAL size (tries .webp, then .png)
    function loadPhoto(n) {
        return new Promise(resolve => {
            const tryLoad = (ext, fallback) => {
                const im = new Image();
                im.onload = () => resolve({ n, src: im.src, w: im.naturalWidth, h: im.naturalHeight });
                im.onerror = () => fallback ? tryLoad('png', false) : resolve(null);
                im.src = `portfolio/portfolio${n}.${ext}`;
            };
            tryLoad('webp', true);
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
