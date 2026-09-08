// Local persistence. localStorage is the source of truth; nothing here touches the network.
const KEY = 'unity.v1';

const listeners = new Set();

export function defaultState() {
  return {
    version: 1,
    athlete: { bodyweightLb: 238, incrementLb: 5, name: '' },
    maxes: { squat: 407, bench: 265, deadlift: 501 },
    maxHistory: [], // {cycle, lift, testedWeight, testedReps, oneRM, prior, delta, date}
    // Starting point: the athlete is already two thirds through the program, so a fresh install
    // opens at week 7, day 2 (idx 1). Change position any time from More > Position.
    pos: { cycle: 1, week: 7, idx: 1 }, // idx = index into the week's session list
    sessions: [], // completed or skipped sessions
    active: null, // in-progress session
    checkins: [], // {date, sleep, soreness, stress}
    bodyweight: [], // {date, lb}
    nutrition: { calPerLb: 14.5, proteinPerLb: 1.1, fatPerLb: 0.4, lastAdjust: null, ackedTrend: null },
    rest: {}, // exercise id -> seconds override
    settings: { theme: 'light', sound: true, vibrate: true, notion: { endpoint: '', token: '', dbSessions: '', dbMaxes: '', dbMilestones: '' } },
    syncQueue: [], // {id, kind, payload, attempts, lastError}
    milestones: [], // {cycle, week, type, date}
    syncLog: [], // recent sync results
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return migrate({ ...defaultState(), ...parsed });
  } catch (e) {
    console.error('store load failed, starting fresh', e);
    return defaultState();
  }
}

function migrate(s) {
  // Fill any keys added after the first release without clobbering user data.
  const d = defaultState();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...(s.settings || {}) };
  s.settings.notion = { ...d.settings.notion, ...((s.settings || {}).notion || {}) };
  s.nutrition = { ...d.nutrition, ...(s.nutrition || {}) };
  s.athlete = { ...d.athlete, ...(s.athlete || {}) };
  return s;
}

export function get() { return state; }

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('store save failed', e);
  }
  for (const fn of listeners) fn(state);
}

// Mutate through a function so every change is persisted and broadcast.
export function update(fn) {
  const r = fn(state);
  save();
  return r;
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function exportJSON() { return JSON.stringify(state, null, 2); }

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !parsed.maxes) throw new Error('Not a Unity backup file');
  state = migrate({ ...defaultState(), ...parsed });
  save();
}

export function resetAll() {
  state = defaultState();
  save();
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
