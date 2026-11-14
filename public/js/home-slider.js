(function () {
var mq = window.matchMedia('(max-width: 640px)');
var track = document.getElementById('sliderTrack');
var viewport = track ? track.closest('.slider-viewport') : null;
var dotsWrap = document.getElementById('mobileProgressDots');
var countEl = document.getElementById('mobileProgressCount');
if (!track || !viewport || !dotsWrap || !countEl) return;
var cards = Array.prototype.slice.call(track.children).filter(function (c) {
return !c.hasAttribute('aria-hidden');
});
var total = cards.length;
cards.forEach(function (card, i) {
var dot = document.createElement('span');
dot.className = 'mobile-progress-dot';
dot.setAttribute('role', 'button');
dot.setAttribute('aria-label', 'Go to service ' + (i + 1) + ' of ' + total);
dot.addEventListener('click', function () {
card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
});
dotsWrap.appendChild(dot);
});
var dots = Array.prototype.slice.call(dotsWrap.children);
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function update() {
if (!mq.matches) return;
var center = viewport.scrollLeft + viewport.clientWidth / 2;
var closest = 0;
var closestDist = Infinity;
cards.forEach(function (card, i) {
var cardCenter = card.offsetLeft + card.offsetWidth / 2;
var dist = Math.abs(cardCenter - center);
if (dist < closestDist) { closestDist = dist; closest = i; }
});
dots.forEach(function (d, i) { d.classList.toggle('active', i === closest); });
countEl.textContent = pad(closest + 1) + ' / ' + pad(total);
}
var ticking = false;
viewport.addEventListener('scroll', function () {
if (ticking) return;
ticking = true;
window.requestAnimationFrame(function () { update(); ticking = false; });
}, { passive: true });
window.addEventListener('resize', update);
update();
})();
