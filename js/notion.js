// Push-only Notion sync. Everything is queued locally and flushed when online. Failure is silent
// to the user and retried later. Logging never waits on this.
//
// Browsers cannot call api.notion.com directly (no CORS headers), so the endpoint is a small proxy
// that forwards requests with the integration token attached. See notion-proxy/worker.js.
// If the endpoint is left blank, sync stays queued and nothing is sent.
import * as store from './store.js';

const MAX_ATTEMPTS = 50;

export function enqueue(s, kind, payload) {
  s.syncQueue.push({ id: store.uid(), kind, payload, attempts: 0, lastError: null, createdAt: new Date().toISOString() });
}

function text(v) { return { rich_text: [{ text: { content: String(v ?? '').slice(0, 1900) } }] }; }
function title(v) { return { title: [{ text: { content: String(v ?? '') } }] }; }
function num(v) { return { number: v == null ? null : Number(v) }; }
function date(v) { return { date: v ? { start: v } : null }; }
function sel(v) { return { select: v ? { name: String(v) } : null }; }

export function toNotionPage(item, notion) {
  const p = item.payload;
  if (item.kind === 'session') return {
    parent: { database_id: notion.dbSessions },
    properties: { Name: title(p.name), Date: date(p.date), Cycle: num(p.cycle), Week: num(p.week), Day: num(p.day), Phase: sel(p.phase), 'Total sets': num(p.sets), Tonnage: num(p.tonnage), 'Avg RPE': num(p.avgRpe), 'Duration min': num(p.durationMin), Notes: text(p.notes) },
  };
  if (item.kind === 'max') return {
    parent: { database_id: notion.dbMaxes },
    properties: { Name: title(`${p.lift} cycle ${p.cycle}`), Lift: sel(p.lift), 'Tested weight': num(p.testedWeight), 'Tested reps': num(p.testedReps), '1RM': num(p.oneRM), Cycle: num(p.cycle), Date: date(p.date), Delta: num(p.delta), Prior: num(p.prior) },
  };
  if (item.kind === 'milestone') return {
    parent: { database_id: notion.dbMilestones },
    properties: { Name: title(`${p.type} (cycle ${p.cycle}, week ${p.week})`), Type: sel(p.type), Cycle: num(p.cycle), Week: num(p.week), Date: date(p.date) },
  };
  throw new Error(`unknown sync kind ${item.kind}`);
}

function dbFor(kind, n) { return { session: n.dbSessions, max: n.dbMaxes, milestone: n.dbMilestones }[kind]; }

export function configured(n) { return !!(n && n.endpoint); }

let flushing = false;
export async function flush() {
  const s = store.get();
  const n = s.settings.notion;
  if (flushing || !configured(n) || !navigator.onLine || !s.syncQueue.length) return;
  flushing = true;
  try {
    for (const item of [...s.syncQueue]) {
      if (!dbFor(item.kind, n)) continue; // database not configured yet, keep waiting
      let ok = false, err = null;
      try {
        const body = toNotionPage(item, n);
        const headers = { 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' };
        if (n.token) headers.Authorization = `Bearer ${n.token}`;
        const res = await fetch(n.endpoint.replace(/\/$/, '') + '/v1/pages', { method: 'POST', headers, body: JSON.stringify(body) });
        ok = res.ok;
        if (!ok) err = `${res.status} ${(await res.text()).slice(0, 200)}`;
      } catch (e) { err = e.message; }
      store.update((st) => {
        const q = st.syncQueue.find((x) => x.id === item.id);
        if (!q) return;
        if (ok) st.syncQueue = st.syncQueue.filter((x) => x.id !== item.id);
        else { q.attempts += 1; q.lastError = err; if (q.attempts >= MAX_ATTEMPTS) st.syncQueue = st.syncQueue.filter((x) => x.id !== item.id); }
        st.syncLog.unshift({ at: new Date().toISOString(), kind: item.kind, ok, err });
        st.syncLog = st.syncLog.slice(0, 20);
      });
      if (!ok) break; // stop on first failure, retry later
    }
  } finally { flushing = false; }
}

export function startSyncLoop() {
  window.addEventListener('online', () => flush());
  setInterval(() => flush(), 60000);
  setTimeout(() => flush(), 3000);
}
