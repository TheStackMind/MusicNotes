// ---------- Note data ----------
// step 0..7 = C4 (middle C, ledger line) up to C5.
// y = 140 - 10*step places notes on a standard treble staff
// (staff lines at y = 40,60,80,100,120 for F5,D5,B4,G4,E4).
const NOTES = [
  { step: 0, letter: 'C', octave: 4, freq: 261.63, ledger: true },
  { step: 1, letter: 'D', octave: 4, freq: 293.66 },
  { step: 2, letter: 'E', octave: 4, freq: 329.63 },
  { step: 3, letter: 'F', octave: 4, freq: 349.23 },
  { step: 4, letter: 'G', octave: 4, freq: 392.00 },
  { step: 5, letter: 'A', octave: 4, freq: 440.00 },
  { step: 6, letter: 'B', octave: 4, freq: 493.88 },
  { step: 7, letter: 'C', octave: 5, freq: 523.25 },
];

const NOTE_X = 230; // fixed horizontal position for the single note in play

function noteSetFor(difficulty) {
  return difficulty === 'easy' ? NOTES.slice(0, 5) : NOTES;
}

function uniqueLetters(notes) {
  const seen = [];
  for (const n of notes) if (!seen.includes(n.letter)) seen.push(n.letter);
  return seen;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- State ----------
const state = {
  mode: null,        // 'letter' | 'place'
  difficulty: 'easy',
  currentNote: null,
  stars: 0,
  totalStars: Number(localStorage.getItem('noteExplorerStars') || 0),
  awaitingNext: false,
  dragging: false,
  timers: [],
};

function scheduleTimeout(fn, delay) {
  const id = setTimeout(() => {
    state.timers = state.timers.filter((t) => t !== id);
    fn();
  }, delay);
  state.timers.push(id);
  return id;
}

function clearAllTimers() {
  state.timers.forEach((id) => clearTimeout(id));
  state.timers = [];
}

// ---------- Audio ----------
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, { duration = 0.5, delay = 0, type = 'sine', gain = 0.25 } = {}) {
  const ctx = getAudioCtx();
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playNoteSound(freq) {
  playTone(freq, { duration: 0.7, type: 'sine', gain: 0.3 });
}

function playCorrectChime() {
  playTone(523.25, { duration: 0.18, delay: 0 });
  playTone(659.25, { duration: 0.18, delay: 0.12 });
  playTone(783.99, { duration: 0.35, delay: 0.24 });
}

function playTryAgainBlip() {
  playTone(220, { duration: 0.25, type: 'triangle', gain: 0.15 });
}

// ---------- Screen management ----------
const screens = document.querySelectorAll('.screen');
function showScreen(id) {
  screens.forEach((s) => s.classList.toggle('active', s.id === id));
}

// ---------- Home screen wiring ----------
document.getElementById('home-star-count').textContent = state.totalStars;

document.querySelectorAll('.mode-card').forEach((btn) => {
  btn.addEventListener('click', () => {
    getAudioCtx();
    state.mode = btn.dataset.mode;
    startGame();
  });
});

document.querySelectorAll('.diff-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.diff;
  });
});

document.getElementById('btn-home').addEventListener('click', () => {
  clearAllTimers();
  state.awaitingNext = false;
  state.dragging = false;
  showScreen('screen-home');
  document.getElementById('home-star-count').textContent = state.totalStars;
});

document.getElementById('btn-hear').addEventListener('click', () => {
  if (state.currentNote) playNoteSound(state.currentNote.freq);
});

// ---------- Staff drawing ----------
const svg = document.getElementById('staff-svg');
const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

function drawStaffBase() {
  svg.innerHTML = '';
  const lineYs = [40, 60, 80, 100, 120];
  lineYs.forEach((y) => {
    svg.appendChild(el('line', { x1: 60, y1: y, x2: 370, y2: y, class: 'staff-line' }));
  });
  // treble clef, drawn as SVG shapes (a ring + two smooth strokes + a dot)
  // so it renders identically on every device instead of depending on a
  // font having the Unicode musical-symbol glyph
  const clef = el('g', {
    transform: 'translate(58,2)',
    fill: 'none',
    stroke: '#2d2a4a',
    'stroke-width': 5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  clef.appendChild(el('circle', { cx: 27, cy: 24, r: 13 }));
  clef.appendChild(el('path', { d: 'M20,12 C24,-4 40,-2 34,14' }));
  clef.appendChild(el('path', { d: 'M34,30 C42,42 12,50 20,70 C28,90 6,96 12,116 C14,128 26,130 24,142' }));
  clef.appendChild(el('circle', { cx: 21, cy: 148, r: 4.5, fill: '#2d2a4a', stroke: 'none' }));
  svg.appendChild(clef);
}

function drawNoteAt(step, { x = NOTE_X, cls = '' } = {}) {
  const y = 140 - 10 * step;
  const group = el('g', { class: 'note-group' });

  if (step === 0) {
    group.appendChild(el('line', {
      x1: x - 16, y1: 140, x2: x + 16, y2: 140, class: 'ledger-line',
    }));
  }

  const head = el('ellipse', {
    cx: x, cy: y, rx: 10, ry: 7.5,
    fill: '#2d2a4a',
    class: `note-head ${cls}`,
  });
  group.appendChild(head);

  const stemUp = step < 6;
  const stemX = stemUp ? x + 9.5 : x - 9.5;
  const stemY2 = stemUp ? y - 45 : y + 45;
  group.appendChild(el('line', { x1: stemX, y1: y, x2: stemX, y2: stemY2, stroke: '#2d2a4a', 'stroke-width': 2 }));

  svg.appendChild(group);
  return head;
}

function clearNotes() {
  svg.querySelectorAll('.note-group').forEach((g) => g.remove());
}

// ---------- Game flow ----------
function startGame() {
  clearAllTimers();
  state.stars = 0;
  document.getElementById('star-count').textContent = state.stars;
  showScreen('screen-game');
  nextRound();
}

function setPrompt(html) {
  document.getElementById('prompt-area').innerHTML = html;
}

function setFeedback(text) {
  document.getElementById('feedback').textContent = text;
}

function nextRound() {
  state.awaitingNext = false;
  setFeedback('');
  drawStaffBase();
  const pool = noteSetFor(state.difficulty);

  if (state.mode === 'letter') {
    state.currentNote = pickRandom(pool);
    drawNoteAt(state.currentNote.step);
    svg.classList.remove('clickable');
    setPrompt('<span class="prompt-text">What letter is this note?</span>');
    renderLetterAnswers(pool);
  } else {
    state.currentNote = pickRandom(pool);
    svg.classList.add('clickable');
    setPrompt(
      `<span class="prompt-text">Drag the note to</span><span class="letter-card">${state.currentNote.letter}</span>`
    );
    document.getElementById('answer-area').innerHTML = '';
    const startStep = Math.round((pool[0].step + pool[pool.length - 1].step) / 2);
    drawNoteAt(startStep, { cls: 'ghost' });
  }
}

function renderLetterAnswers(pool) {
  const letters = shuffle(uniqueLetters(pool));
  const area = document.getElementById('answer-area');
  area.innerHTML = '';
  letters.forEach((letter) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = letter;
    btn.addEventListener('click', () => handleLetterAnswer(letter, btn));
    area.appendChild(btn);
  });
}

function handleLetterAnswer(letter, btn) {
  if (state.awaitingNext) return;
  const correct = letter === state.currentNote.letter;
  const head = svg.querySelector('.note-head');

  if (correct) {
    state.awaitingNext = true;
    btn.classList.add('correct');
    head.classList.add('correct', 'pop');
    onCorrect();
  } else {
    btn.classList.add('wrong', 'shake');
    playTryAgainBlip();
    setFeedback("Not quite — try again!");
    setTimeout(() => btn.classList.remove('wrong', 'shake'), 400);
  }
}

function stepFromPointer(e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

  const pool = noteSetFor(state.difficulty);
  const minStep = pool[0].step;
  const maxStep = pool[pool.length - 1].step;

  let step = Math.round((140 - svgPt.y) / 10);
  return Math.max(minStep, Math.min(maxStep, step));
}

svg.addEventListener('pointerdown', (e) => {
  if (state.mode !== 'place' || state.awaitingNext) return;
  state.dragging = true;
  svg.setPointerCapture(e.pointerId);
  clearNotes();
  drawNoteAt(stepFromPointer(e), { cls: 'ghost' });
});

svg.addEventListener('pointermove', (e) => {
  if (!state.dragging) return;
  clearNotes();
  drawNoteAt(stepFromPointer(e), { cls: 'ghost' });
});

function finishDrag(e) {
  if (!state.dragging) return;
  state.dragging = false;

  const step = stepFromPointer(e);
  clearNotes();
  const droppedLetter = NOTES[step].letter;
  const correct = droppedLetter === state.currentNote.letter;
  const head = drawNoteAt(step, { cls: correct ? 'correct' : 'wrong' });
  head.classList.add('pop');

  if (correct) {
    state.awaitingNext = true;
    onCorrect();
  } else {
    playTryAgainBlip();
    setFeedback("Not quite — try again!");
    scheduleTimeout(() => {
      if (!state.awaitingNext) {
        clearNotes();
        const pool = noteSetFor(state.difficulty);
        const startStep = Math.round((pool[0].step + pool[pool.length - 1].step) / 2);
        drawNoteAt(startStep, { cls: 'ghost' });
      }
    }, 600);
  }
}

svg.addEventListener('pointerup', finishDrag);
svg.addEventListener('pointercancel', finishDrag);

function onCorrect() {
  state.stars++;
  state.totalStars++;
  localStorage.setItem('noteExplorerStars', state.totalStars);
  document.getElementById('star-count').textContent = state.stars;
  playCorrectChime();
  setFeedback('Great job! ⭐');
  burstConfetti();
  scheduleTimeout(nextRound, 1300);
}

// ---------- Confetti ----------
const CONFETTI_EMOJI = ['⭐', '🎉', '🎵', '✨', '🎶'];
function burstConfetti() {
  const layer = document.getElementById('confetti-layer');
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight / 2;
  for (let i = 0; i < 14; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.textContent = pickRandom(CONFETTI_EMOJI);
    const x = originX + (Math.random() - 0.5) * 260;
    const y = originY + (Math.random() - 0.5) * 120;
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.animationDelay = `${Math.random() * 0.15}s`;
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 1600);
  }
}
