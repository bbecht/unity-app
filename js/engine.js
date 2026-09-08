// Percentage engine, progression engine, 1RM math, and cycle position. Pure functions over state.
import { EX, PHASES, BLOCK_STARTS } from './program.js';
import { weekTemplates } from './phases.js';

export { weekTemplates, EX, PHASES };

export const LIFTS = ['squat', 'bench', 'deadlift'];
export const LIFT_NAME = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift' };

// ---- rounding and percentages ----
export function roundDown(x, inc = 5) { return Math.floor(x / inc + 1e-9) * inc; }
export function pctLoad(oneRM, pct, inc = 5) { return roundDown(oneRM * pct / 100, inc); }

// ---- 1RM estimation: take the most conservative formula, round down ----
export function est1RM(weight, reps, inc = 5) {
  if (!weight || !reps) return 0;
  if (reps === 1) return roundDown(weight, inc);
  const brzycki = weight * 36 / (37 - reps);
  const epley = weight * (1 + reps / 30);
  const lander = 100 * weight / (101.3 - 2.67123 * reps);
  const oconner = weight * (1 + 0.025 * reps);
  return roundDown(Math.min(brzycki, epley, lander, oconner), inc);
}

export function phaseOf(week) { return PHASES[week] || ''; }

// ---- feeder ladders ----
// Percentages are of the 1RM for max-effort and test work, and of the day's working weight for
// speed and relative work. Edit these to match the book; counts for relative work live in program.js.
export const FEEDER_LADDERS = {
  // Max effort: climb toward the first top set. Rungs at or above (first top - 10%) are dropped.
  top: [{ pct: 40, reps: 5 }, { pct: 50, reps: 3 }, { pct: 60, reps: 3 }, { pct: 70, reps: 2 }, { pct: 80, reps: 1 }],
  // Speed work: two ramps below the working weight, same reps as the working sets.
  speed: [50, 75],
  // Test day: singles ladder below the opener.
  test: [{ pct: 50, reps: 3 }, { pct: 60, reps: 2 }, { pct: 70, reps: 1 }, { pct: 80, reps: 1 }, { pct: 90, reps: 1 }],
  // Relative work: two feeders on compounds, one on isolation, as a share of the working weight.
  rel2: [60, 80],
  rel1: [75],
};

function feedersFor(mode, { oneRM, work, reps, firstTopPct, count }, inc, week) {
  let list = [];
  if (mode === 'top') list = FEEDER_LADDERS.top.filter((r) => r.pct <= firstTopPct - 10).map((r) => ({ pct: r.pct, reps: r.reps, weight: pctLoad(oneRM, r.pct, inc), of: '1RM' }));
  else if (mode === 'test') list = FEEDER_LADDERS.test.map((r) => ({ pct: r.pct, reps: r.reps, weight: pctLoad(oneRM, r.pct, inc), of: '1RM' }));
  else if (mode === 'pct') list = FEEDER_LADDERS.speed.map((p) => ({ pct: p, reps, weight: pctLoad(work, p, inc), of: 'work' }));
  else if (mode === 'rel') {
    const pcts = count >= 2 ? FEEDER_LADDERS.rel2 : count === 1 ? FEEDER_LADDERS.rel1 : [];
    list = pcts.map((p) => ({ pct: p, reps, weight: work ? pctLoad(work, p, inc) : null, of: 'work' }));
  }
  if (week === 10 && list.length > 1) list = list.slice(-1); // deload: one feeder is enough
  return list;
}

// ---- cycle position ----
export function posLabel(pos) {
  const tpl = weekTemplates(pos.week)[pos.idx];
  return { cycle: pos.cycle, week: pos.week, day: tpl ? tpl.day : pos.idx + 1, phase: phaseOf(pos.week), name: tpl ? tpl.name : '' };
}

export function nextPos(pos) {
  const n = weekTemplates(pos.week).length;
  let { cycle, week, idx } = pos;
  idx += 1;
  if (idx >= n) { idx = 0; week += 1; }
  if (week > 13) { week = 1; cycle += 1; }
  return { cycle, week, idx };
}

export function priorWeekRef(cycle, week) {
  return week === 1 ? { cycle: cycle - 1, week: 13 } : { cycle, week: week - 1 };
}

// ---- history lookups ----
function workingSets(exLog) { return (exLog.sets || []).filter((s) => !s.feeder && s.reps > 0); }

function summarizeLog(exLog, session) {
  const ws = workingSets(exLog);
  if (!ws.length) return null;
  const top = ws.reduce((a, b) => (b.weight > a.weight ? b : a), ws[0]);
  const minReps = Math.min(...ws.map((s) => s.reps));
  const maxRpe = Math.max(...ws.map((s) => s.rpe || 0));
  return { weight: top.weight, reps: top.reps, minReps, rpe: maxRpe, sets: ws.length, date: session.completedAt || session.startedAt,
    targetReps: exLog.prescribed?.reps, targetWeight: exLog.prescribed?.weight, cycle: session.cycle, week: session.week };
}

// Every logged instance of an exercise, most recent first.
export function exerciseHistory(state, ex) {
  const out = [];
  for (const s of state.sessions) {
    if (s.skipped) continue;
    for (const e of s.exercises || []) {
      if (e.ex !== ex) continue;
      const sum = summarizeLog(e, s);
      if (sum) out.push({ ...sum, sets: workingSets(e), notes: e.notes || '', sessionId: s.id });
    }
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function lastTime(state, ex) {
  const h = exerciseHistory(state, ex);
  return h[0] || null;
}

function priorWeekLog(state, ex, cycle, week) {
  const ref = priorWeekRef(cycle, week);
  const matches = [];
  for (const s of state.sessions) {
    if (s.skipped || s.cycle !== ref.cycle || s.week !== ref.week) continue;
    for (const e of s.exercises || []) if (e.ex === ex) { const sum = summarizeLog(e, s); if (sum) matches.push(sum); }
  }
  // If the exercise appeared twice in the prior week, use the most recent.
  return matches.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
}

// ---- prescription ----
// Returns what to do for one program item, given the athlete's maxes and history.
export function prescribe(item, state, cycle, week) {
  const inc = state.athlete.incrementLb || 5;
  const maxes = state.maxes;
  const scale = item.scale || 1;
  const ex = EX[item.ex];
  const base = { ex: item.ex, name: ex.name, bp: ex.bp, cue: ex.cue, rest: state.rest[item.ex] ?? ex.rest, rpeCap: item.rpeCap || null, note: item.note || '', last: lastTime(state, item.ex) };
  const L = item.load;

  if (L.type === 'cardio') return { ...base, mode: 'cardio', minutes: item.minutes };

  if (L.type === 'test') return { ...base, mode: 'test', lift: L.lift, current: maxes[L.lift], feeders: feedersFor('test', { oneRM: maxes[L.lift] }, inc, week) };

  if (L.type === 'pct') {
    const sets = [];
    for (let i = 0; i < item.sets; i++) {
      const p = L.pct2 && i >= item.sets / 2 ? L.pct2 : L.pct;
      sets.push({ pct: p, weight: pctLoad(maxes[L.lift] * scale, p, inc), reps: item.reps });
    }
    const label = L.pct2 ? `${L.pct}% / ${L.pct2}%` : `${L.pct}%`;
    return { ...base, mode: 'pct', lift: L.lift, sets, reps: item.reps, weight: sets[0].weight, pctLabel: label, anchored: true, feeders: feedersFor('pct', { work: sets[0].weight, reps: item.reps }, inc, week) };
  }

  if (L.type === 'top') {
    const tops = L.tops.map((t) => ({ pct: t.pct, weight: pctLoad(maxes[L.lift] * scale, t.pct, inc), reps: t.reps }));
    const feeders = feedersFor('top', { oneRM: maxes[L.lift] * scale, firstTopPct: tops[0].pct }, inc, week);
    return { ...base, mode: 'top', lift: L.lift, sets: tops, feeders, reps: tops[0].reps, weight: tops[tops.length - 1].weight, anchored: true, drop: false };
  }

  // Relative work: reads the prior week's log for this exercise.
  const prog = item.prog || { k: 'reps', add: 2 };
  const out = { ...base, mode: 'rel', sets: item.sets, reps: item.reps, drop: !!item.drop, prog, anchored: false, basis: 'none', weight: null };

  // Feeders are a share of the working weight; when unanchored they carry the percentage only.
  const fdCount = item.fd ?? ex.fd ?? 1;
  const done = () => { out.feeders = feedersFor('rel', { work: out.weight, reps: out.reps, count: fdCount }, inc, week); return out; };

  if (prog.k === 'transition') {
    const l = base.last;
    if (l && l.weight > 0) { out.anchored = true; out.basis = 'transition'; out.weight = roundDown(l.weight * 0.9, inc); }
    return done();
  }

  const prior = priorWeekLog(state, item.ex, cycle, week);
  if (!prior) {
    // Unanchored: conservative, flagged. Fall back to the most recent instance as a hint only.
    out.hint = base.last ? base.last.weight : null;
    return done();
  }
  out.anchored = true;
  const target = prior.targetReps || item.reps;
  const hit = prior.minReps >= target;
  out.basis = hit ? 'hit' : 'miss';
  out.priorWeight = prior.weight; out.priorReps = prior.minReps; out.priorTarget = target;
  if (!hit) { out.weight = prior.weight; out.reps = target; return done(); }
  if (prog.k === 'reps') { out.weight = prior.weight; out.reps = target + prog.add; }
  else if (prog.k === 'wt') { out.weight = prior.weight + (prog.add || inc); out.reps = item.reps; }
  else { out.weight = prior.weight; out.reps = item.reps; } // hold
  if (scale !== 1 && out.weight) out.weight = roundDown(out.weight * scale, inc);
  return done();
}

// ---- session construction ----
export function buildSession(state, pos = state.pos) {
  const tpl = weekTemplates(pos.week)[pos.idx];
  const exercises = tpl.items.map((item) => {
    const p = prescribe(item, state, pos.cycle, pos.week);
    return { ex: item.ex, name: p.name, bp: p.bp, mode: p.mode, prescribed: { weight: p.weight ?? null, reps: p.reps ?? null, sets: p.sets, pct: p.pctLabel || null, minutes: p.minutes || null }, sets: [], notes: '', done: false, minutes: p.minutes || null, skipped: false };
  });
  return { id: null, cycle: pos.cycle, week: pos.week, idx: pos.idx, day: tpl.day, key: tpl.key, name: tpl.name, kind: tpl.kind, phase: phaseOf(pos.week), skippable: !!tpl.skippable, startedAt: new Date().toISOString(), completedAt: null, exercises, notes: '', skipped: false };
}

export function sessionStats(session) {
  let sets = 0, tonnage = 0, rpeSum = 0, rpeN = 0;
  for (const e of session.exercises || []) {
    for (const s of workingSets(e)) {
      sets += 1; tonnage += (s.weight || 0) * (s.reps || 0);
      if (s.rpe) { rpeSum += s.rpe; rpeN += 1; }
    }
  }
  const dur = session.startedAt && session.completedAt ? Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / 60000) : 0;
  return { sets, tonnage, avgRpe: rpeN ? Math.round((rpeSum / rpeN) * 10) / 10 : 0, durationMin: dur };
}

// Tested triples from a test session -> {lift: {weight, reps, oneRM}}
export function testResults(session) {
  const out = {};
  for (const e of session.exercises || []) {
    if (e.mode !== 'test') continue;
    const lift = { test_squat: 'squat', test_bench: 'bench', test_dead: 'deadlift' }[e.ex];
    const best = workingSets(e).map((s) => ({ ...s, est: est1RM(s.weight, s.reps) })).sort((a, b) => b.est - a.est)[0];
    if (best) out[lift] = { weight: best.weight, reps: best.reps, oneRM: best.est };
  }
  return out;
}

// Pull tested triples for the current cycle out of completed test sessions (both test days).
export function cycleTests(state, cycle) {
  const out = {};
  for (const s of state.sessions) if (s.cycle === cycle && s.week === 12 && s.kind === 'test' && !s.skipped) Object.assign(out, testResults(s));
  return out;
}

// ---- volume ----
export function weeklyVolume(state) {
  const rows = {}; // key cycle-week -> {cycle, week, sets, tonnage, byBp:{}}
  for (const s of state.sessions) {
    if (s.skipped) continue;
    const k = `${s.cycle}-${s.week}`;
    rows[k] = rows[k] || { cycle: s.cycle, week: s.week, sets: 0, tonnage: 0, byBp: {} };
    for (const e of s.exercises || []) {
      const bp = e.bp || (EX[e.ex] && EX[e.ex].bp) || 'other';
      for (const st of workingSets(e)) {
        rows[k].sets += 1; rows[k].tonnage += (st.weight || 0) * (st.reps || 0);
        rows[k].byBp[bp] = rows[k].byBp[bp] || { sets: 0, tonnage: 0 };
        rows[k].byBp[bp].sets += 1; rows[k].byBp[bp].tonnage += (st.weight || 0) * (st.reps || 0);
      }
    }
  }
  return Object.values(rows).sort((a, b) => a.cycle - b.cycle || a.week - b.week);
}

// ---- bodyweight and nutrition ----
export function rollingAverage(entries, days = 7) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((e, i) => {
    const win = sorted.slice(Math.max(0, i - days + 1), i + 1);
    return { date: e.date, lb: e.lb, avg: Math.round((win.reduce((a, b) => a + b.lb, 0) / win.length) * 10) / 10 };
  });
}

// Compare the latest 7-day average to the one from two weeks earlier.
export function bodyweightTrend(entries) {
  const ra = rollingAverage(entries);
  if (ra.length < 2) return null;
  const latest = ra[ra.length - 1];
  const cutoff = new Date(latest.date); cutoff.setDate(cutoff.getDate() - 14);
  const cutStr = cutoff.toISOString().slice(0, 10);
  const older = [...ra].reverse().find((r) => r.date <= cutStr);
  if (!older) return { latest, delta: null };
  const delta = Math.round((latest.avg - older.avg) * 10) / 10;
  return { latest, older, delta, prompt: Math.abs(delta) > 2 ? (delta > 0 ? 'down' : 'up') : null };
}

export function nutritionTargets(bodyweightLb, n) {
  const cal = Math.round(bodyweightLb * n.calPerLb);
  const protein = Math.round(bodyweightLb * n.proteinPerLb);
  const fat = Math.round(bodyweightLb * n.fatPerLb);
  const carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
  return { cal, protein, fat, carbs, calLow: Math.round(bodyweightLb * 14), calHigh: Math.round(bodyweightLb * 15), proteinLow: Math.round(bodyweightLb), proteinHigh: Math.round(bodyweightLb * 1.2) };
}

export function milestoneForWeekStart(week) { return BLOCK_STARTS[week] || null; }
