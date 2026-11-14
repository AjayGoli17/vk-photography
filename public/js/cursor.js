(function () {
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'vk-cursor-dot';
  var ring = document.createElement('div');
  ring.className = 'vk-cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  var mx = -100, my = -100, rx = -100, ry = -100;
  var active = false;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    if (!active) {
      active = true;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }
  });

  document.addEventListener('mouseleave', function () {
    active = false;
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });

  function loop() {
    rx += (mx - rx) * 0.2;
    ry += (my - ry) * 0.2;
    dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
    requestAnimationFrame(loop);
  }
  loop();
})();
