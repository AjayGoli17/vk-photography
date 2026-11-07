/* ==========================================================================
   Page Transition — smooth white fade between every page
   Add this file + css/transition.css to every page. No other setup needed.
   ========================================================================== */
(function () {
  var DURATION = 700; // ms — keep in sync with --page-transition-duration in css/transition.css
  var overlay = document.querySelector('.page-transition-overlay');

  // Safety net: if the overlay markup was forgotten on a page, create it.
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    document.body.insertBefore(overlay, document.body.firstChild);
  }

  var isNavigating = false;

  function revealPage() {
    // Two rAFs so the browser commits the initial opaque frame first,
    // guaranteeing the fade is actually visible instead of being skipped.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('is-hidden');
      });
    });
  }

  function isInternalNavigableLink(link) {
    if (!link || !link.getAttribute) return false;
    if (link.hasAttribute('download')) return false;
    if (link.target && link.target !== '' && link.target !== '_self') return false;

    var href = link.getAttribute('href');
    if (!href) return false;
    if (href.indexOf('#') === 0) return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (err) {
      return false;
    }

    if (url.origin !== window.location.origin) return false;
    // Same-page anchor links shouldn't trigger a full white transition.
    if (url.pathname === window.location.pathname && url.hash) return false;

    return url;
  }

  document.addEventListener('click', function (e) {
    if (isNavigating) return;
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var link = e.target.closest('a');
    var url = isInternalNavigableLink(link);
    if (!url) return;

    e.preventDefault();
    isNavigating = true;

    overlay.classList.remove('is-hidden');
    overlay.classList.add('is-active');

    setTimeout(function () {
      window.location.href = url.href;
    }, DURATION);
  });

  // If the page is restored from bfcache (browser back/forward), reset the overlay.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      isNavigating = false;
      overlay.classList.remove('is-active');
      overlay.classList.add('is-hidden');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealPage);
  } else {
    revealPage();
  }
})();
