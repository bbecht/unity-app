// Unity (Meadows/Tate) nine-week program, condensed into data.
// Cues are written in our own words. Substitutions from the build spec are applied at the source:
//   slight-incline DB press (days 2 and 5)  -> Hammer Strength incline press, both arms together
//   slight-decline DB press (day 5)         -> Hammer Strength flat chest press, both arms together
//   Bulgarian split squat drop set          -> single-leg hack squat, same drop-set scheme
// Every other dumbbell movement stays as written.
//
// Load types:
//   pct  - percentage of the stored 1RM for `lift`, recalculated fresh every time
//   top  - ramp in feeders, then the listed top sets at a percentage
//   rel  - relative to what was logged for this exercise the week before (see engine.js)
//   cardio - timed conditioning
//   test - tested triple, feeds the 1RM recalculation

export const EX = {
  // Lower
  de_squat:        { name: 'Speed squat', bp: 'quads', rest: 60, cue: 'Bar speed is the whole point. Sit back, drive up hard, rack it. Every rep looks the same.' },
  speed_pull:      { name: 'Speed deadlift', bp: 'posterior', rest: 60, cue: 'Full reset each rep. Wedge in, push the floor away, stand fast. No touch-and-go.' },
  me_back_squat:   { name: 'Back squat, max effort', bp: 'quads', rest: 180, cue: 'Ramp in feeders. Only the marked top sets count. Nothing grinds.' },
  me_front_squat:  { name: 'Front squat, max effort', bp: 'quads', rest: 180, cue: 'Elbows high, stay tall. Percentages are of the back squat 1RM.' },
  leg_press:       { name: 'Leg press', bp: 'quads', rest: 120, cue: 'Full depth you can control. Do not lock out hard at the top.' },
  hack_single:     { name: 'Single-leg hack squat, drop set', bp: 'quads', rest: 120, cue: 'Sub for Bulgarian split squat. Hit the reps, strip weight, go straight back in. Log each leg as one set.' },
  lying_leg_curl:  { name: 'Lying leg curl', bp: 'hamstrings', rest: 90, cue: 'Squeeze at the top, control the way down. Hips stay planted.' },
  seated_leg_curl: { name: 'Seated leg curl', bp: 'hamstrings', rest: 90, cue: 'Lean forward slightly to lengthen the hamstring. Full range.' },
  leg_ext:         { name: 'Leg extension', bp: 'quads', rest: 90, cue: 'Pause a beat at the top. Higher reps, keep it moving.' },
  db_hyper:        { name: 'Dumbbell hyperextension', bp: 'hamstrings', rest: 90, cue: 'Dumbbell held at the chest. Hinge, do not round. Squeeze glutes at the top.' },
  rdl:             { name: 'Romanian deadlift', bp: 'hamstrings', rest: 120, cue: 'Push hips back, bar stays on the legs. Stop where the hamstrings stop, not the floor.' },
  glute_ham:       { name: 'Glute-ham raise', bp: 'hamstrings', rest: 90, cue: 'Slow negative. Add a plate or band assist as needed.' },
  calf_stand:      { name: 'Standing calf raise', bp: 'calves', rest: 60, cue: 'Full stretch at the bottom, pause at the top.' },
  calf_seated:     { name: 'Seated calf raise', bp: 'calves', rest: 60, cue: 'Same rule: full stretch, pause at the top.' },
  leg_raise:       { name: 'Hanging leg raise', bp: 'abs', rest: 60, cue: 'Curl the pelvis up, no swinging.' },
  // Push
  de_bench:        { name: 'Speed bench', bp: 'chest', rest: 60, cue: 'Competition grip. Fast off the chest, fast lockout. Tight the whole set.' },
  me_high_incline: { name: 'High incline barbell press, max effort', bp: 'shoulders', rest: 180, cue: 'Steep angle. Ramp in feeders, marked top sets count.' },
  me_floor:        { name: 'Floor press, max effort', bp: 'chest', rest: 180, cue: 'Dead stop on the floor each rep. Ramp in feeders, then the top sets.' },
  me_incline:      { name: 'Incline barbell press, max effort', bp: 'chest', rest: 180, cue: 'Moderate incline. Ramp, then top sets.' },
  hs_incline:      { name: 'Hammer Strength incline press', bp: 'chest', rest: 90, cue: 'Sub for slight-incline DB press. Both arms together. Neutral handle, elbows tucked.' },
  hs_flat:         { name: 'Hammer Strength flat chest press', bp: 'chest', rest: 90, cue: 'Sub for slight-decline DB press. Both arms together. Drive through, do not slam the stack.' },
  cg_bench:        { name: 'Close-grip bench', bp: 'triceps', rest: 120, cue: 'Index fingers at the smooth. Elbows in, touch low.' },
  dips:            { name: 'Dips', bp: 'chest', rest: 90, cue: 'Lean slightly forward. Add weight when the reps are there.' },
  jm_press:        { name: 'JM press', bp: 'triceps', rest: 90, cue: 'Bar to the chin line, elbows forward. Moderate weight, clean reps.' },
  db_lying_tri:    { name: 'Dumbbell lying triceps extension', bp: 'triceps', rest: 75, cue: 'Dumbbells go past the head, not to the forehead. Stretch and drive.' },
  db_kickout:      { name: 'Dumbbell triceps kickout', bp: 'triceps', rest: 75, cue: 'Lower to the chest, kick the dumbbells out and up. Elbows do the work.' },
  db_y_raise:      { name: 'Dumbbell Y raise', bp: 'shoulders', rest: 60, cue: 'Light. Thumbs up, arms in a Y, pause at the top.' },
  db_lat_partial:  { name: 'Dumbbell side lateral partial', bp: 'shoulders', rest: 60, cue: 'Heavier than a full lateral. Bottom half only, high reps, keep tension.' },
  rear_delt:       { name: 'Rear delt raise', bp: 'shoulders', rest: 60, cue: 'Bent over or on a machine. Lead with the elbows, no traps.' },
  // Pull
  cs_row:          { name: 'Chest-supported row', bp: 'back', rest: 90, cue: 'Chest stays on the pad. Pull to the ribs, squeeze, control back.' },
  meadows_row:     { name: 'Meadows row', bp: 'back', rest: 90, cue: 'One-arm barbell row from the landmine. Elbow high and back. Log per arm.' },
  pulldown:        { name: 'Lat pulldown', bp: 'back', rest: 90, cue: 'Pull the elbows to the hips. No leaning back for leverage.' },
  pullup:          { name: 'Pull-up', bp: 'back', rest: 90, cue: 'Full hang, chin over. Add weight when the reps are there. Log added weight only.' },
  cable_row:       { name: 'Seated cable row', bp: 'back', rest: 90, cue: 'Upright torso, pull to the navel, let the lats stretch on the return.' },
  db_row:          { name: 'One-arm dumbbell row', bp: 'back', rest: 90, cue: 'Long range of motion. Pull to the hip. Log per arm.' },
  rack_pull:       { name: 'Rack pull', bp: 'back', rest: 180, cue: 'Below the knee. Dead stop on the pins. Lock out hard.' },
  stiff_leg:       { name: 'Stiff-leg deadlift', bp: 'hamstrings', rest: 120, cue: 'Soft knees, flat back. Stop when the hamstrings stop.' },
  db_pullover:     { name: 'Dumbbell pullover', bp: 'back', rest: 60, cue: 'Big stretch across the lats. Do not let the elbows flare.' },
  shrug:           { name: 'Barbell shrug', bp: 'traps', rest: 60, cue: 'Straight up and down, hold the top for a count.' },
  inc_hammer_curl: { name: 'Incline hammer curl', bp: 'biceps', rest: 60, cue: 'Arms hang behind the torso. Neutral grip, no swinging.' },
  bb_curl:         { name: 'Barbell curl', bp: 'biceps', rest: 60, cue: 'Elbows pinned. Control the negative.' },
  // Competition lifts (peak phases)
  comp_squat:      { name: 'Competition squat', bp: 'quads', rest: 240, cue: 'Competition stance and depth. Ramp in feeders, top sets are what count.' },
  comp_bench:      { name: 'Competition bench', bp: 'chest', rest: 240, cue: 'Pause every rep. Competition grip.' },
  comp_dead:       { name: 'Competition deadlift', bp: 'posterior', rest: 240, cue: 'Competition stance. Full reset between reps.' },
  test_squat:      { name: 'Squat test triple', bp: 'quads', rest: 300, cue: 'Ramp in singles and doubles. One all-out triple with good form. Enter the best triple.' },
  test_bench:      { name: 'Bench test triple', bp: 'chest', rest: 300, cue: 'Paused reps. Enter the best triple.' },
  test_dead:       { name: 'Deadlift test triple', bp: 'posterior', rest: 300, cue: 'Full reset each rep. Enter the best triple.' },
  // Conditioning
  treadmill_finish:{ name: 'Treadmill finisher, low intensity', bp: 'cardio', rest: 0, cue: 'Walk. Conversational pace. Part of the session, not optional.' },
  hiit_stair:      { name: 'Stairmaster HIIT', bp: 'cardio', rest: 0, cue: 'Hard interval, easy interval, repeat. 12 minutes total.' },
  hiit_row:        { name: 'Rower HIIT', bp: 'cardio', rest: 0, cue: 'Hard interval, easy interval, repeat. 12 minutes total.' },
  liss_tread:      { name: 'Treadmill LISS', bp: 'cardio', rest: 0, cue: 'Steady walk or incline walk. Should feel easy.' },
};

// ---- builders ----
const P = (ex, lift, pct, sets, reps, extra = {}) => ({ ex, load: { type: 'pct', lift, pct }, sets, reps, ...extra });
// Two-wave speed work: first half of the sets at pctA, second half at pctB.
const PW = (ex, lift, pctA, pctB, sets, reps) => ({ ex, load: { type: 'pct', lift, pct: pctA, pct2: pctB }, sets, reps });
const TOP = (ex, lift, tops) => ({ ex, load: { type: 'top', lift, tops }, sets: tops.length, reps: tops[0].reps });
const R = (ex, sets, reps, prog = { k: 'reps', add: 2 }, extra = {}) => ({ ex, load: { type: 'rel' }, sets, reps, prog, ...extra });
const DROP = (ex, sets, reps) => ({ ex, load: { type: 'rel' }, sets, reps, prog: { k: 'wt', add: 5 }, drop: true });
const C = (ex, minutes) => ({ ex, load: { type: 'cardio' }, minutes });
const FIN = () => C('treadmill_finish', 15);

const S = (day, name, items, extra = {}) => ({ key: `d${day}`, day, name, kind: 'lift', items, ...extra });
const COND = (day, items) => ({ key: `d${day}`, day, name: 'Conditioning', kind: 'cond', skippable: true, items });

export const CONDITIONING = {
  6: () => COND(6, [C('hiit_stair', 12), C('liss_tread', 30)]),
  7: () => COND(7, [C('hiit_row', 12), C('liss_tread', 30)]),
  lissOnly: (day) => COND(day, [C('liss_tread', 30)]),
};

// ---- weeks 1 to 9 ----
// w is the week number within the cycle. i is the index within the block (0, 1, 2).
function block1(w) {
  const i = w - 1;
  return [
    S(1, 'Lower body, dynamic', [
      P('de_squat', 'squat', 55, [10, 12, 15][i], 2),
      P('speed_pull', 'deadlift', [55, 60, 65][i], 8, 1),
      R('leg_press', 3, 10),
      R('lying_leg_curl', 3, 10),
      R('db_hyper', 3, 10),
      R('calf_stand', 3, 12),
      FIN(),
    ]),
    S(2, 'Upper push, dynamic', [
      P('de_bench', 'bench', 55, [9, 12, 15][i], 3),
      R('hs_incline', 3, 8),
      R('db_lying_tri', 3, 10),
      R('db_y_raise', 3, 10),
      R('db_lat_partial', 3, 20, { k: 'reps', add: 5 }),
      FIN(),
    ]),
    S(3, 'Back and pull', [
      R('cs_row', 4, 8),
      R('pulldown', 3, 10),
      R('meadows_row', 3, 8),
      R('stiff_leg', 3, 8),
      R('inc_hammer_curl', 3, 10),
      R('shrug', 3, 12, { k: 'reps', add: 3 }),
      FIN(),
    ]),
    S(4, 'Lower body, max effort', [
      TOP('me_back_squat', 'squat', [
        [{ pct: 70, reps: 5 }, { pct: 70, reps: 5 }],
        [{ pct: 70, reps: 5 }, { pct: 75, reps: 3 }, { pct: 70, reps: 5 }],
        [{ pct: 70, reps: 5 }, { pct: 75, reps: 3 }, { pct: 80, reps: 2 }],
      ][i]),
      DROP('hack_single', 2, 10),
      R('seated_leg_curl', 3, 12),
      R('leg_ext', 3, 15, { k: 'reps', add: 3 }),
      R('leg_raise', 3, 12),
      FIN(),
    ]),
    S(5, 'Upper push, max effort', [
      TOP('me_high_incline', 'bench', [{ pct: 80, reps: 3 }, { pct: 80, reps: 3 }]),
      R('hs_incline', 3, 8),
      R('hs_flat', 3, 8),
      R('db_kickout', 3, 10),
      R('rear_delt', 3, 15, { k: 'reps', add: 3 }),
      FIN(),
    ]),
    CONDITIONING[6](),
    CONDITIONING[7](),
  ];
}

function block2(w) {
  const i = w - 4;
  return [
    S(1, 'Lower body, dynamic', [
      P('de_squat', 'squat', [65, 70, 75][i], [12, 10, 8][i], 2),
      R('rdl', 3, 8),
      R('leg_press', 3, 12),
      R('glute_ham', 3, 8),
      R('db_hyper', 3, 12),
      R('calf_seated', 3, 15, { k: 'reps', add: 3 }),
      FIN(),
    ]),
    S(2, 'Upper push, dynamic', [
      P('de_bench', 'bench', [65, 70, 75][i], [12, 10, 8][i], 3),
      R('hs_incline', 3, 10),
      R('dips', 3, 10),
      R('db_lying_tri', 3, 12),
      R('db_y_raise', 3, 12),
      R('db_lat_partial', 3, 25, { k: 'reps', add: 5 }),
      FIN(),
    ]),
    S(3, 'Back and pull', [
      R('pullup', 4, 8, { k: 'reps', add: 1 }),
      R('meadows_row', 3, 10),
      R('cable_row', 3, 10),
      R('rack_pull', 3, 5, { k: 'wt', add: 10 }),
      R('db_pullover', 3, 12),
      R('bb_curl', 3, 10),
      FIN(),
    ]),
    S(4, 'Lower body, max effort', [
      TOP('me_front_squat', 'squat', [{ pct: [55, 60, 65][i], reps: 3 }, { pct: [55, 60, 65][i], reps: 3 }, { pct: [55, 60, 65][i], reps: 3 }]),
      DROP('hack_single', 2, 10),
      R('seated_leg_curl', 3, 12),
      R('leg_ext', 3, 15, { k: 'reps', add: 3 }),
      R('leg_raise', 3, 12),
      FIN(),
    ]),
    S(5, 'Upper push, max effort', [
      TOP('me_floor', 'bench', [{ pct: 80, reps: 3 }, { pct: 80, reps: 3 }]),
      R('hs_incline', 3, 8),
      R('hs_flat', 3, 10),
      R('db_kickout', 3, 12),
      R('jm_press', 3, 8),
      R('rear_delt', 3, 15, { k: 'reps', add: 3 }),
      FIN(),
    ]),
    CONDITIONING[6](),
    CONDITIONING[7](),
  ];
}

function block3(w) {
  const i = w - 7;
  const day1Main = [
    P('de_squat', 'squat', 80, 6, 2),
    P('de_squat', 'squat', 55, 10, 2),
    TOP('me_back_squat', 'squat', [{ pct: 85, reps: 3 }, { pct: 90, reps: 2 }, { pct: 95, reps: 1 }]),
  ][i];
  const day2Main = [
    P('de_bench', 'bench', 80, 6, 3),
    P('de_bench', 'bench', 55, 9, 3),
    R('cg_bench', 4, 6),
  ][i];
  const day5Main = [
    TOP('me_incline', 'bench', [{ pct: 80, reps: 3 }, { pct: 80, reps: 3 }]),
    R('hs_incline', 4, 6),
    R('hs_incline', 4, 6),
  ][i];
  const lowerAccessory = i === 2
    ? [R('lying_leg_curl', 3, 10), R('db_hyper', 3, 10)]
    : [R('leg_press', 3, 10), R('lying_leg_curl', 3, 10), R('db_hyper', 3, 10), R('calf_stand', 3, 12)];
  return [
    S(1, i === 2 ? 'Lower body, max effort squat' : 'Lower body, dynamic', [
      day1Main,
      PW('speed_pull', 'deadlift', [50, 60, 70][i], [55, 65, 75][i], 8, 1),
      ...lowerAccessory,
      FIN(),
    ]),
    S(2, 'Upper push, dynamic', [
      day2Main,
      R('hs_incline', 3, 8),
      R('db_lying_tri', 3, 10),
      R('db_y_raise', 3, 10),
      R('db_lat_partial', 3, 20, { k: 'reps', add: 5 }),
      FIN(),
    ]),
    S(3, 'Back and pull', [
      R('cs_row', 4, 8),
      R('pulldown', 3, 10),
      R('meadows_row', 3, 8),
      R('db_row', 3, 10),
      R('inc_hammer_curl', 3, 10),
      R('shrug', 3, 12, { k: 'reps', add: 3 }),
      FIN(),
    ]),
    S(4, 'Lower body, rep work', [
      R('leg_press', 4, 8),
      DROP('hack_single', 2, 10),
      R('seated_leg_curl', 3, 12),
      R('leg_ext', 3, 15, { k: 'reps', add: 3 }),
      R('leg_raise', 3, 12),
      FIN(),
    ]),
    S(5, i === 0 ? 'Upper push, max effort' : 'Upper push, rep work', [
      day5Main,
      ...(i === 0 ? [R('hs_incline', 3, 8)] : []),
      R('hs_flat', 3, 8),
      R('db_kickout', 3, 10),
      R('rear_delt', 3, 15, { k: 'reps', add: 3 }),
      FIN(),
    ]),
    CONDITIONING[6](),
    CONDITIONING[7](),
  ];
}

export function unityWeek(w) {
  if (w >= 1 && w <= 3) return block1(w);
  if (w >= 4 && w <= 6) return block2(w);
  if (w >= 7 && w <= 9) return block3(w);
  throw new Error('unityWeek covers weeks 1 to 9 only');
}

export const PHASES = {
  1: 'Block 1', 2: 'Block 1', 3: 'Block 1',
  4: 'Block 2', 5: 'Block 2', 6: 'Block 2',
  7: 'Block 3', 8: 'Block 3', 9: 'Block 3',
  10: 'Deload', 11: 'Peak', 12: 'Taper and test', 13: 'Transition',
};

export const BLOCK_STARTS = { 1: 'Block 1 start', 4: 'Block 2 start', 7: 'Block 3 start', 10: 'Deload', 11: 'Peak', 12: 'Test week', 13: 'Transition' };

export const RPE_SCALE = [
  ['6', 'Warm-up feel. Feeder territory.'],
  ['7', 'Three or more clean reps left.'],
  ['8', 'Two clean reps left.'],
  ['9', 'One clean rep left.'],
  ['10', 'Failure with good form.'],
  ['11', 'Failure, then loose reps after the clean ones.'],
  ['12', 'One high-intensity technique past failure (drop, rest-pause, partials).'],
  ['13', 'More than one technique past failure.'],
];
