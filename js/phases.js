// Weeks 10 to 13. The source program has no deload or peak; this design is ours and is
// flagged for review in the README. Weeks 10 and 13 reuse the week 1 shape and modify it.
import { unityWeek, CONDITIONING } from './program.js';

const C = (ex, minutes) => ({ ex, load: { type: 'cardio' }, minutes });
const R = (ex, sets, reps, extra = {}) => ({ ex, load: { type: 'rel' }, sets, reps, prog: { k: 'hold' }, ...extra });
const TOP = (ex, lift, tops, extra = {}) => ({ ex, load: { type: 'top', lift, tops }, sets: tops.length, reps: tops[0].reps, ...extra });
const P = (ex, lift, pct, sets, reps) => ({ ex, load: { type: 'pct', lift, pct }, sets, reps });

function clone(x) { return JSON.parse(JSON.stringify(x)); }

// Week 10: same five-day split, volume roughly halved, RPE capped at 7, percentage work at 50%,
// half the sets, no drop sets, LISS-only conditioning.
export function deloadWeek() {
  const base = clone(unityWeek(1));
  return base.map((sess) => {
    if (sess.kind === 'cond') return CONDITIONING.lissOnly(sess.day);
    const items = sess.items.map((it) => {
      const t = it.load.type;
      if (t === 'cardio') return it;
      const out = { ...it, rpeCap: 7, drop: false, sets: Math.max(1, Math.ceil(it.sets / 2)) };
      if (t === 'pct') { out.load = { ...it.load, pct: 50, pct2: undefined }; }
      if (t === 'top') {
        const tops = it.load.tops.slice(0, Math.max(1, Math.ceil(it.load.tops.length / 2))).map((s) => ({ pct: 50, reps: s.reps }));
        out.load = { ...it.load, tops };
        out.sets = tops.length;
      }
      if (t === 'rel') out.prog = { k: 'hold' };
      return out;
    });
    return { ...sess, name: `${sess.name} (deload)`, items };
  });
}

// Week 11: three lifting days, competition lifts to a heavy double at about 90%, two or three
// accessories capped at RPE 7, LISS conditioning on the other two days.
export function peakWeek() {
  const cap = { rpeCap: 7 };
  return [
    { key: 'd1', day: 1, kind: 'lift', name: 'Squat, heavy double', items: [
      TOP('comp_squat', 'squat', [{ pct: 90, reps: 2 }], { note: 'Ramp in feeders: singles and doubles up to the top double. One top set.' }),
      R('leg_press', 2, 10, cap), R('lying_leg_curl', 2, 10, cap), C('treadmill_finish', 15),
    ] },
    { key: 'd2', day: 2, kind: 'lift', name: 'Bench, heavy double', items: [
      TOP('comp_bench', 'bench', [{ pct: 90, reps: 2 }], { note: 'Paused. Ramp in feeders, one top double.' }),
      R('hs_incline', 2, 8, cap), R('db_lying_tri', 2, 10, cap), C('treadmill_finish', 15),
    ] },
    { key: 'd3', day: 3, kind: 'lift', name: 'Deadlift, heavy double', items: [
      TOP('comp_dead', 'deadlift', [{ pct: 90, reps: 2 }], { note: 'Ramp in feeders, one top double. Full reset between reps.' }),
      R('pulldown', 2, 10, cap), R('db_hyper', 2, 10, cap), C('treadmill_finish', 15),
    ] },
    CONDITIONING.lissOnly(4),
    CONDITIONING.lissOnly(5),
  ];
}

// Week 12: opener at 70%, then the test split across two days. No accessories, no conditioning.
export function testWeek() {
  return [
    { key: 'd1', day: 1, kind: 'lift', name: 'Opener, 3 x 2 at 70%', note: 'Crisp and fast. Nothing grinds. Then 48 to 72 hours off before test day A.', items: [
      P('comp_squat', 'squat', 70, 3, 2), P('comp_bench', 'bench', 70, 3, 2), P('comp_dead', 'deadlift', 70, 3, 2),
    ] },
    { key: 'd2', day: 2, kind: 'test', name: 'Test day A: squat and bench', note: 'Heavy triple squat, then heavy triple bench. No accessories. 48 hours off before test day B.', items: [
      { ex: 'test_squat', load: { type: 'test', lift: 'squat' } },
      { ex: 'test_bench', load: { type: 'test', lift: 'bench' } },
    ] },
    { key: 'd3', day: 3, kind: 'test', name: 'Test day B: deadlift', note: 'Heavy triple deadlift. Finishing this session recalculates all three 1RMs.', items: [
      { ex: 'test_dead', load: { type: 'test', lift: 'deadlift' } },
    ] },
  ];
}

// Week 13: full split at week 1 volume, all loads 10% below the fresh prescription, RPE capped at 8,
// conditioning fully back.
export function transitionWeek() {
  const base = clone(unityWeek(1));
  return base.map((sess) => {
    if (sess.kind === 'cond') return sess;
    const items = sess.items.map((it) => {
      const t = it.load.type;
      if (t === 'cardio') return it;
      const out = { ...it, rpeCap: 8, scale: 0.9 };
      if (t === 'rel') out.prog = { k: 'transition' };
      return out;
    });
    return { ...sess, name: `${sess.name} (transition)`, items };
  });
}

export function weekTemplates(week) {
  if (week >= 1 && week <= 9) return unityWeek(week);
  if (week === 10) return deloadWeek();
  if (week === 11) return peakWeek();
  if (week === 12) return testWeek();
  if (week === 13) return transitionWeek();
  throw new Error(`No week ${week}`);
}

export const RECOVERY_GUIDANCE = [
  'Target five 90-minute sleep cycles, about 7.5 hours.',
  'Cool, dark room.',
  'Screens off before bed.',
  'No late-afternoon naps.',
];
