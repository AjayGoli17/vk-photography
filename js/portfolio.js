document.addEventListener('DOMContentLoaded', () => {
    
    // Set Dynamic Year in Footer
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    const gallery = document.getElementById('gallery');
    const totalPhotos = 39; 

    // 1. Generate 39 gallery items with randomized layout
    for (let i = 1; i <= totalPhotos; i++) {
        const item = document.createElement('div');
        
        // Randomly assign format: ~40% chance for landscape, ~60% for portrait
        // This removes the repeating pattern while keeping a balanced mix
        const isLandscape = Math.random() < 0.40;
        
        let imgUrl = "";

        if (isLandscape) {
            item.className = 'gallery-item landscape';
            // Requesting a landscape image seed
            imgUrl = `https://picsum.photos/seed/${i + 400}/1600/900`;
        } else {
            item.className = 'gallery-item portrait';
            // Requesting a portrait image seed
            imgUrl = `https://picsum.photos/seed/${i + 400}/900/1200`;
        }

        item.innerHTML = `
            <div class="gallery-image-wrapper">
                <img src="${imgUrl}" class="parallax-img" alt="Editorial Concept ${i}" loading="lazy">
            </div>
            <div class="item-overlay">
                <span>Archive No. ${i.toString().padStart(2, '0')}</span>
            </div>
        `;
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

    // 3. Smooth Parallax Scrolling Effect
    const parallaxImages = document.querySelectorAll('.parallax-img');
    let ticking = false;
    
    function updateParallax() {
        if (window.innerWidth <= 768) return; // masonry layout on mobile doesn't use parallax offset
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;

        parallaxImages.forEach(img => {
            const rect = img.parentElement.getBoundingClientRect();
            // Check if element is in viewport
            if (rect.top <= windowHeight && rect.bottom >= 0) {
                // Calculate parallax offset based on scroll position
                const yPos = (rect.top / windowHeight) * 20 - 10; 
                img.style.transform = `translateY(${yPos}%)`;
            }
        });
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });
    
    // Trigger once on load
    updateParallax();
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
