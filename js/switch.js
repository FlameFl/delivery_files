const segmented = document.querySelector('.segmented');
const tabs = [...segmented.querySelectorAll('.segmented__btn')];
const thumb = segmented.querySelector('.segmented__thumb');
const panels = [...document.querySelectorAll('.panel')];

let active = 'order';

// pointer/drag state
let pointerDown = false;
let dragging = false;
let startX = 0;
let startPx = 0;
let pointerId = null;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function metrics() {
  const rect = segmented.getBoundingClientRect();
  const pad = 0.4;      // .segmented padding
  const inset = 4;    // .segmented__thumb inset
  const innerW = rect.width - pad * 2;

  const thumbW = innerW / 2;
  const trackW = innerW - thumbW - inset*2;

  return { trackW };
}

function setThumbPx(px, animate = true) {
  thumb.style.transition = animate
    ? 'transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease'
    : 'none';
  thumb.style.transform = `translateX(${px}px)`;
}

function setActive(tabName, focus = false) {
  active = tabName === 'sub' ? 'sub' : 'order';
  segmented.dataset.active = active;

  tabs.forEach(btn => {
    const on = btn.dataset.tab === active;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
    if (on && focus) btn.focus();
  });

  panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === active));

  const { trackW } = metrics();
  setThumbPx(active === 'sub' ? trackW : 0, true);
}

function pulse() {
  segmented.classList.add('is-animating');
  clearTimeout(segmented._t);
  segmented._t = setTimeout(() => segmented.classList.remove('is-animating'), 280);
}

// Click
tabs.forEach(btn => {
  btn.addEventListener('click', (e) => {
    // ignor click if dragging
    if (dragging) return;
    pulse();
    setActive(btn.dataset.tab);
  });
});

// drag + tap
segmented.addEventListener('pointerdown', (e) => {
  pointerDown = true;
  dragging = false;
  pointerId = e.pointerId;

  startX = e.clientX;
  const { trackW } = metrics();
  startPx = active === 'sub' ? trackW : 0;

  segmented.setPointerCapture(pointerId);
});

segmented.addEventListener('pointermove', (e) => {
  if (!pointerDown) return;

  const dx = e.clientX - startX;

  const THRESHOLD = 10;

  if (!dragging) {
    if (Math.abs(dx) < THRESHOLD) return;
    dragging = true;
    setThumbPx(startPx, false);
  }

  const { trackW } = metrics();
  const nextPx = clamp(startPx + dx, 0, trackW);
  setThumbPx(nextPx, false);
});

function finishPointer(e) {
  if (!pointerDown) return;
  pointerDown = false;

  try { segmented.releasePointerCapture(pointerId); } catch {}
  pointerId = null;

  if (dragging) {
    const { trackW } = metrics();

    const cs = getComputedStyle(thumb);
    const tr = cs.transform;
    let currentPx = startPx;
    if (tr && tr !== 'none') {
      const m = tr.match(/matrix\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(',').map(s => parseFloat(s.trim()));
        currentPx = parts[4] || 0; // tx
      }
    }

    const next = currentPx >= trackW / 2 ? 'sub' : 'order';
    pulse();
    setActive(next);

    setTimeout(() => { dragging = false; }, 0);
    return;
  }

  const el = document.elementFromPoint(e.clientX, e.clientY);
  const btn = el ? el.closest('.segmented__btn') : null;

  if (btn) {
    pulse();
    setActive(btn.dataset.tab);
  } else {
    const rect = segmented.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const next = x > rect.width / 2 ? 'sub' : 'order';
    pulse();
    setActive(next);
  }
}

segmented.addEventListener('pointerup', finishPointer);
segmented.addEventListener('pointercancel', finishPointer);

setActive('order');