document.addEventListener("DOMContentLoaded", () => {
  const box = document.querySelector(".input_container");
  const input = document.getElementById("search-input-id");
  if (!box || !input) return;

  let raf = 0;

  function animateProgress(to, duration) {
    cancelAnimationFrame(raf);

    const from = parseFloat(getComputedStyle(box).getPropertyValue("--p")) || 0;
    const start = performance.now();

    const ease = (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (to - from) * ease(t);
      box.style.setProperty("--p", v.toFixed(4));
      if (t < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
  }

  input.addEventListener("focus", () => animateProgress(1, 520));
  input.addEventListener("blur",  () => animateProgress(0, 220));
});
