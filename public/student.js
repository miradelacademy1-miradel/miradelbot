const T = { home: ['home', 'Bosh'], top: ['trophy', 'Reyting'], mod: ['grid', 'Modul'], news: ['bell', 'Yangilik'], ref: ['gift', "Do'stlar"] };
let D;
const R = {
  home: () => {
    const a = D.att, m = D.me, k = a.filter(x => x.status === 'keldi').length, p = a.length ? Math.round(k * 100 / a.length) : 0, sc = a.reduce((s, x) => s + x.score, 0);
    const st = { keldi: 'Keldi', kelmadi: 'Kelmadi', sababli: 'Sababli' };
    return `<div class=row><h1>Salom, ${e(m.full_name.split(' ')[0])}</h1><div class=tools>${refreshBtn()}${themeBtn()}<button class=ibtn onclick=out() aria-label="Chiqish">${ic('out')}</button></div></div>
<div class="card c-teal row"><div><div class=muted style="color:#fff">Davomat</div><div class=big>${p}%</div><div class=muted style="color:#fff">${e(m.gname || 'Guruhsiz')}</div></div>
<svg width=120 height=120 viewBox="0 0 120 120"><circle cx=60 cy=60 r=52 fill=none style="stroke:var(--ring-bg)" stroke-width=14 /><circle cx=60 cy=60 r=52 fill=none style="stroke:var(--ring)" stroke-width=14 stroke-linecap=round stroke-dasharray="${p * 3.267} 327" transform="rotate(-90 60 60)"/></svg></div>
<div class=grid><div class="card c-mus"><div class=muted>Ball</div><div class=big style="font-size:46px">${sc}</div></div><div class="card c-lil"><div class=muted style="color:#fff">Darslar</div><div class=big style="font-size:46px">${a.length}</div></div></div>
<div class="card ${m.debt ? 'c-coral' : ''}" style="margin-top:12px"><b style="font-size:20px">${m.debt ? "Qarzdor" : "To'langan"}</b><div class=muted style="color:inherit">Keyingi to'lov: ${m.next_payment} · ${Number(m.monthly_fee).toLocaleString('uz')} so'm</div></div>
<h2>Oxirgi darslar</h2>${a.slice(0, 8).map(x => `<div class="card row" style="padding:14px 20px;margin-bottom:8px"><span>${x.day}</span><span class="pill ${x.status === 'keldi' ? 'ok' : x.status === 'kelmadi' ? 'bad' : 'sb'}">${st[x.status] || x.status}</span><b>${x.score} ball</b></div>`).join('') || '<p class=muted>Hali dars belgilanmagan.</p>'}`;
  },
  top: async () => {
    const r = await api('student/leaderboard'), cl = ['c-coral', '', 'c-mus'];
    return `<h1>Reyting</h1><div class="card c-teal">${r.map(x => `<div class="rk ${x.rank <= 3 && x.rank != 2 ? cl[x.rank - 1] : ''}" style="${x.rank === 2 ? 'background:var(--cream)' : x.rank > 3 ? 'background:#ffffff26' : ''};${x.is_me ? 'outline:3px solid #fff' : ''}"><span>#${x.rank} ${e(x.full_name)}</span><span>${x.score}</span></div>`).join('') || '<p>Guruh topilmadi.</p>'}</div>`;
  },
  news: () => `<h1>Yangiliklar</h1>${D.news.map((n, i) => `<div class="card ${['c-lil', '', 'c-teal'][i % 3]}"><span class="pill ${i % 3 === 1 ? 'ok' : ''}" style="background:#ffffff40">${ic(n.kind === 'vazifa' ? 'doc' : 'bell')} ${n.kind === 'vazifa' ? 'Uyga vazifa' : 'Yangilik'}</span><h2>${e(n.title)}</h2><p>${e(n.body)}</p><div class=muted style="color:inherit">${n.d}</div></div>`).join('') || '<p class=muted>Hozircha e\'lon yo\'q.</p>'}`,
  ref: () => `<h1>Do'stlarni taklif qiling</h1><div class="card c-coral"><div class=muted style="color:#fff">Sizning promo-kodingiz</div><div class=big style="font-size:44px;letter-spacing:2px">${D.me.promo_code}</div><div style="margin:12px 0">Taklif qilgan do'stlar: <b>${D.friends}</b></div>
<button class=btn onclick=copy()>${ic('copy')} Nusxalash</button><button class=btn style="margin-top:8px;background:#fff;color:var(--ink)" onclick=share()>${ic('share')} Ulashish</button></div>`
};
R.mod = async () => {
  let m; try { m = await api('student/vocab/manifest'); } catch { try { m = JSON.parse(localStorage.getItem('lg_man')); } catch { } }
  const on = m && m.open;
  return `<h1>Modullar</h1><div class="card ${on ? 'c-teal' : ''}"><h2>Lug'at testi</h2><p class=muted style="color:inherit">${on ? m.levels.length + " ta daraja ochiq" : "Hozircha yopiq. O'qituvchingiz ochganda shu yerda ko'rinadi."}</p>${on ? `<a class=btn style="display:block;text-align:center;text-decoration:none;margin-top:12px" href="/modules/lugat.html">Ochish</a>` : ''}</div>`;
};
let bu = null;
R.book = async () => {
  const h = await api('student/homework'), m = {}; h.forEach(x => m[x.unit + x.task] = x);
  if (bu === null) return `<h1>Darslik</h1><p class=muted style="margin-bottom:12px">Uyga vazifani kitobdan daftaringizga bajaring, rasmga olib shu yerga yuklang. Har bir topshiriq alohida yuklanadi.</p>` + UNITS.map((u, i) => {
    const t = 'ABCD'.split(''), n = t.filter(k => m[(i + 1) + k]).length, ok = t.filter(k => (m[(i + 1) + k] || {}).status === 'accepted').length;
    return `<button class="card row" style="width:100%;border:0;text-align:left;font:inherit;color:inherit;cursor:pointer" onclick="openU(${i + 1})"><div><b>Unit ${i + 1}</b><div class=muted style="color:inherit">${e(u)}</div></div><span class="pill ${ok === 4 ? 'ok' : 'sb'}">${n}/4 yuborilgan</span></button>`;
  }).join('');
  return `<div class=row><h1>Unit ${bu}</h1><button class="pill sb" onclick="openU(null)">Orqaga</button></div><p class=muted style="margin-bottom:10px">${e(UNITS[bu - 1])}</p>` + 'ABCD'.split('').map(t => {
    const x = m[bu + t], cls = !x ? 'sb' : x.status === 'accepted' ? 'ok' : x.status === 'redo' ? 'bad' : 'sb';
    return `<div class=card><div class=row><b>${t}. ${TASKS[t]}</b><span class="pill ${cls}">${x ? HS[x.status] : 'Yuklanmagan'}</span></div>${x && x.comment ? `<p class=muted style="color:inherit;margin-top:6px">${e(x.comment)}</p>` : ''}${x && x.status === 'accepted' ? '' : `<button class=btn style="margin-top:10px" onclick="pick(${bu},'${t}')">${ic('camera')} ${x ? 'Qayta yuklash' : 'Rasm yuklash'}</button>`}</div>`;
  }).join('');
};
function openU(n) { bu = n; go('book'); }
function pick(u, t) { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => upload(u, t, i.files[0]); i.click(); }
async function shrink(f) {
  const bm = await createImageBitmap(f), k = Math.min(1, 1280 / Math.max(bm.width, bm.height)), c = document.createElement('canvas');
  c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', .7));
}
async function upload(u, t, f) {
  if (!f) return;
  try {
    toast('Yuklanmoqda...');
    const r = await fetch(`/api/student/homework/${u}/${t}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: await shrink(f) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(r.status === 413 ? 'Rasm juda katta' : d.error || 'Xatolik');
    _c.clear(); toast('Yuborildi'); go('book');
  } catch (x) { toast(x.message === 'Failed to fetch' ? "Internet yo'q" : x.message); }
}
const msg = () => `Miradel Academy'da o'qishni boshlang! Ro'yxatdan o'tishda mening promo-kodimni ayting: ${D.me.promo_code}`;
async function copy() { try { await navigator.clipboard.writeText(D.me.promo_code); toast('Nusxalandi'); } catch { toast(D.me.promo_code); } }
async function share() { if (navigator.share) { try { await navigator.share({ text: msg() }); } catch { } } else { await navigator.clipboard.writeText(msg()); toast('Matn nusxalandi'); } }
async function go(t) { nav(T, t, 'go'); $('#main').innerHTML = await R[t](); }
api('student/home').then(d => { D = d; if (d.me.english) T.book = ['book', 'Darslik']; go('home'); }).catch(x => toast(x.message));
