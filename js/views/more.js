// More: position and 1RMs, nutrition, supplements, recovery, RPE, settings, Notion, backup.
import * as store from '../store.js';
import * as A from '../actions.js';
import { el, stepper, toast } from '../ui.js';
import { LIFTS, LIFT_NAME, weekTemplates, phaseOf, nutritionTargets, rollingAverage } from '../engine.js';
import { RPE_SCALE } from '../program.js';
import { RECOVERY_GUIDANCE } from '../phases.js';
import { flush, configured } from '../notion.js';
import { render } from '../main.js';

let confirmErase = false;

const SUPPLEMENTS = [
  ['Intra-workout', '6 to 10 g essential amino acids plus 40 to 50 g carbohydrate sipped through training. Titrate the carbs up for bigger bodyparts and for whatever gets sorest. Goal: less soreness, faster recovery.'],
  ['Creatine monohydrate', '5 g daily. Timing does not matter.'],
  ['Vitamin D3', 'Daily, with a meal that has fat.'],
  ['Omega-3', 'Daily, with food.'],
  ['Caffeine', 'Pre-training on the harder sessions only (max effort days, week 9, test days), so tolerance stays low.'],
];

export function renderMore(params = {}) {
  const s = store.get();
  const open = params.open || null;
  const D = (key, title, ...body) => el('details', { class: 'card', open: open === key ? true : null }, el('summary', {}, title), el('div', { style: 'margin-top:10px' }, body));
  return el('div', {},
    D('position', 'Position and 1RMs', position(s)),
    D('nutrition', 'Nutrition', nutrition(s)),
    D('supps', 'Supplements', el('ul', {}, SUPPLEMENTS.map(([n, t]) => el('li', {}, el('b', {}, n + ': '), t)))),
    D('recovery', 'Recovery', el('ul', {}, RECOVERY_GUIDANCE.map((g) => el('li', {}, g)))),
    D('rpe', 'RPE scale', el('table', {}, RPE_SCALE.map(([n, t]) => el('tr', {}, el('td', { style: 'font-weight:900' }, n), el('td', {}, t)))), el('p', { style: 'margin-top:8px' }, 'Feeder sets are ramp sets. Mark them as feeders and they stay out of volume and progression.')),
    D('settings', 'Settings', settings(s)),
    D('notion', 'Notion sync', notion(s)),
    D('backup', 'Backup and restore', backup(s)),
    D('about', 'About this build', about()),
  );
}

function position(s) {
  const d = { ...s.pos };
  const idxSel = () => el('select', { onchange: (ev) => { d.idx = +ev.target.value; } }, weekTemplates(d.week).map((t, i) => el('option', { value: i, selected: i === d.idx ? true : null }, `Day ${t.day}: ${t.name}`)));
  let idxHost = el('div', {}, idxSel());
  const m = { ...s.maxes };
  return el('div', { class: 'stack' },
    el('p', {}, `Now: cycle ${s.pos.cycle}, week ${s.pos.week} (${phaseOf(s.pos.week)}), session ${s.pos.idx + 1} of ${weekTemplates(s.pos.week).length}.`),
    el('div', { class: 'grid2' },
      el('div', {}, el('label', {}, 'Cycle'), stepper({ value: d.cycle, step: 1, min: 1, max: 99, onChange: (v) => { d.cycle = v; } })),
      el('div', {}, el('label', {}, 'Week'), stepper({ value: d.week, step: 1, min: 1, max: 13, onChange: (v) => { d.week = v; d.idx = 0; idxHost.replaceChildren(idxSel()); } })),
    ),
    el('div', {}, el('label', {}, 'Session'), idxHost),
    el('button', { class: 'btn', onclick: () => { A.setPosition(d.cycle, d.week, d.idx); toast('Position set'); } }, 'Jump here'),
    el('hr'),
    el('h3', {}, 'Stored 1RMs'),
    el('p', { style: 'font-size:15px' }, 'Every percentage reads from these. They update automatically after test day B. Edit only to correct a seed number.'),
    el('div', { class: 'grid3' }, LIFTS.map((l) => el('div', {}, el('label', {}, LIFT_NAME[l]), stepper({ value: m[l], step: 5, min: 45, max: 1500, onChange: (v) => { m[l] = v; } })))),
    el('button', { class: 'btn', onclick: () => { A.setMaxes(m); toast('1RMs saved'); } }, 'Save 1RMs'),
  );
}

function nutrition(s) {
  const ra = rollingAverage(s.bodyweight);
  const bw = ra.length ? ra[ra.length - 1].avg : s.athlete.bodyweightLb;
  const n = s.nutrition;
  const t = nutritionTargets(bw, n);
  return el('div', { class: 'stack' },
    el('p', {}, `Maintenance recomp at ${bw} lb (7-day average when available). The program's own calculator (bodyweight × 20, about ${bw * 20} kcal) is a bulk and is not used.`),
    el('div', { class: 'grid2' },
      el('div', { class: 'stat' }, el('div', { class: 'v' }, t.cal), el('div', { class: 'l' }, 'kcal per day')),
      el('div', { class: 'stat' }, el('div', { class: 'v' }, t.protein + ' g'), el('div', { class: 'l' }, 'protein')),
      el('div', { class: 'stat' }, el('div', { class: 'v' }, t.fat + ' g'), el('div', { class: 'l' }, 'fat')),
      el('div', { class: 'stat' }, el('div', { class: 'v' }, t.carbs + ' g'), el('div', { class: 'l' }, 'carbohydrate')),
    ),
    el('p', { style: 'font-size:15px' }, `Ranges: ${t.calLow} to ${t.calHigh} kcal (14 to 15 per lb), ${t.proteinLow} to ${t.proteinHigh} g protein (1.0 to 1.2 per lb), fat 0.4 per lb, carbs fill the rest.`),
    el('div', { class: 'grid2' },
      el('div', {}, el('label', {}, 'kcal per lb'), stepper({ value: n.calPerLb, step: 0.25, min: 10, max: 20, decimals: 2, onChange: (v) => A.setNutrition({ calPerLb: v }) })),
      el('div', {}, el('label', {}, 'Protein g per lb'), stepper({ value: n.proteinPerLb, step: 0.05, min: 0.8, max: 1.5, decimals: 2, onChange: (v) => A.setNutrition({ proteinPerLb: v }) })),
    ),
    n.lastAdjust ? el('p', { style: 'font-size:15px' }, `Last calorie adjustment: ${n.lastAdjust}.`) : null,
    el('p', { style: 'font-size:15px' }, 'The bodyweight tab under Progress prompts an adjustment when the 7-day average moves more than 2 lb across two weeks.'),
  );
}

function settings(s) {
  const st = s.settings;
  return el('div', { class: 'stack' },
    el('div', { class: 'row' },
      el('button', { class: `btn ${st.theme !== 'dark' ? 'primary' : ''}`, 'aria-pressed': st.theme !== 'dark', onclick: () => A.setSettings({ theme: 'light' }) }, 'Black on white'),
      el('button', { class: `btn ${st.theme === 'dark' ? 'primary' : ''}`, 'aria-pressed': st.theme === 'dark', onclick: () => A.setSettings({ theme: 'dark' }) }, 'White on black'),
    ),
    el('label', { class: 'check', style: 'text-transform:none' }, el('input', { type: 'checkbox', checked: st.sound !== false, onchange: (ev) => A.setSettings({ sound: ev.target.checked }) }), 'Timer sound'),
    el('label', { class: 'check', style: 'text-transform:none' }, el('input', { type: 'checkbox', checked: st.vibrate !== false, onchange: (ev) => A.setSettings({ vibrate: ev.target.checked }) }), 'Timer vibration'),
    el('div', {}, el('label', {}, 'Smallest barbell increment, lb'), stepper({ value: s.athlete.incrementLb, step: 2.5, min: 1, max: 10, decimals: 1, onChange: (v) => A.setAthlete({ incrementLb: v }) })),
    el('div', {}, el('label', {}, 'Bodyweight fallback, lb'), stepper({ value: s.athlete.bodyweightLb, step: 1, min: 100, max: 500, onChange: (v) => A.setAthlete({ bodyweightLb: v }) })),
  );
}

function notion(s) {
  const n = s.settings.notion;
  const field = (key, label, type = 'text') => el('div', {}, el('label', {}, label), el('input', { type, value: n[key] || '', autocomplete: 'off', onchange: (ev) => A.setNotion({ [key]: ev.target.value.trim() }) }));
  return el('div', { class: 'stack' },
    el('p', { style: 'font-size:15px' }, 'Push only. Sessions, 1RM history and cycle milestones. Set-level data never leaves the phone. The queue flushes whenever the app is online; failures wait and retry.'),
    el('p', { style: 'font-size:15px' }, 'Browsers cannot call the Notion API directly, so the endpoint below must be your proxy (see notion-proxy/worker.js in the app folder). Leave it blank to keep everything queued locally.'),
    field('endpoint', 'Proxy endpoint URL', 'url'),
    field('token', 'Token sent as Bearer (optional if the proxy holds it)', 'password'),
    field('dbSessions', 'Sessions database ID'),
    field('dbMaxes', '1RM history database ID'),
    field('dbMilestones', 'Milestones database ID'),
    el('div', { class: 'grid2' },
      el('div', { class: 'stat' }, el('div', { class: 'v' }, s.syncQueue.length), el('div', { class: 'l' }, 'queued')),
      el('div', { class: 'stat' }, el('div', { class: 'v' }, configured(n) ? (navigator.onLine ? 'ON' : 'OFFLINE') : 'OFF'), el('div', { class: 'l' }, 'sync')),
    ),
    el('button', { class: 'btn', onclick: async () => { await flush(); toast('Sync attempted'); render(); } }, 'Sync now'),
    s.syncLog.length ? el('table', {}, el('tr', {}, el('th', {}, 'When'), el('th', {}, 'Kind'), el('th', {}, 'Result')), s.syncLog.slice(0, 8).map((l) => el('tr', {}, el('td', {}, l.at.slice(5, 16).replace('T', ' ')), el('td', {}, l.kind), el('td', {}, l.ok ? 'ok' : (l.err || 'failed'))))) : null,
    el('details', {}, el('summary', { style: 'font-size:16px' }, 'Database properties expected'),
      el('p', { style: 'font-size:14px' }, 'Sessions: Name (title), Date (date), Cycle, Week, Day, Total sets, Tonnage, Avg RPE, Duration min (number), Phase (select), Notes (text).'),
      el('p', { style: 'font-size:14px' }, '1RM history: Name (title), Lift (select), Tested weight, Tested reps, 1RM, Cycle, Delta, Prior (number), Date (date).'),
      el('p', { style: 'font-size:14px' }, 'Milestones: Name (title), Type (select), Cycle, Week (number), Date (date).')),
  );
}

function backup(s) {
  const ta = el('textarea', { placeholder: 'Paste a backup here to restore', style: 'min-height:60px' });
  return el('div', { class: 'stack' },
    el('div', { class: 'row' },
      el('button', { class: 'btn', onclick: () => {
        const blob = new Blob([store.exportJSON()], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `unity-backup-${store.today()}.json`; a.click();
      } }, 'Download backup'),
      el('button', { class: 'btn', onclick: async () => { try { await navigator.clipboard.writeText(store.exportJSON()); toast('Copied'); } catch (e) { toast('Clipboard blocked'); } } }, 'Copy to clipboard'),
    ),
    el('input', { type: 'file', accept: 'application/json', onchange: (ev) => { const f = ev.target.files[0]; if (!f) return; f.text().then((t) => { try { store.importJSON(t); toast('Restored'); } catch (e) { toast(e.message); } }); } }),
    ta,
    el('button', { class: 'btn', onclick: () => { try { store.importJSON(ta.value); toast('Restored'); } catch (e) { toast(e.message); } } }, 'Restore from pasted text'),
    el('hr'),
    confirmErase
      ? el('div', { class: 'card amberbar', style: 'margin:0' },
        el('p', { style: 'font-weight:900' }, 'Erase everything on this device? Download a backup first.'),
        el('div', { class: 'row' },
          el('button', { class: 'btn primary', onclick: () => { confirmErase = false; store.resetAll(); toast('Erased'); } }, 'Yes, erase'),
          el('button', { class: 'btn', onclick: () => { confirmErase = false; render(); } }, 'Keep it')))
      : el('button', { class: 'btn', onclick: () => { confirmErase = true; render(); } }, 'Erase all data on this device'),
  );
}

function about() {
  return el('div', {},
    el('p', {}, 'Unity, 13-week cycle: weeks 1 to 9 as written in three blocks, week 10 deload, weeks 11 to 12 peak and test, week 13 transition, then restart on the new 1RMs.'),
    el('p', {}, 'Percentages round down to 5 lb. Relative work reads last week: hit means progress, miss means repeat at the same weight. Nothing here ever waits on the network.'),
    el('p', { style: 'font-size:15px' }, 'The deload, peak, test and transition weeks are not from the source program. Review them in the README before relying on them.'),
  );
}
