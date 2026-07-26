document.addEventListener('DOMContentLoaded', () => {

    // Set Dynamic Year in Footer
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    const gallery = document.getElementById('gallery');
    const totalPhotos = 35;

    // 1. Build gallery items from your local photos (portfolio/image1.jpg ... image39.jpg)
    //    Orientation (landscape/portrait) is auto-detected once each image loads.
    for (let i = 1; i <= totalPhotos; i++) {
        const item = document.createElement('div');
        item.className = 'gallery-item'; // orientation class added below once image loads

        const imgUrl = `portfolio/image${i}.webp`;

        item.innerHTML = `
            <div class="gallery-image-wrapper">
                <img src="${imgUrl}" class="parallax-img" alt="Editorial Concept ${i}" loading="lazy">
            </div>
            <div class="item-overlay">
                <span>Archive No. ${i.toString().padStart(2, '0')}</span>
            </div>
        `;

        const img = item.querySelector('img');

        // If .webp fails to load, automatically try .png instead
        img.addEventListener('error', () => {
            if (!img.dataset.triedPng) {
                img.dataset.triedPng = 'true';
                img.src = `portfolio/image${i}.png`;
            }
        }, { once: false });

        img.addEventListener('load', () => {
            if (img.naturalWidth >= img.naturalHeight) {
                item.classList.add('landscape');
            } else {
                item.classList.add('portrait');
            }
        });

        gallery.appendChild(item);
    }

    // 2. Scroll Reveal Animation (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach((item, index) => {
        // Stagger the load-in for items that appear in the viewport at the same time
        item.style.transitionDelay = `${(index % 3) * 0.15}s`;
        observer.observe(item);
    });

    // Reveal the CTA heading and button as they scroll into view,
    // with the button trailing slightly behind the heading
    const ctaHeading = document.querySelector('.cta-section h2');
    const ctaButton = document.querySelector('.cta-button');

    if (ctaHeading) {
        observer.observe(ctaHeading);
    }
    if (ctaButton) {
        ctaButton.style.transitionDelay = '0.2s';
        observer.observe(ctaButton);
    }

});
// Mobile sidebar: opens from the side when the hamburger button is
// tapped, closes via the X button, the overlay, Escape, or picking a link
(() => {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = document.getElementById('sidebarClose');
  if (!menuBtn || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', openSidebar);
  closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('.sidebar-links a').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
})();