const $ = s => document.querySelector(s);
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function api(u, m = 'GET', b) {
  const r = await fetch('/api/' + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && u !== 'login' && u !== 'me') location.href = '/';
  if (!r.ok) throw new Error(d.error || 'Xatolik');
  return d;
}
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2500); }
async function out() { await api('logout', 'POST'); location.href = '/'; }
function nav(T, cur, fn) {
  $('#nav').innerHTML = Object.entries(T).map(([k, v]) => `<button id="n${k}" onclick="${fn}('${k}')" class="${k === cur ? 'on' : ''}">${v[0]}<small>${v[1]}</small></button>`).join('');
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
