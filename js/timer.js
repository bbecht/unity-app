// Rest timer: one global countdown, visual bar plus audible beeps and vibration at zero.
import * as store from './store.js';

let endAt = 0, total = 0, tick = null, ctx = null;
const subs = new Set();

export function onTick(fn) { subs.add(fn); return () => subs.delete(fn); }

function emit() { for (const fn of subs) fn(remaining(), total); }

export function remaining() { return endAt ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : 0; }
export function running() { return endAt > 0; }

export function start(seconds) {
  stop();
  if (!seconds || seconds <= 0) return;
  ensureAudio();
  total = seconds; endAt = Date.now() + seconds * 1000;
  tick = setInterval(() => {
    emit();
    if (Date.now() >= endAt) { finish(); }
  }, 250);
  emit();
}

export function stop() { if (tick) clearInterval(tick); tick = null; endAt = 0; total = 0; emit(); }

export function add(seconds) { if (endAt) { endAt += seconds * 1000; total += seconds; emit(); } }

function finish() {
  stop();
  const st = store.get().settings;
  if (st.sound !== false) beep();
  if (st.vibrate !== false && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  document.title = 'GO - Unity';
  setTimeout(() => { document.title = 'Unity'; }, 4000);
}

function ensureAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* no audio available */ }
}

export function beep() {
  try {
    ensureAudio();
    const now = ctx.currentTime;
    [0, 0.35, 0.7].forEach((t, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square'; o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, now + t); g.gain.exponentialRampToValueAtTime(0.5, now + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.28);
      o.connect(g).connect(ctx.destination); o.start(now + t); o.stop(now + t + 0.3);
    });
  } catch (e) { /* ignore */ }
}
