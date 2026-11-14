(function () {
  var navToggle = document.getElementById('navToggle');
  var navMobile = document.getElementById('navMobile');
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('open');
      navMobile.classList.toggle('open');
    });
  }
  var footerYearEl = document.getElementById('footerYear');
  if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();
})();
