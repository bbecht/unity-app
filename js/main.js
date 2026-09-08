// Boot, routing, top bar, timer bar, bottom nav.
import * as store from './store.js';
import * as timer from './timer.js';
import { el } from './ui.js';
import { posLabel, weekTemplates } from './engine.js';
import { startSyncLoop } from './notion.js';
import { renderTrain, trainTitle } from './views/train.js';
import { renderCheckin } from './views/checkin.js';
import { renderProgress } from './views/progress.js';
import { renderMore } from './views/more.js';

const VIEWS = {
  train: { label: 'Train', ico: '▮', render: renderTrain },
  checkin: { label: 'Check-in', ico: '◐', render: renderCheckin },
  progress: { label: 'Progress', ico: '▲', render: renderProgress },
  more: { label: 'More', ico: '≡', render: renderMore },
};

export const route = { view: 'train', params: {} };

export function go(view, params = {}) {
  route.view = view; route.params = params;
  window.scrollTo(0, 0);
  render();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', store.get().settings.theme === 'dark' ? 'dark' : 'light');
}

function renderTopbar() {
  const s = store.get();
  const p = posLabel(s.pos);
  const active = s.active;
  const label = active ? `C${active.cycle} · W${active.week} · D${active.day}` : `C${p.cycle} · W${p.week} · D${p.day}`;
  const phase = active ? active.phase : p.phase;
  const bar = el('div', { class: 'topbar' },
    el('div', {}, el('div', { class: 'pos' }, label), el('div', { class: 'phase' }, phase)),
    el('div', { class: 'row', style: 'align-items:center;gap:8px' },
      navigator.onLine ? null : el('span', { class: 'offline' }, 'OFFLINE'),
      s.syncQueue.length ? el('span', { class: 'offline' }, `${s.syncQueue.length} to sync`) : null,
    ),
  );
  const host = document.getElementById('topbar');
  host.replaceChildren(bar);
}

function renderTimerbar(remaining, total) {
  const host = document.getElementById('timerbar');
  if (!timer.running()) { host.replaceChildren(); return; }
  const pct = total ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const bar = el('div', { class: 'timerbar', role: 'timer' },
    el('div', {}, el('div', { style: 'font-weight:900;font-size:13px;text-transform:uppercase' }, 'Rest'), el('div', { class: 'digits' }, fmtClock(remaining))),
    el('div', { class: 'row', style: 'flex:0 0 auto' },
      el('button', { class: 'btn', onclick: () => timer.add(30) }, '+30'),
      el('button', { class: 'btn primary', onclick: () => timer.stop() }, 'Skip'),
    ),
    el('div', { class: 'track', style: `width:${pct}%` }),
  );
  host.replaceChildren(bar);
}

function fmtClock(sec) { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; }

function renderNav() {
  const nav = document.getElementById('nav');
  nav.replaceChildren(...Object.entries(VIEWS).map(([k, v]) =>
    el('button', { class: route.view === k ? 'active' : '', 'aria-current': route.view === k ? 'page' : null, onclick: () => go(k) },
      el('span', { class: 'ico', 'aria-hidden': 'true' }, v.ico), v.label)));
}

export function render() {
  applyTheme();
  renderTopbar();
  renderNav();
  const view = document.getElementById('view');
  try {
    view.replaceChildren(VIEWS[route.view].render(route.params));
  } catch (e) {
    console.error(e);
    view.replaceChildren(el('div', { class: 'card' }, el('h2', {}, 'Something broke'), el('p', {}, String(e.message)), el('button', { class: 'btn', onclick: () => go('more') }, 'Go to settings')));
  }
  document.title = route.view === 'train' ? trainTitle() : 'Unity';
}

// Boot
store.subscribe(() => render());
timer.onTick((r, t) => renderTimerbar(r, t));
window.addEventListener('online', render);
window.addEventListener('offline', render);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('sw', e));
}
startSyncLoop();
render();
// Sanity check that every week builds on this device's data.
try { for (let w = 1; w <= 13; w++) weekTemplates(w); } catch (e) { console.error(e); }
