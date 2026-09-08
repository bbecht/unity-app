// Train: session preview, exercise list, set logging, conditioning, test capture, finish.
import * as store from '../store.js';
import * as A from '../actions.js';
import * as timer from '../timer.js';
import { el, stepper, toast, fmtDate, fmtNum } from '../ui.js';
import { prescribe, weekTemplates, posLabel, sessionStats, est1RM, LIFT_NAME, testResults, roundDown } from '../engine.js';
import { RPE_SCALE } from '../program.js';
import { render, go } from '../main.js';

const ui = { screen: 'list', exIdx: 0, draft: {}, cardio: {} };

export function trainTitle() {
  const s = store.get();
  return s.active ? `${s.active.name} - Unity` : 'Unity';
}

export function renderTrain() {
  const s = store.get();
  if (!s.active) { ui.screen = 'list'; return preview(s); }
  if (ui.screen === 'ex') return exerciseScreen(s);
  if (ui.screen === 'finish') return finishScreen(s);
  return listScreen(s);
}

// ---- helpers ----
function summary(p) {
  if (p.mode === 'cardio') return `${p.minutes} min`;
  if (p.mode === 'test') return `Heavy triple. Current 1RM ${p.current}`;
  if (p.mode === 'pct') {
    if (p.sets.some((x) => x.pct !== p.sets[0].pct)) {
      const a = p.sets.filter((x) => x.pct === p.sets[0].pct); const b = p.sets.filter((x) => x.pct !== p.sets[0].pct);
      return `${a.length} × ${p.reps} @ ${a[0].weight} (${a[0].pct}%), then ${b.length} × ${p.reps} @ ${b[0].weight} (${b[0].pct}%)`;
    }
    return `${p.sets.length} × ${p.reps} @ ${p.weight} (${p.pctLabel})`;
  }
  if (p.mode === 'top') return `Feeders, then ${p.sets.map((t) => `${t.reps} @ ${t.weight} (${t.pct}%)`).join(', ')}`;
  const drop = p.drop ? ' drop set' : '';
  if (p.anchored) return `${p.sets} × ${p.reps} @ ${p.weight}${drop}`;
  return `${p.sets} × ${p.reps}${drop}, pick a weight`;
}

function basisTag(p) {
  if (p.mode !== 'rel') return null;
  if (!p.anchored) return el('span', { class: 'flag' }, 'UNANCHORED');
  if (p.basis === 'hit') return el('span', { class: 'tag fill' }, `Hit last week: ${p.priorWeight} × ${p.priorReps}. Progress.`);
  if (p.basis === 'miss') return el('span', { class: 'tag' }, `Missed last week: ${p.priorWeight} × ${p.priorReps} of ${p.priorTarget}. Repeat.`);
  if (p.basis === 'transition') return el('span', { class: 'tag' }, 'Transition: 90% of last logged');
  return null;
}

function lastTimeBox(p) {
  if (!p.last) return el('div', { class: 'lasttime' }, 'Last time: no history');
  const l = p.last;
  return el('div', { class: 'lasttime' }, `Last time: ${l.weight} × ${l.reps}${l.rpe ? ` @ RPE ${l.rpe}` : ''} · ${l.sets} sets · ${fmtDate(l.date)}`);
}

function modeTags(p) {
  const tags = [];
  if (p.mode === 'pct') tags.push(el('span', { class: 'tag' }, `${p.pctLabel} of ${LIFT_NAME[p.lift]}`));
  if (p.mode === 'top') tags.push(el('span', { class: 'tag' }, `Max effort · % of ${LIFT_NAME[p.lift]}`));
  if (p.mode === 'rel') tags.push(el('span', { class: 'tag' }, 'Relative to last week'));
  if (p.drop) tags.push(el('span', { class: 'tag amber' }, 'Drop set'));
  if (p.rpeCap) tags.push(el('span', { class: 'tag amber' }, `RPE cap ${p.rpeCap}`));
  if (p.mode === 'cardio') tags.push(el('span', { class: 'tag' }, 'Conditioning'));
  if (p.mode === 'test') tags.push(el('span', { class: 'tag amber' }, 'TEST'));
  return el('div', { style: 'margin-bottom:8px' }, tags);
}

function currentTemplate(s) { return weekTemplates(s.active.week)[s.active.idx]; }

// ---- preview (no active session) ----
function preview(s) {
  const p = posLabel(s.pos);
  const tpl = weekTemplates(s.pos.week)[s.pos.idx];
  const items = tpl.items.map((it) => prescribe(it, s, s.pos.cycle, s.pos.week));
  const last = [...s.sessions].reverse().find((x) => !x.skipped);
  return el('div', {},
    el('div', { class: 'card bluebar' },
      el('div', { class: 'tag fill' }, `Cycle ${p.cycle} · Week ${p.week} · Day ${p.day}`),
      el('div', { class: 'tag' }, p.phase),
      el('h1', { style: 'margin-top:8px' }, tpl.name),
      tpl.note ? el('p', {}, tpl.note) : null,
      el('div', { class: 'stack' },
        el('button', { class: 'btn primary big', onclick: () => { A.startSession(); ui.screen = 'list'; ui.draft = {}; } }, 'Start session'),
        tpl.skippable ? el('button', { class: 'btn', onclick: () => { A.skipSession(); toast('Skipped. Moving on.'); } }, 'Skip this day') : null,
      ),
    ),
    el('div', { class: 'card' },
      el('h2', {}, 'Plan'),
      el('div', { class: 'exlist' }, items.map((it, i) => el('div', { class: 'ex', style: 'cursor:default' },
        el('div', { class: 'mark' }, i + 1),
        el('div', { class: 'grow' }, el('div', { class: 'n' }, it.name), el('div', { class: 'sub' }, summary(it)), basisTag(it)),
      ))),
    ),
    last ? el('div', { class: 'card dashed' }, el('h3', {}, 'Last session'), el('p', {}, `${last.name} · C${last.cycle} W${last.week} D${last.day} · ${fmtDate(last.completedAt)}`), statLine(last)) : null,
    el('div', { class: 'card dashed' }, el('p', {}, 'Wrong spot? Jump to another cycle, week, or day from More.'), el('button', { class: 'btn small', onclick: () => go('more', { open: 'position' }) }, 'Change position')),
  );
}

function statLine(session) {
  const st = sessionStats(session);
  return el('div', { class: 'grid3' },
    el('div', { class: 'stat' }, el('div', { class: 'v' }, st.sets), el('div', { class: 'l' }, 'sets')),
    el('div', { class: 'stat' }, el('div', { class: 'v' }, fmtNum(st.tonnage)), el('div', { class: 'l' }, 'lb tonnage')),
    el('div', { class: 'stat' }, el('div', { class: 'v' }, st.avgRpe || '–'), el('div', { class: 'l' }, 'avg RPE')),
  );
}

// ---- exercise list (active session) ----
function listScreen(s) {
  const a = s.active;
  const tpl = currentTemplate(s);
  return el('div', {},
    el('div', { class: 'card bluebar' },
      el('h1', {}, a.name),
      el('p', {}, `Started ${new Date(a.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`),
      tpl.note ? el('p', {}, tpl.note) : null,
    ),
    el('div', { class: 'exlist' }, a.exercises.map((e, i) => {
      const p = prescribe(tpl.items[i], s, a.cycle, a.week);
      const logged = e.sets.filter((x) => !x.feeder).length;
      const sub = e.mode === 'cardio' ? (e.done ? `${e.minutesDone || e.minutes} min done` : summary(p)) : `${summary(p)}${logged ? ` · ${logged} logged` : ''}`;
      return el('button', { class: `ex ${e.done ? 'done' : ''}`, onclick: () => { ui.screen = 'ex'; ui.exIdx = i; render(); } },
        el('div', { class: 'mark' }, e.done ? '✓' : i + 1),
        el('div', { class: 'grow' }, el('div', { class: 'n' }, e.name), el('div', { class: 'sub' }, sub)),
      );
    })),
    el('div', { class: 'stack' },
      el('button', { class: 'btn primary big', onclick: () => { ui.screen = 'finish'; render(); } }, 'Finish session'),
      el('button', { class: 'btn small', onclick: () => { if (confirm('Discard this session? Logged sets will be lost.')) { A.discardActive(); timer.stop(); } } }, 'Discard session'),
    ),
  );
}

// ---- exercise screen ----
function prefill(e, p, s) {
  const d = ui.draft[ui.exIdx];
  if (d) return d;
  const working = e.sets.filter((x) => !x.feeder);
  const lastSet = e.sets[e.sets.length - 1];
  let weight = 0, reps = p.reps || 0, rpe = lastSet ? lastSet.rpe : 0;
  if (p.mode === 'top') { const nxt = p.sets[working.length] || p.sets[p.sets.length - 1]; weight = nxt.weight; reps = nxt.reps; }
  else if (p.mode === 'pct') { const nxt = p.sets[working.length] || p.sets[p.sets.length - 1]; weight = nxt.weight; reps = nxt.reps; }
  else if (p.mode === 'test') { weight = lastSet ? lastSet.weight : roundDown(p.current * 0.9); reps = 3; }
  else { weight = lastSet ? lastSet.weight : (p.weight ?? p.hint ?? (p.last ? p.last.weight : 0)); reps = lastSet && !lastSet.feeder ? lastSet.reps : (p.reps || 0); }
  if (working.length && p.mode === 'rel') { weight = working[working.length - 1].weight; reps = working[working.length - 1].reps; }
  return (ui.draft[ui.exIdx] = { weight, reps, rpe: rpe || 0, feeder: false });
}

function exerciseScreen(s) {
  const a = s.active;
  const i = ui.exIdx;
  const e = a.exercises[i];
  const tpl = currentTemplate(s);
  const p = prescribe(tpl.items[i], s, a.cycle, a.week);
  const inc = s.athlete.incrementLb || 5;

  const nav = el('div', { class: 'row', style: 'margin-bottom:10px' },
    el('button', { class: 'btn small', onclick: () => { ui.screen = 'list'; render(); } }, '‹ List'),
    el('button', { class: 'btn small', disabled: i === 0, onclick: () => { ui.exIdx = i - 1; render(); } }, '‹ Prev'),
    el('button', { class: 'btn small', disabled: i >= a.exercises.length - 1, onclick: () => { ui.exIdx = i + 1; render(); } }, 'Next ›'),
  );

  const header = el('div', { class: 'card' },
    el('div', { style: 'font-weight:800;font-size:15px' }, `Exercise ${i + 1} of ${a.exercises.length}`),
    el('h1', {}, p.name),
    modeTags(p),
    el('p', {}, p.cue),
    p.note ? el('p', { style: 'font-weight:800' }, p.note) : null,
  );

  let body;
  if (p.mode === 'cardio') body = cardioBody(e, p, i);
  else if (p.mode === 'test') body = testBody(e, p, i, s);
  else body = setBody(e, p, i, s, inc);

  const notes = el('div', { class: 'card' },
    el('label', { for: 'notes' }, 'Notes'),
    el('textarea', { id: 'notes', value: e.notes || '', onchange: (ev) => A.setNotes(i, ev.target.value) }),
  );

  const doneBtn = el('button', { class: 'btn primary big', onclick: () => {
    A.markExercise(i, { done: true });
    const next = a.exercises.findIndex((x, k) => k > i && !x.done);
    if (next >= 0) { ui.exIdx = next; ui.screen = 'ex'; } else { ui.screen = 'list'; }
    render();
  } }, e.done ? 'Done ✓ · Next' : 'Done · Next');

  return el('div', {}, nav, header, body, notes, doneBtn);
}

function plannedChips(p, e) {
  if (p.mode === 'top') return el('div', {},
    el('div', { class: 'planned' }, p.feeders.map((f) => el('span', { style: 'font-style:italic;font-weight:400' }, `feeder ${f.reps} @ ${f.weight}`))),
    el('div', { class: 'planned' }, p.sets.map((t, k) => el('span', { class: 'top' }, `Top ${k + 1}: ${t.reps} @ ${t.weight} (${t.pct}%)`))),
  );
  if (p.mode === 'pct') {
    const groups = [];
    for (const st of p.sets) { const g = groups[groups.length - 1]; if (g && g.pct === st.pct) g.n += 1; else groups.push({ pct: st.pct, weight: st.weight, n: 1 }); }
    return el('div', { class: 'planned' }, groups.map((g) => el('span', { class: 'top' }, `${g.n} × ${p.reps} @ ${g.weight} (${g.pct}%)`)));
  }
  const drop = p.drop ? el('span', { class: 'top' }, 'Drop set: strip and go again') : null;
  if (p.anchored) return el('div', { class: 'planned' }, el('span', { class: 'top' }, `${p.sets} × ${p.reps} @ ${p.weight}`), drop);
  return el('div', { class: 'planned' }, el('span', { class: 'top' }, `${p.sets} × ${p.reps}`), el('span', {}, p.hint ? `hint: last used ${p.hint}` : 'pick a weight, RPE 8'), drop);
}

function setBody(e, p, i, s, inc) {
  const d = prefill(e, p, s);
  const rest = p.rest;
  const grid = el('div', { class: 'setgrid' },
    el('div', { class: 'cell' }, el('label', {}, 'Weight'), stepper({ value: d.weight, step: inc, max: 2000, onChange: (v) => { d.weight = v; } })),
    el('div', { class: 'cell' }, el('label', {}, 'Reps'), stepper({ value: d.reps, step: 1, max: 200, onChange: (v) => { d.reps = v; } })),
    el('div', { class: 'cell' }, el('label', {}, 'RPE'), stepper({ value: d.rpe || '', step: 1, min: 0, max: 13, onChange: (v) => { d.rpe = v; } })),
  );
  const feeder = el('label', { class: 'check', style: 'text-transform:none;font-size:17px;margin-top:8px' },
    el('input', { type: 'checkbox', checked: d.feeder, onchange: (ev) => { d.feeder = ev.target.checked; } }), 'Feeder set (ramp, not counted)');
  const logBtn = el('button', { class: 'btn primary big', style: 'margin-top:10px', onclick: () => {
    if (!d.reps && !d.feeder) { toast('Enter reps'); return; }
    if (p.rpeCap && d.rpe > p.rpeCap) toast(`RPE cap is ${p.rpeCap} this week`);
    A.logSet(i, d);
    delete ui.draft[i];
    if (rest > 0) timer.start(rest);
  } }, 'Log set');
  const restCtl = el('div', { style: 'margin-top:10px' }, el('label', {}, 'Rest, seconds'), stepper({ value: rest, step: 15, min: 0, max: 900, onChange: (v) => A.setRest(e.ex, v) }));
  const rows = e.sets.map((st, k) => el('div', { class: `setrow ${st.feeder ? 'feeder' : ''}` },
    el('div', { class: 'idx' }, st.feeder ? 'F' : `#${e.sets.slice(0, k + 1).filter((x) => !x.feeder).length}`),
    el('div', {}, `${st.weight} lb`), el('div', {}, `× ${st.reps}`), el('div', {}, st.rpe ? `RPE ${st.rpe}` : ''),
    el('button', { class: 'x', 'aria-label': 'delete set', onclick: () => { A.removeSet(i, k); delete ui.draft[i]; } }, '×'),
  ));
  const working = e.sets.filter((x) => !x.feeder).length;
  const targetSets = p.mode === 'rel' ? p.sets : p.sets.length;
  return el('div', { class: 'card' },
    lastTimeBox(p), basisTag(p), plannedChips(p, e),
    el('div', { style: 'font-weight:900;margin:6px 0' }, `Working sets logged: ${working} of ${targetSets}`),
    grid, feeder, logBtn, restCtl,
    rows.length ? el('div', { style: 'margin-top:12px' }, rows) : null,
    el('details', { style: 'margin-top:10px' }, el('summary', {}, 'RPE scale'), el('table', { class: 'rpe-help' }, RPE_SCALE.map(([n, t]) => el('tr', {}, el('td', { style: 'font-weight:900' }, n), el('td', {}, t))))),
  );
}

function cardioBody(e, p, i) {
  const c = ui.cardio[i] || (ui.cardio[i] = { startedAt: null, elapsed: 0, iv: null });
  const digits = el('div', { class: 'huge center' }, fmt(c.elapsed));
  function fmt(sec) { return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
  function tickUI() { digits.textContent = fmt(c.elapsed + (c.startedAt ? Math.floor((Date.now() - c.startedAt) / 1000) : 0)); }
  if (c.startedAt && !c.iv) c.iv = setInterval(tickUI, 500);
  const toggle = el('button', { class: 'btn', onclick: () => {
    if (c.startedAt) { c.elapsed += Math.floor((Date.now() - c.startedAt) / 1000); c.startedAt = null; clearInterval(c.iv); c.iv = null; toggle.textContent = 'Resume'; }
    else { c.startedAt = Date.now(); c.iv = setInterval(tickUI, 500); toggle.textContent = 'Pause'; }
  } }, c.startedAt ? 'Pause' : (c.elapsed ? 'Resume' : 'Start clock'));
  const minutes = el('div', {}, el('label', {}, 'Minutes completed'), stepper({ value: e.minutesDone || p.minutes, step: 1, max: 300, onChange: (v) => { e._min = v; } }));
  return el('div', { class: 'card' },
    el('div', { class: 'big center' }, `${p.minutes} minutes`),
    digits, toggle, el('div', { style: 'height:10px' }), minutes,
    el('button', { class: 'btn accent', style: 'margin-top:10px', onclick: () => { clearInterval(c.iv); A.markExercise(i, { done: true, minutesDone: e._min || e.minutesDone || p.minutes }); toast('Conditioning logged'); } }, e.done ? 'Logged ✓' : 'Mark complete'),
  );
}

function testBody(e, p, i, s) {
  const d = prefill(e, p, s);
  const est = el('div', { class: 'stat' }, el('div', { class: 'v' }, est1RM(d.weight, d.reps)), el('div', { class: 'l' }, 'estimated 1RM'));
  const delta = el('div', { class: 'stat' }, el('div', { class: 'v' }, ''), el('div', { class: 'l' }, `vs current ${p.current}`));
  function refresh() { const v = est1RM(d.weight, d.reps); est.firstChild.textContent = v; const df = v - p.current; delta.firstChild.textContent = (df >= 0 ? '+' : '') + df; }
  refresh();
  const best = testResults({ exercises: [e] });
  const lift = Object.keys(best)[0];
  return el('div', { class: 'card amberbar' },
    el('p', {}, 'Ramp in singles and doubles as feeders (not logged). Log the best triple. The most conservative formula is used and rounded down to 5 lb.'),
    el('div', { class: 'setgrid' },
      el('div', { class: 'cell' }, el('label', {}, 'Weight'), stepper({ value: d.weight, step: 5, max: 2000, onChange: (v) => { d.weight = v; refresh(); } })),
      el('div', { class: 'cell' }, el('label', {}, 'Reps'), stepper({ value: d.reps, step: 1, min: 1, max: 10, onChange: (v) => { d.reps = v; refresh(); } })),
      el('div', { class: 'cell' }, el('label', {}, 'RPE'), stepper({ value: d.rpe || 10, step: 1, min: 6, max: 13, onChange: (v) => { d.rpe = v; } })),
    ),
    el('div', { class: 'grid2', style: 'margin:10px 0' }, est, delta),
    el('button', { class: 'btn primary big', onclick: () => { A.logSet(i, { ...d, feeder: false }); delete ui.draft[i]; toast('Triple logged'); } }, 'Log triple'),
    e.sets.length ? el('div', { style: 'margin-top:12px' }, e.sets.map((st, k) => el('div', { class: 'setrow' }, el('div', { class: 'idx' }, `#${k + 1}`), el('div', {}, `${st.weight} lb`), el('div', {}, `× ${st.reps}`), el('div', {}, `→ ${est1RM(st.weight, st.reps)}`), el('button', { class: 'x', onclick: () => { A.removeSet(i, k); delete ui.draft[i]; } }, '×')))) : null,
    lift ? el('p', { style: 'font-weight:900;margin-top:10px' }, `Best: ${best[lift].weight} × ${best[lift].reps} → new ${LIFT_NAME[lift]} 1RM ${best[lift].oneRM}`) : null,
  );
}

// ---- finish ----
function finishScreen(s) {
  const a = s.active;
  const empty = a.exercises.filter((e) => e.mode !== 'cardio' && !e.sets.length && !e.done).length;
  const tests = a.kind === 'test' ? testResults(a) : null;
  const isTestB = a.week === 12 && a.key === 'd3';
  return el('div', {},
    el('button', { class: 'btn small', onclick: () => { ui.screen = 'list'; render(); } }, '‹ Back'),
    el('div', { class: 'card bluebar', style: 'margin-top:10px' },
      el('h1', {}, 'Finish session'),
      el('p', {}, a.name),
      statLine({ ...a, completedAt: new Date().toISOString() }),
      empty ? el('p', { style: 'margin-top:10px' }, el('span', { class: 'flag' }, `${empty} exercise${empty > 1 ? 's' : ''} with nothing logged`)) : null,
      tests && Object.keys(tests).length ? el('div', { style: 'margin-top:10px' }, Object.entries(tests).map(([l, t]) => el('div', { class: 'tag fill' }, `${LIFT_NAME[l]}: ${t.weight} × ${t.reps} → ${t.oneRM}`))) : null,
      isTestB ? el('p', { style: 'margin-top:10px;font-weight:800' }, 'Finishing this session stores the new 1RMs from both test days and rebuilds every percentage for the transition week and the next cycle.') : null,
    ),
    el('div', { class: 'card' },
      el('label', { for: 'snotes' }, 'Session notes'),
      el('textarea', { id: 'snotes', value: a.notes || '', onchange: (ev) => A.setSessionNotes(ev.target.value) }),
    ),
    el('button', { class: 'btn primary big', onclick: () => {
      const before = { ...s.maxes };
      const done = A.completeSession();
      timer.stop(); ui.screen = 'list'; ui.draft = {}; ui.cardio = {};
      const after = store.get().maxes;
      const changed = Object.keys(after).filter((k) => after[k] !== before[k]);
      toast(changed.length ? `New 1RMs: ${changed.map((k) => `${LIFT_NAME[k]} ${after[k]}`).join(', ')}` : `Logged. ${sessionStats(done).sets} sets.`, 3500);
    } }, 'Finish and advance'),
  );
}
