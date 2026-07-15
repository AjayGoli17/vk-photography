/* ===========================================================
   Aperture & Co. — main site scripts
   =========================================================== */

/* -----------------------------------------------------------
   Portfolio grid/masonry layout switching + scroll reveal +
   services slider + mobile sidebar + about section reveal
   ----------------------------------------------------------- */
   const grid = document.getElementById('grid');
   const masonry = document.getElementById('masonry');
   // Keep a record of tiles in their original desktop order so we can
   // always restore that order when switching back from mobile.
   const originalOrder = Array.from(grid.children);
 
   function buildHybrid() {
     masonry.innerHTML = '';
     let i = 0;
     let blockPos = 0; // cycles 0,1 (full) then a paired row, then resets
     while (i < originalOrder.length) {
       if (blockPos < 2) {
         masonry.appendChild(originalOrder[i]);
         i += 1;
         blockPos += 1;
       } else {
         const row = document.createElement('div');
         row.className = 'pair-row';
         row.appendChild(originalOrder[i]);
         i += 1;
         if (originalOrder[i]) {
           row.appendChild(originalOrder[i]);
           i += 1;
         }
         masonry.appendChild(row);
         blockPos = 0;
       }
     }
   }
 
   function restoreGrid() {
     originalOrder.forEach(tile => grid.appendChild(tile));
   }
 
   function applyLayout() {
     const isMobile = window.innerWidth <= 900;
     if (isMobile) {
       buildHybrid();
       grid.classList.add('js-hidden');
       masonry.classList.add('js-active');
     } else {
       restoreGrid();
       grid.classList.remove('js-hidden');
       masonry.classList.remove('js-active');
     }
   }
 
   applyLayout();
 
   let resizeTimer;
   window.addEventListener('resize', () => {
     clearTimeout(resizeTimer);
     resizeTimer = setTimeout(applyLayout, 150);
   });
 
   // Scroll-reveal for portfolio tiles (works across both layouts,
   // since tiles are just moved between containers, not recreated)
   const observer = new IntersectionObserver((entries) => {
     entries.forEach((entry, i) => {
       if (entry.isIntersecting) {
         setTimeout(() => entry.target.classList.add('in-view'), i * 70);
         observer.unobserve(entry.target);
       }
     });
   }, { threshold: 0.1 });
 
   originalOrder.forEach(tile => observer.observe(tile));
 
   // Services slider: continuous slow auto-scroll driven by JS (so the
   // Prev/Next buttons can control the same position), seamless loop via
   // a duplicated card set.
   (() => {
     const track = document.getElementById('sliderTrack');
     const viewport = document.querySelector('.slider-viewport');
     const prevBtns = document.querySelectorAll('[data-nav="prev"]');
     const nextBtns = document.querySelectorAll('[data-nav="next"]');
     if (!track || !viewport) return;
 
     const originalCards = Array.from(track.children);
     originalCards.forEach(card => {
       const clone = card.cloneNode(true);
       clone.setAttribute('aria-hidden', 'true');
       track.appendChild(clone);
     });
 
     let pos = 0;
     let speed = 0.35;
     let paused = false;
     let resumeTimer = null;
     const gap = 22;
 
     const setWidth = () => originalCards.reduce((sum, c) => sum + c.offsetWidth + gap, 0);
     let loopWidth = setWidth();
     window.addEventListener('resize', () => { loopWidth = setWidth(); });
 
     function frame() {
       if (!paused) {
         pos += speed;
         if (pos >= loopWidth) pos -= loopWidth;
         track.style.transform = `translateX(${-pos}px)`;
       }
       requestAnimationFrame(frame);
     }
     requestAnimationFrame(frame);
 
     function pauseThenResume() {
       paused = true;
       clearTimeout(resumeTimer);
       resumeTimer = setTimeout(() => {
         track.style.transition = '';
         paused = false;
       }, 2200);
     }
 
     function step(dir) {
       const cardW = originalCards[0].offsetWidth + gap;
       pos += dir * cardW;
       if (pos < 0) pos += loopWidth;
       if (pos >= loopWidth) pos -= loopWidth;
       // Apply immediately (don't wait for the rAF loop, which is
       // about to be paused) with a short smooth transition
       track.style.transition = 'transform 0.5s cubic-bezier(.2,.8,.2,1)';
       track.style.transform = `translateX(${-pos}px)`;
       pauseThenResume();
     }
 
     prevBtns.forEach(btn => btn.addEventListener('click', () => step(-1)));
     nextBtns.forEach(btn => btn.addEventListener('click', () => step(1)));
     viewport.addEventListener('mouseenter', () => { paused = true; });
     viewport.addEventListener('mouseleave', () => { clearTimeout(resumeTimer); paused = false; });
 
     if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
       speed = 0;
     }
   })();
 
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
 
   // About section reveal: line-mask heading + staggered description,
   // triggered once when the section enters the viewport
   (() => {
     const aboutEl = document.querySelector('.about-section');
     if (!aboutEl) return;
     const aboutObserver = new IntersectionObserver(([entry]) => {
       if (entry.isIntersecting) {
         aboutEl.classList.add('is-visible');
         aboutEl.querySelectorAll('[data-su]').forEach(el => el.classList.add('is-visible'));
         aboutObserver.disconnect();
       }
     }, { threshold: 0.15 });
     aboutObserver.observe(aboutEl);
   })();
 
 /* -----------------------------------------------------------
    Testimonials carousel
    ----------------------------------------------------------- */
   // Testimonials carousel (merged from sample1.html), scoped in its own IIFE
   // and using the renamed tc-prefixed ids so it can't clash with anything
   // else on the page.
   (() => {
     const items=[
       {quote:"Absolutely loved the photos. Every moment was captured beautifully.",name:"Emma Watson",role:"Bride"},
       {quote:"Creative team with an eye for detail. Fantastic experience.",name:"Michael Ross",role:"Groom"},
       {quote:"Portraits looked cinematic and editing was flawless.",name:"Sophia Lee",role:"Model"},
       {quote:"Professional from booking to delivery. Highly recommended!",name:"Daniel Kim",role:"Entrepreneur"}
     ];
 
     const w=document.getElementById('tcW');
     const dotsWrap=document.getElementById('tcDots');
     if (!w || !dotsWrap) return;
 
     const cards=items.map((x,i)=>{
       const d=document.createElement('div');
       d.className='tc-card';
       d.innerHTML=`<div class="tc-quote" aria-hidden="true">&#10078;</div>
         <blockquote>${x.quote}</blockquote>
         <div class="tc-user">
           <div><div class="tc-name">${x.name}</div><div class="tc-role">${x.role}</div></div>
         </div>`;
       w.appendChild(d);
       d.addEventListener('click',()=>{ c=i; draw(); resetTimer(); });
       return d;
     });
 
     const dots=items.map((_,i)=>{
       const b=document.createElement('button');
       b.className='tc-dot';
       b.setAttribute('aria-label',`Go to testimonial ${i+1}`);
       b.addEventListener('click',()=>{ c=i; draw(); resetTimer(); });
       dotsWrap.appendChild(b);
       return b;
     });
 
     let c=0;
     const n=items.length;
 
     function draw(){
       cards.forEach((el,i)=>{
         const o=(i-c+n)%n;
         const cfg=[
           {x:0,z:80,s:1,r:0,op:1,b:0},
           {x:260,z:-120,s:.82,r:-18,op:.5,b:2},
           {x:0,z:-340,s:.62,r:0,op:.12,b:5},
           {x:-260,z:-120,s:.82,r:18,op:.5,b:2}
         ][o] || {x:0,z:-400,s:.5,r:0,op:0,b:6};
         el.style.transform=`translate(-50%,-50%) translate3d(${cfg.x}px,0,${cfg.z}px) rotateY(${cfg.r}deg) scale(${cfg.s})`;
         el.style.opacity=cfg.op;
         el.style.filter=`blur(${cfg.b}px)`;
         el.style.zIndex=10-o;
         el.setAttribute('aria-hidden', o===0 ? 'false' : 'true');
       });
       dots.forEach((d,i)=>d.classList.toggle('active', i===c));
     }
 
     let timer;
     function resetTimer(){
       clearInterval(timer);
       timer=setInterval(()=>{ c=(c+1)%n; draw(); }, 1200);
     }
 
     document.getElementById('tcNext').addEventListener('click',()=>{ c=(c+1)%n; draw(); resetTimer(); });
     document.getElementById('tcPrev').addEventListener('click',()=>{ c=(c-1+n)%n; draw(); resetTimer(); });
 
     w.addEventListener('mouseenter',()=>clearInterval(timer));
     w.addEventListener('mouseleave',resetTimer);
 
     draw();
     resetTimer();
   })();
 
 /* -----------------------------------------------------------
    Footer year + newsletter form
    ----------------------------------------------------------- */
   (() => {
     const yearEl = document.getElementById('footerYear');
     if (yearEl) yearEl.textContent = new Date().getFullYear();
 
     const form = document.getElementById('footerNewsletterForm');
     const note = document.getElementById('footerNewsletterNote');
     if (!form || !note) return;
 
     form.addEventListener('submit', (e) => {
       e.preventDefault();
       note.textContent = 'Thanks — you\'re on the list.';
       form.reset();
     });
   })();