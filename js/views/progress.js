// Progress: 1RM cycle over cycle, per-exercise history, weekly volume, bodyweight trend.
import * as store from '../store.js';
import * as A from '../actions.js';
import { el, svgEl, fmtDate, fmtNum, toast } from '../ui.js';
import { EX, LIFTS, LIFT_NAME, exerciseHistory, weeklyVolume, rollingAverage, bodyweightTrend } from '../engine.js';
import { render } from '../main.js';

const ui = { tab: 'maxes', ex: 'de_squat' };
const TABS = [['maxes', '1RM'], ['exercise', 'Exercise'], ['volume', 'Volume'], ['bodyweight', 'Bodyweight']];

export function renderProgress() {
  const s = store.get();
  const tabs = el('div', { class: 'grid2', style: 'margin-bottom:12px' }, TABS.map(([k, l]) => el('button', { class: `btn small ${ui.tab === k ? 'primary' : ''}`, style: 'width:100%', 'aria-pressed': ui.tab === k ? 'true' : 'false', onclick: () => { ui.tab = k; render(); } }, l)));
  const body = { maxes: maxesView, exercise: exerciseView, volume: volumeView, bodyweight: bodyweightView }[ui.tab](s);
  return el('div', {}, tabs, body);
}

// ---- charts (single series, black marks, direct labels, table alongside) ----
function barChart(data, { height = 200, fmt = (v) => v } = {}) {
  const W = 700, padL = 10, padR = 10, padT = 28, padB = 34;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length; const bw = (W - padL - padR) / n; const gap = Math.min(12, bw * 0.2);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': 'bar chart' });
  data.forEach((d, i) => {
    const h = (d.value / max) * (height - padT - padB);
    const x = padL + i * bw + gap / 2; const y = height - padB - h;
    svg.append(svgEl('rect', { class: `bar ${d.cls || ''}`, x, y, width: bw - gap, height: h, rx: 3 }));
    svg.append(svgEl('text', { x: x + (bw - gap) / 2, y: y - 6, 'text-anchor': 'middle', 'font-size': 15 }, fmt(d.value)));
    svg.append(svgEl('text', { x: x + (bw - gap) / 2, y: height - padB + 20, 'text-anchor': 'middle', 'font-size': 14 }, d.label));
  });
  svg.append(svgEl('line', { class: 'axis', x1: padL, x2: W - padR, y1: height - padB, y2: height - padB }));
  return el('div', { class: 'chart' }, svg);
}

function lineChart(points, avgPts, { height = 220 } = {}) {
  const W = 700, padL = 46, padR = 14, padT = 16, padB = 30;
  const vals = points.map((p) => p.v).concat(avgPts.map((p) => p.v));
  const min = Math.floor(Math.min(...vals) - 1), max = Math.ceil(Math.max(...vals) + 1);
  const x = (i) => padL + (i / Math.max(1, points.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (height - padT - padB);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': 'bodyweight line chart' });
  for (const g of [min, (min + max) / 2, max]) {
    svg.append(svgEl('line', { x1: padL, x2: W - padR, y1: y(g), y2: y(g), stroke: 'currentColor', 'stroke-width': 1, 'stroke-dasharray': '4 6', style: 'color:var(--fg)' }));
    svg.append(svgEl('text', { x: padL - 6, y: y(g) + 5, 'text-anchor': 'end', 'font-size': 13 }, Math.round(g * 10) / 10));
  }
  svg.append(svgEl('polyline', { class: 'line', points: points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ') }));
  points.forEach((p, i) => svg.append(svgEl('circle', { class: 'dot', cx: x(i), cy: y(p.v), r: 4 })));
  svg.append(svgEl('polyline', { class: 'line avg', points: avgPts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ') }));
  const lastAvg = avgPts[avgPts.length - 1];
  if (lastAvg) svg.append(svgEl('text', { x: x(avgPts.length - 1) - 4, y: y(lastAvg.v) - 10, 'text-anchor': 'end', 'font-size': 15 }, `7-day avg ${lastAvg.v}`));
  if (points.length) { svg.append(svgEl('text', { x: padL, y: height - 6, 'font-size': 13 }, fmtDate(points[0].d))); svg.append(svgEl('text', { x: W - padR, y: height - 6, 'text-anchor': 'end', 'font-size': 13 }, fmtDate(points[points.length - 1].d))); }
  return el('div', { class: 'chart' },
    el('div', { class: 'legend' }, el('span', {}, el('span', { class: 'sw line' }), 'Daily (thin, dots)'), el('span', {}, el('span', { class: 'sw avg' }), '7-day average (thick)')),
    svg);
}

// ---- 1RM ----
function maxesView(s) {
  const cycles = [...new Set(s.maxHistory.map((m) => m.cycle))].sort((a, b) => a - b);
  const rows = [];
  // Seed row: the numbers the first cycle was built on.
  const first = {}; for (const l of LIFTS) { const h = s.maxHistory.filter((m) => m.lift === l).sort((a, b) => a.cycle - b.cycle)[0]; first[l] = h ? h.prior : s.maxes[l]; }
  rows.push({ label: 'Seed', maxes: first, delta: null });
  for (const c of cycles) {
    const m = {}; for (const l of LIFTS) { const h = s.maxHistory.find((x) => x.cycle === c && x.lift === l); m[l] = h ? h.oneRM : (rows[rows.length - 1].maxes[l]); }
    const prev = rows[rows.length - 1].maxes;
    rows.push({ label: `C${c}`, maxes: m, delta: Object.fromEntries(LIFTS.map((l) => [l, m[l] - prev[l]])) });
  }
  const total = (m) => LIFTS.reduce((a, l) => a + m[l], 0);
  const cur = el('div', { class: 'grid3' }, LIFTS.map((l) => el('div', { class: 'stat' }, el('div', { class: 'v' }, s.maxes[l]), el('div', { class: 'l' }, LIFT_NAME[l]))));
  const table = el('div', { class: 'scroll-x' }, el('table', {},
    el('tr', {}, el('th', {}, ''), LIFTS.map((l) => el('th', { class: 'num' }, LIFT_NAME[l])), el('th', { class: 'num' }, 'Total')),
    rows.map((r) => el('tr', {}, el('td', { style: 'font-weight:900' }, r.label),
      LIFTS.map((l) => el('td', { class: 'num' }, r.maxes[l], r.delta ? el('div', { style: 'font-size:13px' }, sign(r.delta[l])) : null)),
      el('td', { class: 'num', style: 'font-weight:900' }, total(r.maxes), r.delta ? el('div', { style: 'font-size:13px' }, sign(total(r.maxes) - total(rows[rows.indexOf(r) - 1].maxes))) : null))),
  ));
  return el('div', {},
    el('div', { class: 'card bluebar' }, el('h2', {}, 'Current 1RMs'), cur, el('div', { class: 'stat', style: 'margin-top:10px' }, el('div', { class: 'v' }, total(s.maxes)), el('div', { class: 'l' }, 'total'))),
    el('div', { class: 'card' }, el('h2', {}, 'Cycle over cycle'), table,
      rows.length > 1 ? el('div', { style: 'margin-top:12px' }, el('h3', {}, 'Total by cycle'), barChart(rows.map((r) => ({ label: r.label, value: total(r.maxes) })))) : el('p', { style: 'margin-top:8px' }, 'The first test at the end of week 12 adds the first comparison row.')),
    s.maxHistory.length ? el('div', { class: 'card dashed' }, el('h3', {}, 'Test log'), el('table', {}, el('tr', {}, el('th', {}, 'Cycle'), el('th', {}, 'Lift'), el('th', { class: 'num' }, 'Triple'), el('th', { class: 'num' }, '1RM'), el('th', { class: 'num' }, 'Delta'), el('th', {}, 'Date')),
      [...s.maxHistory].reverse().map((m) => el('tr', {}, el('td', {}, m.cycle), el('td', {}, LIFT_NAME[m.lift]), el('td', { class: 'num' }, `${m.testedWeight} × ${m.testedReps}`), el('td', { class: 'num' }, m.oneRM), el('td', { class: 'num' }, sign(m.delta)), el('td', {}, m.date))))) : null,
  );
}
function sign(n) { return n > 0 ? `+${n}` : `${n}`; }

// ---- per-exercise ----
function exerciseView(s) {
  const ids = Object.keys(EX).filter((k) => EX[k].bp !== 'cardio').sort((a, b) => EX[a].name.localeCompare(EX[b].name));
  const logged = new Set(s.sessions.flatMap((x) => (x.exercises || []).map((e) => e.ex)));
  const sel = el('select', { onchange: (ev) => { ui.ex = ev.target.value; render(); } }, ids.map((k) => el('option', { value: k, selected: k === ui.ex ? true : null }, `${EX[k].name}${logged.has(k) ? '' : ' (no data)'}`)));
  const hist = exerciseHistory(s, ui.ex);
  const best = hist.reduce((a, h) => Math.max(a, h.weight), 0);
  return el('div', {},
    el('div', { class: 'card' }, el('label', {}, 'Exercise'), sel),
    hist.length ? el('div', { class: 'card' },
      el('h2', {}, EX[ui.ex].name),
      el('div', { class: 'grid2', style: 'margin-bottom:10px' }, el('div', { class: 'stat' }, el('div', { class: 'v' }, hist.length), el('div', { class: 'l' }, 'sessions')), el('div', { class: 'stat' }, el('div', { class: 'v' }, best), el('div', { class: 'l' }, 'heaviest')) ),
      barChart([...hist].reverse().slice(-12).map((h) => ({ label: `W${h.week}`, value: h.weight })), { height: 180 }),
      el('table', { style: 'margin-top:10px' }, el('tr', {}, el('th', {}, 'When'), el('th', {}, 'Sets')),
        hist.map((h) => el('tr', {}, el('td', {}, `${fmtDate(h.date)}`, el('div', { style: 'font-size:13px' }, `C${h.cycle} W${h.week}`)), el('td', {}, h.sets.map((st) => `${st.weight}×${st.reps}${st.rpe ? `@${st.rpe}` : ''}`).join(', '), h.notes ? el('div', { style: 'font-size:14px;font-style:italic' }, h.notes) : null)))),
    ) : el('div', { class: 'card dashed' }, el('p', {}, 'Nothing logged for this exercise yet.')),
  );
}

// ---- volume ----
function volumeView(s) {
  const rows = weeklyVolume(s);
  if (!rows.length) return el('div', { class: 'card dashed' }, el('p', {}, 'Volume appears after the first completed session.'));
  const recent = rows.slice(-13);
  return el('div', {},
    el('div', { class: 'card' }, el('h2', {}, 'Tonnage by week'), barChart(recent.map((r) => ({ label: `C${r.cycle}W${r.week}`, value: r.tonnage })), { fmt: (v) => fmtNum(v / 1000) + 'k' })),
    el('div', { class: 'card' }, el('h2', {}, 'Working sets by week'), barChart(recent.map((r) => ({ label: `C${r.cycle}W${r.week}`, value: r.sets })), { height: 160 })),
    el('div', { class: 'card' }, el('h2', {}, 'By bodypart'),
      [...rows].reverse().map((r) => el('details', {}, el('summary', {}, `Cycle ${r.cycle}, week ${r.week}: ${r.sets} sets, ${fmtNum(r.tonnage)} lb`),
        el('table', {}, el('tr', {}, el('th', {}, 'Bodypart'), el('th', { class: 'num' }, 'Sets'), el('th', { class: 'num' }, 'Tonnage')),
          Object.entries(r.byBp).sort((a, b) => b[1].sets - a[1].sets).map(([bp, v]) => el('tr', {}, el('td', {}, bp), el('td', { class: 'num' }, v.sets), el('td', { class: 'num' }, fmtNum(v.tonnage)))))))),
  );
}

// ---- bodyweight ----
function bodyweightView(s) {
  const ra = rollingAverage(s.bodyweight);
  const t = bodyweightTrend(s.bodyweight);
  const n = s.nutrition;
  let prompt = null;
  if (t && t.prompt && n.ackedTrend !== t.latest.date) {
    const dir = t.prompt === 'down' ? 'Weight is up' : 'Weight is down';
    const step = t.prompt === 'down' ? -100 : 100;
    prompt = el('div', { class: 'card amberbar' },
      el('h2', {}, `${dir} ${Math.abs(t.delta)} lb over two weeks`),
      el('p', {}, `Goal is to hold bodyweight. Adjust calories by about 100 per day and re-check in two weeks. Current multiplier: ${n.calPerLb} kcal per lb.`),
      el('div', { class: 'row' },
        el('button', { class: 'btn primary', onclick: () => { A.setNutrition({ calPerLb: Math.round((n.calPerLb + step / (s.athlete.bodyweightLb || 238)) * 100) / 100, lastAdjust: store.today(), ackedTrend: t.latest.date }); toast(`Calories ${step > 0 ? 'up' : 'down'} ${Math.abs(step)}`); } }, `${step > 0 ? 'Add' : 'Cut'} ${Math.abs(step)} kcal`),
        el('button', { class: 'btn', onclick: () => { A.setNutrition({ ackedTrend: t.latest.date }); } }, 'Keep as is'),
      ));
  }
  return el('div', {},
    prompt,
    el('div', { class: 'card bluebar' }, el('h2', {}, 'Bodyweight'),
      ra.length ? el('div', { class: 'grid2', style: 'margin-bottom:10px' }, el('div', { class: 'stat' }, el('div', { class: 'v' }, ra[ra.length - 1].avg), el('div', { class: 'l' }, '7-day average')), el('div', { class: 'stat' }, el('div', { class: 'v' }, t && t.delta != null ? sign(t.delta) : '–'), el('div', { class: 'l' }, '2-week change'))) : null,
      ra.length >= 2 ? lineChart(ra.slice(-42).map((r) => ({ d: r.date, v: r.lb })), ra.slice(-42).map((r) => ({ d: r.date, v: r.avg }))) : el('p', {}, 'Log bodyweight from the check-in screen. The chart needs two entries.'),
    ),
    ra.length ? el('div', { class: 'card' }, el('h3', {}, 'Recent entries'), el('table', {}, el('tr', {}, el('th', {}, 'Date'), el('th', { class: 'num' }, 'Weight'), el('th', { class: 'num' }, '7-day avg')), [...ra].reverse().slice(0, 14).map((r) => el('tr', {}, el('td', {}, r.date), el('td', { class: 'num' }, r.lb), el('td', { class: 'num' }, r.avg))))) : null,
  );
}
