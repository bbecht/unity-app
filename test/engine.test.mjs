import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EX, unityWeek } from '../js/program.js';
import { weekTemplates } from '../js/phases.js';
import { pctLoad, est1RM, nextPos, prescribe, buildSession, sessionStats, testResults, cycleTests, bodyweightTrend, nutritionTargets, roundDown } from '../js/engine.js';

function baseState() {
  return { athlete: { bodyweightLb: 238, incrementLb: 5 }, maxes: { squat: 407, bench: 265, deadlift: 501 }, sessions: [], rest: {}, pos: { cycle: 1, week: 1, idx: 0 } };
}

test('all thirteen weeks build and reference known exercises', () => {
  for (let w = 1; w <= 13; w++) {
    const sessions = weekTemplates(w);
    assert.ok(sessions.length >= 3, `week ${w} has sessions`);
    for (const s of sessions) {
      assert.ok(s.items.length, `week ${w} ${s.key} has items`);
      for (const it of s.items) {
        assert.ok(EX[it.ex], `week ${w} ${s.key}: unknown exercise ${it.ex}`);
        if (it.load.type === 'pct' || it.load.type === 'rel') assert.ok(it.sets > 0 && it.reps > 0, `week ${w} ${it.ex} sets/reps`);
      }
    }
  }
  for (let w = 1; w <= 9; w++) assert.equal(unityWeek(w).length, 7);
  assert.equal(weekTemplates(11).length, 5);
  assert.equal(weekTemplates(12).length, 3);
});

test('substitutions are applied and untouched dumbbell work stays', () => {
  const all = [];
  for (let w = 1; w <= 9; w++) for (const s of unityWeek(w)) for (const it of s.items) all.push(it.ex);
  assert.ok(!all.some((x) => /bulgarian|db_incline|db_decline/.test(x)));
  assert.ok(all.includes('hs_incline') && all.includes('hs_flat') && all.includes('hack_single'));
  for (const keep of ['db_lying_tri', 'db_kickout', 'inc_hammer_curl', 'db_y_raise', 'db_lat_partial', 'db_hyper']) assert.ok(all.includes(keep), keep);
});

test('percentage schedule matches the spec table', () => {
  const de = (w, ex) => unityWeek(w).flatMap((s) => s.items).find((i) => i.ex === ex);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((w) => de(w, 'de_squat').load.pct), [55, 55, 55, 65, 70, 75, 80, 55]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((w) => de(w, 'de_bench').load.pct), [55, 55, 55, 65, 70, 75, 80, 55]);
  assert.equal(de(9, 'de_bench'), undefined);
  assert.deepEqual(de(9, 'me_back_squat').load.tops.map((t) => t.pct), [85, 90, 95]);
  assert.deepEqual([1, 2, 3].map((w) => de(w, 'speed_pull').load.pct), [55, 60, 65]);
  for (const w of [4, 5, 6]) assert.equal(de(w, 'speed_pull'), undefined);
  assert.deepEqual([7, 8, 9].map((w) => [de(w, 'speed_pull').load.pct, de(w, 'speed_pull').load.pct2]), [[50, 55], [60, 65], [70, 75]]);
  assert.deepEqual([4, 5, 6].map((w) => de(w, 'me_front_squat').load.tops[0].pct), [55, 60, 65]);
  assert.deepEqual(de(2, 'me_back_squat').load.tops.map((t) => t.pct), [70, 75, 70]);
  assert.deepEqual(de(3, 'me_back_squat').load.tops.map((t) => t.pct), [70, 75, 80]);
  for (const w of [1, 2, 3]) assert.ok(de(w, 'me_high_incline'));
  for (const w of [4, 5, 6]) assert.ok(de(w, 'me_floor'));
  assert.ok(de(7, 'me_incline'));
});

test('percentages round down to 5 lb', () => {
  assert.equal(pctLoad(407, 55), 220);
  assert.equal(pctLoad(265, 55), 145);
  assert.equal(pctLoad(501, 55), 275);
  assert.equal(pctLoad(407, 95), 385);
  assert.equal(roundDown(224.99), 220);
});

test('1RM uses the most conservative formula and rounds down', () => {
  assert.equal(est1RM(385, 3), 405); // Brzycki 407.6
  assert.equal(est1RM(250, 3), 260); // Brzycki 264.7
  assert.equal(est1RM(475, 3), 500); // Brzycki 502.9
  assert.equal(est1RM(400, 1), 400);
});

test('position advances through weeks and rolls the cycle', () => {
  let p = { cycle: 1, week: 1, idx: 6 };
  p = nextPos(p); assert.deepEqual(p, { cycle: 1, week: 2, idx: 0 });
  p = { cycle: 1, week: 12, idx: 2 }; p = nextPos(p); assert.deepEqual(p, { cycle: 1, week: 13, idx: 0 });
  p = { cycle: 1, week: 13, idx: 6 }; p = nextPos(p); assert.deepEqual(p, { cycle: 2, week: 1, idx: 0 });
});

function logged(state, cycle, week, ex, sets, targetReps, date) {
  state.sessions.push({ id: 'x', cycle, week, day: 1, kind: 'lift', startedAt: date, completedAt: date, exercises: [{ ex, prescribed: { reps: targetReps, weight: sets[0][0] }, sets: sets.map(([weight, reps, rpe]) => ({ weight, reps, rpe })) }] });
}

test('relative progression: hit adds reps, miss holds, no data is unanchored', () => {
  const item = unityWeek(2)[0].items.find((i) => i.ex === 'leg_press');
  let s = baseState();
  let p = prescribe(item, s, 1, 2);
  assert.equal(p.anchored, false); assert.equal(p.basis, 'none'); assert.equal(p.weight, null);

  s = baseState(); logged(s, 1, 1, 'leg_press', [[400, 10, 8], [400, 10, 9], [400, 10, 9]], 10, '2026-09-01T10:00:00Z');
  p = prescribe(item, s, 1, 2);
  assert.equal(p.anchored, true); assert.equal(p.basis, 'hit'); assert.equal(p.weight, 400); assert.equal(p.reps, 12);
  assert.equal(p.last.weight, 400); assert.equal(p.last.rpe, 9);

  s = baseState(); logged(s, 1, 1, 'leg_press', [[400, 10, 9], [400, 9, 10], [400, 8, 10]], 10, '2026-09-01T10:00:00Z');
  p = prescribe(item, s, 1, 2);
  assert.equal(p.basis, 'miss'); assert.equal(p.weight, 400); assert.equal(p.reps, 10);

  // week 1 of cycle 2 reads cycle 1 week 13
  s = baseState(); logged(s, 1, 13, 'leg_press', [[360, 10, 7], [360, 10, 7], [360, 10, 7]], 10, '2026-12-01T10:00:00Z');
  p = prescribe(unityWeek(1)[0].items.find((i) => i.ex === 'leg_press'), s, 2, 1);
  assert.equal(p.basis, 'hit'); assert.equal(p.weight, 360); assert.equal(p.reps, 12);
});

test('weight progression and drop sets', () => {
  const item = unityWeek(2)[3].items.find((i) => i.ex === 'hack_single');
  const s = baseState(); logged(s, 1, 1, 'hack_single', [[180, 10, 10], [180, 10, 10]], 10, '2026-09-04T10:00:00Z');
  const p = prescribe(item, s, 1, 2);
  assert.equal(p.drop, true); assert.equal(p.weight, 185); assert.equal(p.reps, 10);
});

test('percentage work ignores history and reads the stored max', () => {
  const s = baseState(); logged(s, 1, 1, 'de_squat', [[300, 2, 6]], 2, '2026-09-01T10:00:00Z');
  const p = prescribe(unityWeek(2)[0].items[0], s, 1, 2);
  assert.equal(p.mode, 'pct'); assert.equal(p.weight, 220); assert.equal(p.sets.length, 12);
  s.maxes.squat = 425;
  assert.equal(prescribe(unityWeek(2)[0].items[0], s, 1, 2).weight, 230);
  const pw = prescribe(unityWeek(7)[0].items.find((i) => i.ex === 'speed_pull'), s, 1, 7);
  assert.equal(pw.sets[0].pct, 50); assert.equal(pw.sets[7].pct, 55);
});

test('deload halves sets, caps RPE, and uses 50%', () => {
  const s = baseState();
  const d1 = weekTemplates(10)[0];
  const sq = prescribe(d1.items[0], s, 1, 10);
  assert.equal(sq.sets.length, 5); assert.equal(sq.sets[0].pct, 50); assert.equal(sq.weight, 200); assert.equal(sq.rpeCap, 7);
  const d4 = weekTemplates(10)[3];
  const hack = prescribe(d4.items.find((i) => i.ex === 'hack_single'), s, 1, 10);
  assert.equal(hack.drop, false); assert.equal(hack.sets, 1);
  for (const sess of weekTemplates(10)) if (sess.kind === 'cond') assert.ok(sess.items.every((i) => i.ex === 'liss_tread'));
});

test('transition scales loads to 90% and caps RPE at 8', () => {
  const s = baseState(); logged(s, 1, 9, 'leg_press', [[500, 10, 9]], 10, '2026-11-01T10:00:00Z');
  const d1 = weekTemplates(13)[0];
  const sq = prescribe(d1.items[0], s, 1, 13);
  assert.equal(sq.weight, pctLoad(407 * 0.9, 55)); assert.equal(sq.rpeCap, 8);
  const lp = prescribe(d1.items.find((i) => i.ex === 'leg_press'), s, 1, 13);
  assert.equal(lp.basis, 'transition'); assert.equal(lp.weight, 450);
});

test('test week captures triples across both days', () => {
  const s = baseState();
  const a = buildSession(s, { cycle: 1, week: 12, idx: 1 });
  a.exercises[0].sets.push({ weight: 385, reps: 3, rpe: 10 });
  a.exercises[1].sets.push({ weight: 250, reps: 3, rpe: 10 });
  a.completedAt = '2026-11-20T10:00:00Z'; s.sessions.push(a);
  const b = buildSession(s, { cycle: 1, week: 12, idx: 2 });
  b.exercises[0].sets.push({ weight: 475, reps: 3, rpe: 10 });
  b.completedAt = '2026-11-22T10:00:00Z'; s.sessions.push(b);
  const t = cycleTests(s, 1);
  assert.deepEqual(t, { squat: { weight: 385, reps: 3, oneRM: 405 }, bench: { weight: 250, reps: 3, oneRM: 260 }, deadlift: { weight: 475, reps: 3, oneRM: 500 } });
  assert.equal(testResults(a).squat.oneRM, 405);
});

test('session stats count working sets only', () => {
  const s = baseState();
  const a = buildSession(s);
  a.exercises[0].sets.push({ weight: 135, reps: 3, feeder: true }, { weight: 220, reps: 2, rpe: 6 }, { weight: 220, reps: 2, rpe: 7 });
  a.startedAt = '2026-09-01T10:00:00Z'; a.completedAt = '2026-09-01T11:10:00Z';
  const st = sessionStats(a);
  assert.deepEqual(st, { sets: 2, tonnage: 880, avgRpe: 6.5, durationMin: 70 });
});

test('bodyweight trend prompts past 2 lb over two weeks', () => {
  const entries = [];
  for (let i = 0; i < 21; i++) entries.push({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, lb: 238 - i * 0.2 });
  const t = bodyweightTrend(entries);
  assert.equal(t.prompt, 'up');
  assert.equal(bodyweightTrend(entries.map((e) => ({ ...e, lb: 238 }))).prompt, null);
});

test('nutrition targets are a maintenance recomp, not the program bulk', () => {
  const n = nutritionTargets(238, { calPerLb: 14.5, proteinPerLb: 1.1, fatPerLb: 0.4 });
  assert.equal(n.cal, 3451); assert.equal(n.protein, 262); assert.equal(n.fat, 95);
  assert.ok(n.cal < 238 * 20);
  assert.equal(n.carbs, Math.round((3451 - 262 * 4 - 95 * 9) / 4));
});
