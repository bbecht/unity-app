// State transitions: start, log, complete, skip, rollover. All go through store.update.
import * as store from './store.js';
import { buildSession, nextPos, sessionStats, cycleTests, milestoneForWeekStart, LIFTS, weekTemplates, phaseOf } from './engine.js';
import { enqueue } from './notion.js';

export function startSession() {
  return store.update((s) => {
    if (s.active) return s.active;
    s.active = buildSession(s);
    s.active.id = store.uid();
    if (s.pos.idx === 0) recordMilestone(s, s.pos.cycle, s.pos.week, milestoneForWeekStart(s.pos.week));
    return s.active;
  });
}

export function discardActive() { store.update((s) => { s.active = null; }); }

export function logSet(exIdx, set) {
  store.update((s) => { s.active.exercises[exIdx].sets.push({ weight: +set.weight || 0, reps: +set.reps || 0, rpe: +set.rpe || 0, feeder: !!set.feeder, at: new Date().toISOString() }); });
}

export function updateSet(exIdx, setIdx, patch) {
  store.update((s) => { Object.assign(s.active.exercises[exIdx].sets[setIdx], patch); });
}

export function removeSet(exIdx, setIdx) {
  store.update((s) => { s.active.exercises[exIdx].sets.splice(setIdx, 1); });
}

export function setNotes(exIdx, notes) { store.update((s) => { s.active.exercises[exIdx].notes = notes; }); }
export function setSessionNotes(notes) { store.update((s) => { s.active.notes = notes; }); }
export function markExercise(exIdx, patch) { store.update((s) => { Object.assign(s.active.exercises[exIdx], patch); }); }
export function setRest(ex, seconds) { store.update((s) => { s.rest[ex] = seconds; }); }

function recordMilestone(s, cycle, week, type) {
  if (!type) return;
  if (s.milestones.some((m) => m.cycle === cycle && m.week === week && m.type === type)) return;
  const m = { cycle, week, type, date: store.today() };
  s.milestones.push(m);
  enqueue(s, 'milestone', m);
}

// Finish the active session: store it, advance, handle test rollover and cycle completion.
export function completeSession() {
  return store.update((s) => {
    const a = s.active; if (!a) return null;
    a.completedAt = new Date().toISOString();
    const stats = sessionStats(a);
    s.sessions.push(a);
    s.active = null;
    enqueue(s, 'session', { id: a.id, name: `C${a.cycle} W${a.week} D${a.day} ${a.name}`, date: a.completedAt.slice(0, 10), cycle: a.cycle, week: a.week, day: a.day, phase: a.phase, ...stats, notes: a.notes || '' });

    // Test day B completes the test: recalculate all three 1RMs once every triple is in.
    if (a.week === 12 && a.kind === 'test' && a.key === 'd3') applyTests(s, a.cycle);

    const wasLast = nextPos(s.pos).cycle !== s.pos.cycle;
    if (wasLast) recordMilestone(s, s.pos.cycle, 13, 'Cycle complete');
    s.pos = nextPos(s.pos);
    return a;
  });
}

export function skipSession() {
  return store.update((s) => {
    const tpl = weekTemplates(s.pos.week)[s.pos.idx];
    const rec = { id: store.uid(), cycle: s.pos.cycle, week: s.pos.week, idx: s.pos.idx, day: tpl.day, key: tpl.key, name: tpl.name, kind: tpl.kind, phase: phaseOf(s.pos.week), skipped: true, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), exercises: [] };
    s.sessions.push(rec);
    s.active = null;
    const wasLast = nextPos(s.pos).cycle !== s.pos.cycle;
    if (wasLast) recordMilestone(s, s.pos.cycle, 13, 'Cycle complete');
    s.pos = nextPos(s.pos);
    return rec;
  });
}

function applyTests(s, cycle) {
  const tests = cycleTests(s, cycle);
  const date = store.today();
  for (const lift of LIFTS) {
    const t = tests[lift];
    if (!t || !t.oneRM) continue;
    const prior = s.maxes[lift];
    const rec = { cycle, lift, testedWeight: t.weight, testedReps: t.reps, oneRM: t.oneRM, prior, delta: t.oneRM - prior, date };
    s.maxHistory.push(rec);
    s.maxes[lift] = t.oneRM;
    enqueue(s, 'max', rec);
  }
  recordMilestone(s, cycle, 12, 'Test complete');
}

// Manual override of the current position (used for restarts and corrections).
export function setPosition(cycle, week, idx) {
  store.update((s) => { s.pos = { cycle: Math.max(1, cycle | 0), week: Math.min(13, Math.max(1, week | 0)), idx: Math.max(0, idx | 0) }; s.active = null; });
}

export function setMaxes(maxes) { store.update((s) => { for (const l of LIFTS) if (maxes[l] > 0) s.maxes[l] = +maxes[l]; }); }

export function addCheckin(c) {
  store.update((s) => {
    const i = s.checkins.findIndex((x) => x.date === c.date);
    if (i >= 0) s.checkins[i] = c; else s.checkins.push(c);
    s.checkins.sort((a, b) => a.date.localeCompare(b.date));
  });
}

export function addBodyweight(date, lb) {
  store.update((s) => {
    const i = s.bodyweight.findIndex((x) => x.date === date);
    if (i >= 0) s.bodyweight[i].lb = lb; else s.bodyweight.push({ date, lb });
    s.bodyweight.sort((a, b) => a.date.localeCompare(b.date));
    s.athlete.bodyweightLb = lb;
  });
}

export function setNutrition(patch) { store.update((s) => { Object.assign(s.nutrition, patch); }); }
export function setSettings(patch) { store.update((s) => { Object.assign(s.settings, patch); }); }
export function setNotion(patch) { store.update((s) => { Object.assign(s.settings.notion, patch); }); }
export function setAthlete(patch) { store.update((s) => { Object.assign(s.athlete, patch); }); }
export function deleteSession(id) { store.update((s) => { s.sessions = s.sessions.filter((x) => x.id !== id); }); }
