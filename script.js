const questionView = document.getElementById('questionView');
const loadingView = document.getElementById('loadingView');
const resultView = document.getElementById('resultView');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const resetBtn = document.getElementById('resetBtn');
const buttonWrap = document.getElementById('buttonWrap');
const toast = document.getElementById('toast');
const sparkleField = document.getElementById('sparkleField');
const panel = document.getElementById('glassPanel');

let escapeCount = 0;
let answered = false;
let timer = null;
let toastTimer = null;
let resizeTimer = null;

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

function createSparkles(count = coarsePointer ? 12 : 18) {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'spark-particle';
    particle.style.setProperty('--size', `${Math.round(2 + Math.random() * 4)}px`);
    particle.style.setProperty('--left', `${Math.random() * 100}%`);
    particle.style.setProperty('--duration', `${9 + Math.random() * 8}s`);
    particle.style.setProperty('--delay', `${-Math.random() * 13}s`);
    particle.style.setProperty('--drift', `${-45 + Math.random() * 90}px`);
    fragment.appendChild(particle);
  }
  sparkleField.appendChild(fragment);
}

createSparkles();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1700);
}

function showView(view) {
  [questionView, loadingView, resultView].forEach((node) => {
    const active = node === view;
    node.hidden = !active;
    node.classList.toggle('active', active);
  });
}

function setButtonPosition(button, x, y) {
  button.style.setProperty('--x', `${Math.round(x)}px`);
  button.style.setProperty('--y', `${Math.round(y)}px`);
}

function getElementRectInWrap(element) {
  const wrapRect = buttonWrap.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left - wrapRect.left,
    top: rect.top - wrapRect.top,
    right: rect.right - wrapRect.left,
    bottom: rect.bottom - wrapRect.top,
    width: rect.width,
    height: rect.height,
  };
}

function overlaps(a, b, gap = 0) {
  return !(
    a.right + gap <= b.left ||
    a.left - gap >= b.right ||
    a.bottom + gap <= b.top ||
    a.top - gap >= b.bottom
  );
}

function layoutButtons() {
  const wrapWidth = buttonWrap.clientWidth;
  const wrapHeight = buttonWrap.clientHeight;
  const yesWidth = yesBtn.offsetWidth;
  const yesHeight = yesBtn.offsetHeight;
  const noWidth = noBtn.offsetWidth;
  const noHeight = noBtn.offsetHeight;
  const isSmall = window.innerWidth <= 470;
  const gap = isSmall ? 18 : 26;

  if (isSmall) {
    setButtonPosition(yesBtn, (wrapWidth - yesWidth) / 2, 10);
    setButtonPosition(noBtn, (wrapWidth - noWidth) / 2, Math.min(86, wrapHeight - noHeight - 8));
  } else {
    const centerGap = Math.max(gap, 0);
    const combined = yesWidth + noWidth + centerGap;
    const start = Math.max(8, (wrapWidth - combined) / 2);
    const top = Math.max(18, (wrapHeight - yesHeight) / 2);
    setButtonPosition(yesBtn, start, top);
    setButtonPosition(noBtn, start + yesWidth + centerGap, top);
  }

  noBtn.dataset.moved = 'false';
}

function getSafeMovePosition() {
  const wrapWidth = buttonWrap.clientWidth;
  const wrapHeight = buttonWrap.clientHeight;
  const noWidth = noBtn.offsetWidth;
  const noHeight = noBtn.offsetHeight;
  const yesRect = getElementRectInWrap(yesBtn);
  const currentX = parseFloat(noBtn.style.getPropertyValue('--x')) || 0;
  const currentY = parseFloat(noBtn.style.getPropertyValue('--y')) || 0;
  const isSmall = window.innerWidth <= 470;
  const edge = isSmall ? 8 : 10;
  const safeGap = isSmall ? 22 : 16;
  const minTop = isSmall ? yesRect.bottom + 16 : edge;
  const maxX = Math.max(edge, wrapWidth - noWidth - edge);
  const maxY = Math.max(minTop, wrapHeight - noHeight - edge);

  let best = null;
  let bestScore = -Infinity;

  // Choose a destination that is separated from the Yes button and
  // not too close to the current location, so the movement feels natural.
  for (let i = 0; i < 28; i += 1) {
    const x = edge + Math.random() * Math.max(1, maxX - edge);
    const y = minTop + Math.random() * Math.max(1, maxY - minTop);
    const candidate = { left: x, top: y, right: x + noWidth, bottom: y + noHeight };

    if (overlaps(candidate, yesRect, safeGap)) continue;

    const dx = x - currentX;
    const dy = y - currentY;
    const distance = Math.hypot(dx, dy);
    const targetDistance = isSmall ? 90 : 120;
    const distanceScore = Math.max(0, 1 - Math.abs(distance - targetDistance) / (targetDistance + 1));
    const edgePenalty = Math.min(x, y, wrapWidth - (x + noWidth), wrapHeight - (y + noHeight));
    const score = distanceScore * 2 + Math.max(0, edgePenalty / 80);

    if (score > bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }

  if (best) return best;

  // Fallback: move within the lower/side area while still respecting the Yes button.
  const fallbackY = isSmall
    ? Math.min(maxY, yesRect.bottom + safeGap)
    : Math.min(maxY, Math.max(edge, currentY + 48));
  return {
    x: Math.min(maxX, Math.max(edge, currentX + (currentX < wrapWidth / 2 ? 78 : -78))),
    y: fallbackY,
  };
}

function moveNoButton() {
  if (answered) return;

  escapeCount += 1;
  const { x, y } = getSafeMovePosition();
  setButtonPosition(noBtn, x, y);
  noBtn.dataset.moved = 'true';

  const messages = [
    'Nope 😏',
    'Too slow! ✨',
    'Try again 😂',
    'Nice try 💗',
    'Catch me first! 🏃‍♀️',
    'Still no 😈'
  ];
  noBtn.textContent = messages[Math.min(escapeCount - 1, messages.length - 1)];

  if (escapeCount === 3) showToast('The “No” button has trust issues 😂');
  if (escapeCount === 6) showToast('Maybe your heart already knows… 💗');
}

function restoreNoButton() {
  escapeCount = 0;
  noBtn.textContent = 'No';
  layoutButtons();
}

function answerYes() {
  if (answered) return;
  answered = true;
  showView(loadingView);
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    showView(resultView);
    showToast('Aww… that means everything. 💗');
  }, 1650);
}

function reset() {
  window.clearTimeout(timer);
  answered = false;
  restoreNoButton();
  showView(questionView);
}

if (finePointer) {
  noBtn.addEventListener('pointerenter', moveNoButton);
}

noBtn.addEventListener('focus', () => {
  if (finePointer) moveNoButton();
});

noBtn.addEventListener('click', (event) => {
  event.preventDefault();
  moveNoButton();
});

noBtn.addEventListener('touchstart', (event) => {
  event.preventDefault();
  moveNoButton();
}, { passive: false });

yesBtn.addEventListener('click', answerYes);
resetBtn.addEventListener('click', reset);

window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    layoutButtons();
  }, 80);
}, { passive: true });

if (finePointer) {
  let raf = 0;
  let px = 0;
  let py = 0;
  window.addEventListener('pointermove', (event) => {
    px = event.clientX;
    py = event.clientY;
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      const x = (px / window.innerWidth - 0.5) * 2;
      const y = (py / window.innerHeight - 0.5) * 2;
      panel.style.transform = `perspective(1400px) rotateX(${(-y * 1.05).toFixed(2)}deg) rotateY(${(x * 1.2).toFixed(2)}deg)`;
    });
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    panel.style.transform = 'none';
  }, { passive: true });
}

function init() {
  layoutButtons();
}

if (document.fonts?.ready) {
  document.fonts.ready.then(init);
} else {
  init();
}
