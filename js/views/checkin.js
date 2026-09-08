// Daily recovery check-in: sleep, soreness, stress, bodyweight. Display and trend only.
import * as store from '../store.js';
import * as A from '../actions.js';
import { el, stepper, toast } from '../ui.js';
import { RECOVERY_GUIDANCE } from '../phases.js';
import { rollingAverage } from '../engine.js';

const draft = { date: null, sleep: 7.5, soreness: 3, stress: 3, bw: null };

export function renderCheckin() {
  const s = store.get();
  const today = store.today();
  if (draft.date !== today) {
    const existing = s.checkins.find((c) => c.date === today);
    const bw = s.bodyweight.find((b) => b.date === today);
    Object.assign(draft, { date: today, sleep: existing?.sleep ?? 7.5, soreness: existing?.soreness ?? 3, stress: existing?.stress ?? 3, bw: bw?.lb ?? null });
  }
  const form = el('div', { class: 'card bluebar' },
    el('h1', {}, 'Check-in'),
    el('p', {}, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })),
    el('div', { class: 'stack' },
      el('div', {}, el('label', {}, 'Sleep, hours'), stepper({ value: draft.sleep, step: 0.5, min: 0, max: 16, decimals: 1, onChange: (v) => { draft.sleep = v; } })),
      el('div', {}, el('label', {}, 'Soreness, 1 to 10'), stepper({ value: draft.soreness, step: 1, min: 1, max: 10, onChange: (v) => { draft.soreness = v; } })),
      el('div', {}, el('label', {}, 'Stress, 1 to 10'), stepper({ value: draft.stress, step: 1, min: 1, max: 10, onChange: (v) => { draft.stress = v; } })),
      el('div', {}, el('label', {}, 'Bodyweight, lb (optional)'), stepper({ value: draft.bw ?? '', step: 0.5, min: 0, max: 600, decimals: 1, onChange: (v) => { draft.bw = v; } })),
      el('button', { class: 'btn primary big', onclick: () => {
        A.addCheckin({ date: today, sleep: draft.sleep, soreness: draft.soreness, stress: draft.stress });
        if (draft.bw) A.addBodyweight(today, draft.bw);
        toast('Check-in saved');
      } }, 'Save check-in'),
    ),
  );

  const last7 = s.checkins.slice(-7).reverse();
  const bwAvg = rollingAverage(s.bodyweight);
  const table = el('div', { class: 'card' },
    el('h2', {}, 'Last 7 days'),
    last7.length ? el('div', { class: 'scroll-x' }, el('table', {},
      el('tr', {}, el('th', {}, 'Date'), el('th', { class: 'num' }, 'Sleep'), el('th', { class: 'num' }, 'Sore'), el('th', { class: 'num' }, 'Stress'), el('th', { class: 'num' }, 'BW')),
      last7.map((c) => {
        const bw = s.bodyweight.find((b) => b.date === c.date);
        return el('tr', {}, el('td', {}, c.date.slice(5)), el('td', { class: 'num' }, c.sleep.toFixed(1)), el('td', { class: 'num' }, bars(c.soreness)), el('td', { class: 'num' }, bars(c.stress)), el('td', { class: 'num' }, bw ? bw.lb : '–'));
      }),
      el('tr', {}, el('td', { style: 'font-weight:900' }, 'avg'), el('td', { class: 'num', style: 'font-weight:900' }, avg(last7.map((c) => c.sleep)).toFixed(1)), el('td', { class: 'num', style: 'font-weight:900' }, avg(last7.map((c) => c.soreness)).toFixed(1)), el('td', { class: 'num', style: 'font-weight:900' }, avg(last7.map((c) => c.stress)).toFixed(1)), el('td', { class: 'num', style: 'font-weight:900' }, bwAvg.length ? bwAvg[bwAvg.length - 1].avg : '–')),
    )) : el('p', {}, 'No check-ins yet.'),
    el('p', { style: 'margin-top:8px;font-size:15px' }, 'This is a trend view only. It never changes the training plan.'),
  );

  const guidance = el('div', { class: 'card dashed' },
    el('h2', {}, 'Recovery guidance'),
    el('ul', {}, RECOVERY_GUIDANCE.map((g) => el('li', {}, g))),
  );
  return el('div', {}, form, table, guidance);
}

function bars(n) { return `${n} ${'▮'.repeat(n)}`; }
function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
