const $ = s => document.querySelector(s);
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IC = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.3c2 .7 3.5 2.4 3.5 5.7"/>',
  grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8c-2-4-6-3-5 0 .6 1.6 5 0 5 0zM12 8c2-4 6-3 5 0-.6 1.6-5 0-5 0z"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 01-8 0z"/><path d="M8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 14v4M8 21h8"/>',
  out: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  theme: '<path d="M20 14.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 10.5z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch { }
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'glass' ? '#0a0b0e' : '#2F7F6F';
}
function toggleTheme() { setTheme(document.documentElement.dataset.theme === 'glass' ? 'pastel' : 'glass'); }
const themeBtn = () => `<button class=ibtn onclick="toggleTheme()" aria-label="Mavzuni almashtirish">${ic('theme')}</button>`;
try { setTheme(localStorage.getItem('theme') || 'pastel'); } catch { setTheme('pastel'); }
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
  $('#nav').innerHTML = Object.entries(T).map(([k, v]) => `<button id="n${k}" onclick="${fn}('${k}')" class="${k === cur ? 'on' : ''}">${ic(v[0])}<small>${v[1]}</small></button>`).join('');
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
