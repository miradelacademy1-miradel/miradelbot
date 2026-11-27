const T = { home: ['🏠', 'Bosh'], grp: ['👥', 'Guruh'], stu: ['🎓', 'Talaba'], att: ['✅', 'Davomat'], ann: ['📢', "E'lon"], ref: ['🎁', 'Referral'] };
let tab = 'home', C = [], G = [];
const opt = (a, l = 'name') => a.map(x => `<option value="${x.id}">${e(x[l])}</option>`).join('');
const gopt = () => G.map(g => `<option value="${g.id}">${e(g.cname)} — ${e(g.name)}</option>`).join('');
const v = id => $('#' + id).value;
async function add(u, b) { try { await api(u, 'POST', b); toast('Saqlandi'); go(tab); } catch (x) { toast(x.message); } }
async function del(u) { if (confirm("O'chirilsinmi?")) { await api(u, 'DELETE'); go(tab); } }
async function pay(id) { await api(`admin/students/${id}/pay`, 'PATCH'); go(tab); }
const R = {
  home: async () => {
    const s = await api('admin/stats');
    return `<div class=row><h1>Boshqaruv</h1><button class="pill bad" onclick=out()>Chiqish</button></div><div class=grid>
<div class="card c-teal"><div class=muted style="color:#fff">O'quvchilar</div><div class=big style="font-size:46px">${s.students}</div></div>
<div class="card c-coral"><div class=muted style="color:#fff">Qarzdorlar</div><div class=big style="font-size:46px">${s.debtors}</div></div>
<div class="card c-mus"><div class=muted>Bugun keldi</div><div class=big style="font-size:46px">${s.today}</div></div>
<div class="card c-lil"><div class=muted style="color:#fff">Taklif qilinganlar</div><div class=big style="font-size:46px">${s.referrals}</div></div></div>`;
  },
  grp: () => `<h1>Kurs va guruhlar</h1><div class=card><input id=cn placeholder="Kurs nomi (Ingliz tili, IT...)"><button class=btn onclick="add('admin/courses',{name:v('cn')})">Kurs qo'shish</button></div>
${C.map(c => `<div class="card row c-lil"><b>${e(c.name)}</b><button class=x onclick="del('admin/courses/${c.id}')">✕</button></div>`).join('')}
<div class=card><select id=gc>${opt(C)}</select><input id=gn placeholder="Guruh nomi"><input id=gs placeholder="Jadval (Du-Chor-Ju 18:00)"><button class=btn onclick="add('admin/groups',{course_id:v('gc'),name:v('gn'),schedule:v('gs')})">Guruh qo'shish</button></div>
${G.map(g => `<div class="card row"><div><b>${e(g.name)}</b><div class=muted>${e(g.cname)} · ${e(g.schedule)}</div></div><button class=x onclick="del('admin/groups/${g.id}')">✕</button></div>`).join('')}`,
  stu: async () => {
    const S = await api('admin/students');
    return `<h1>O'quvchilar</h1><div class=card><input id=sn placeholder="Ism familiya"><input id=sp type=tel placeholder="Telefon (+998...)"><input id=sw placeholder="Parol"><select id=sg><option value="">Guruhsiz</option>${gopt()}</select><input id=sf type=number placeholder="Oylik to'lov (so'm)"><input id=sc placeholder="Do'st promo-kodi (ixtiyoriy)">
<button class=btn onclick="add('admin/students',{full_name:v('sn'),phone:v('sp'),password:v('sw'),group_id:v('sg'),monthly_fee:v('sf'),promo:v('sc')})">O'quvchi qo'shish</button></div>
${S.map(s => `<div class=card><div class=row><div><b>${e(s.full_name)}</b><div class=muted>${e(s.phone)} · ${e(s.gname || 'Guruhsiz')}</div></div><button class=x onclick="del('admin/students/${s.id}')">✕</button></div>
<div class=row style="margin-top:10px"><button class="pill ${s.debt ? 'bad' : 'ok'}" onclick="pay(${s.id})">${s.debt ? 'Qarzdor' : "To'langan"}</button><span class=muted>Keyingi: ${s.next_payment} · kod: ${s.promo_code}</span></div></div>`).join('')}`;
  },
  att: () => `<h1>Davomat</h1><div class=card><select id=ag>${gopt()}</select><input id=ad type=date value="${new Date(Date.now() + 5 * 36e5).toISOString().slice(0, 10)}"><button class=btn onclick=loadAtt()>Ko'rsatish</button></div><div id=al></div>`,
  ann: async () => {
    const A = await api('admin/announcements');
    return `<h1>E'lonlar</h1><div class=card><input id=at placeholder="Sarlavha"><textarea id=ab rows=3 placeholder="Matn"></textarea><select id=ak><option value=yangilik>Yangilik</option><option value=vazifa>Uyga vazifa</option></select><select id=ag2><option value="">Hamma guruhlar</option>${gopt()}</select>
<button class=btn onclick="add('admin/announcements',{title:v('at'),body:v('ab'),kind:v('ak'),group_id:v('ag2')})">Joylash</button></div>
${A.map(a => `<div class="card row"><div><span class="pill ok">${a.kind === 'vazifa' ? 'Uyga vazifa' : 'Yangilik'}</span> <span class=muted>${e(a.gname || 'Hamma')}</span><h2>${e(a.title)}</h2><p>${e(a.body)}</p></div><button class=x onclick="del('admin/announcements/${a.id}')">✕</button></div>`).join('')}`;
  },
  ref: async () => {
    const r = await api('admin/referrals');
    return `<h1>Referral</h1>${r.map((x, i) => `<div class="card ${i == 0 && x.cnt ? 'c-mus' : ''}"><div class=row><b>${e(x.full_name)}</b><span class=pill style="background:#1e1e1e;color:#fff">${x.promo_code}</span></div><div class=muted style="color:inherit">Olib kelgan: <b>${x.cnt}</b> ${x.friends ? '— ' + e(x.friends) : ''}</div></div>`).join('')}`;
  }
};
async function loadAtt() {
  const r = await api(`admin/attendance?group_id=${v('ag')}&date=${v('ad')}`);
  $('#al').innerHTML = r.map(s => `<div class=card data-id="${s.id}"><b>${e(s.full_name)}</b><div class=seg>${[['keldi', 'Keldi'], ['kelmadi', 'Kelmadi'], ['sababli', 'Sababli']].map(([k, l]) => `<button data-v=${k} class="${s.status === k ? 'on ' + k : ''}" onclick="seg(this)">${l}</button>`).join('')}<input type=number class=sc value="${s.score}" min=0 max=100></div></div>`).join('')
    + (r.length ? '<button class=btn onclick=saveAtt()>Saqlash</button>' : "<p class=muted>Bu guruhda o'quvchi yo'q.</p>");
}
function seg(b) { b.parentNode.querySelectorAll('button').forEach(x => x.className = ''); b.className = 'on ' + b.dataset.v; }
async function saveAtt() {
  const rows = [...document.querySelectorAll('#al .card')].map(c => ({ student_id: c.dataset.id, status: (c.querySelector('button.on') || {}).dataset?.v, score: c.querySelector('.sc').value }));
  try { await api('admin/attendance', 'POST', { date: v('ad'), rows }); toast('Saqlandi'); } catch (x) { toast(x.message); }
}
async function go(t) {
  tab = t; nav(T, t, 'go');
  [C, G] = await Promise.all([api('admin/courses'), api('admin/groups')]);
  $('#main').innerHTML = await R[t]();
}
go('home').catch(x => toast(x.message));
