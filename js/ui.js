// Tiny DOM helpers. No framework, no build step.
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'value') n.value = v;
    else if (k === 'checked') n.checked = !!v;
    else if (k === 'disabled') n.disabled = !!v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}
export const h = el;

export function svgEl(tag, attrs = {}, ...children) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const c of children.flat(Infinity)) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

export function toast(msg, ms = 2200) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = el('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fmtNum(n) { return (Math.round(n * 10) / 10).toLocaleString(); }

// Numeric stepper with big +/- targets. onChange receives the new number.
export function stepper({ value, step = 1, min = 0, max = 9999, onChange, id, decimals = 0 }) {
  const input = el('input', { type: 'number', inputmode: 'decimal', step, min, max, value: value ?? '', id });
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const setV = (v) => { input.value = decimals ? clamp(v).toFixed(decimals) : clamp(v); onChange && onChange(+input.value); };
  input.addEventListener('change', () => onChange && onChange(+input.value));
  return el('div', { class: 'stepper' },
    el('button', { type: 'button', 'aria-label': 'minus', onclick: () => setV((+input.value || 0) - step) }, '−'),
    input,
    el('button', { type: 'button', 'aria-label': 'plus', onclick: () => setV((+input.value || 0) + step) }, '+'),
  );
}
