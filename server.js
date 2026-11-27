const PL = { groups: 'Guruh va kurslar', students: "O'quvchilar", payments: "To'lovlar", attendance: 'Davomat', announcements: "E'lonlar", referrals: 'Referral', reports: "Hisobotlarni ko'rish", report_send: 'Hisobot yuborish' };
const DEF = { teacher: ['attendance', 'report_send'], manager: ['groups', 'students', 'payments', 'announcements', 'referrals', 'reports'] };
let ME, tab = 'home', C = [], G = [], ST = [], SL = [], editId = null;
const can = (...p) => p.some(x => ME.perms.includes(x));
const T = {
  home: ['home', 'Bosh', () => 1], grp: ['book', 'Guruh', () => can('groups')], stu: ['grad', 'Talaba', () => can('students', 'payments')],
  att: ['check', 'Davomat', () => can('attendance')], rep: ['doc', 'Hisobot', () => can('reports', 'report_send')], ann: ['bell', "E'lon", () => can('announcements')],
  ref: ['gift', 'Referral', () => can('referrals')], staff: ['user', 'Xodim', () => ME.role === 'admin'], mod: ['grid', 'Modul', () => ME.role === 'admin']
};
const opt = (a, l = 'name') => a.map(x => `<option value="${x.id}">${e(x[l])}</option>`).join('');
const gopt = () => G.map(g => `<option value="${g.id}">${e(g.cname)} — ${e(g.name)}</option>`).join('');
const v = id => $('#' + id).value, today = () => new Date(Date.now() + 5 * 36e5).toISOString().slice(0, 10);
const hdr = t => `<div class=row><h1>${t}</h1><div class=tools>${themeBtn()}<button class=ibtn onclick=out() aria-label="Chiqish">${ic('out')}</button></div></div>`;
async function add(u, b) { try { await api(u, 'POST', b); toast('Saqlandi'); go(tab); } catch (x) { toast(x.message); } }
async function del(u) { if (confirm("O'chirilsinmi?")) { try { await api(u, 'DELETE'); go(tab); } catch (x) { toast(x.message); } } }
async function pay(id) { await api(`admin/students/${id}/pay`, 'PATCH'); go(tab); }
async function bonus(id) { await api(`admin/referrals/${id}/bonus`, 'PATCH'); go(tab); }
async function seen(id) { await api(`admin/reports/${id}/seen`, 'PATCH'); go(tab); }
async function setT(id, t) { try { await api('admin/groups/' + id, 'PATCH', { teacher_id: t }); toast('Saqlandi'); } catch (x) { toast(x.message); } }
const checked = c => [...document.querySelectorAll(c + ':checked')].map(x => x.value);
const chk = (c, sel) => Object.entries(PL).map(([k, l]) => `<label class=chk><input type=checkbox class="${c}" value="${k}" ${sel.includes(k) ? 'checked' : ''}> ${l}</label>`).join('');
function defp(r) { document.querySelectorAll('.np').forEach(c => c.checked = DEF[r].includes(c.value)); }
function addStaff() { add('admin/staff', { full_name: v('fn'), phone: v('fp'), password: v('fw'), role: v('fr'), perms: checked('.np') }); }
async function saveStaff(id) {
  try { await api('admin/staff/' + id, 'PATCH', { perms: checked('.p' + id), password: document.querySelector(`[data-id="${id}"] .npw`).value }); toast('Saqlandi'); go(tab); } catch (x) { toast(x.message); }
}
async function saveStu() {
  const b = { full_name: v('sn'), phone: v('sp'), password: v('sw'), group_id: v('sg'), monthly_fee: v('sf'), promo: v('sc') };
  try { if (editId) await api('admin/students/' + editId, 'PATCH', b); else await api('admin/students', 'POST', b); editId = null; toast('Saqlandi'); go(tab); } catch (x) { toast(x.message); }
}
function editStu(id) {
  const s = SL.find(x => x.id === id); editId = id;
  $('#sn').value = s.full_name; $('#sp').value = s.phone; $('#sw').value = ''; $('#sw').placeholder = 'Yangi parol (ixtiyoriy)';
  $('#sg').value = s.group_id || ''; $('#sf').value = s.monthly_fee; $('#sc').style.display = 'none'; $('#sb').textContent = "O'zgarishni saqlash"; scrollTo({ top: 0, behavior: 'smooth' });
}
const R = {
  home: async () => {
    const s = can('students', 'payments') ? await api('admin/stats') : null;
    return hdr(e(ME.name.split(' ')[0])) + (s ? `<div class=grid>
<div class="card c-teal"><div class=muted style="color:#fff">O'quvchilar</div><div class=big style="font-size:46px">${s.students}</div></div>
<div class="card c-coral"><div class=muted style="color:#fff">Qarzdorlar</div><div class=big style="font-size:46px">${s.debtors}</div></div>
<div class="card c-mus"><div class=muted>Bugun keldi</div><div class=big style="font-size:46px">${s.today}</div></div>
<div class="card c-lil"><div class=muted style="color:#fff">Taklif qilinganlar</div><div class=big style="font-size:46px">${s.referrals}</div></div></div>`
      : `<div class="card c-teal"><h2>Xush kelibsiz</h2><p>Pastdagi menyudan kerakli bo'limni tanlang.</p></div>`);
  },
  grp: () => `<h1>Kurs va guruhlar</h1><div class=card><input id=cn placeholder="Kurs nomi (Ingliz tili, IT...)"><button class=btn onclick="add('admin/courses',{name:v('cn')})">Kurs qo'shish</button></div>
${C.map(c => `<div class="card row c-lil"><b>${e(c.name)}</b><button class=x onclick="del('admin/courses/${c.id}')" aria-label="O'chirish">${ic('x')}</button></div>`).join('')}
<div class=card><select id=gc>${opt(C)}</select><input id=gn placeholder="Guruh nomi"><input id=gs placeholder="Jadval (Du-Chor-Ju 18:00)"><button class=btn onclick="add('admin/groups',{course_id:v('gc'),name:v('gn'),schedule:v('gs')})">Guruh qo'shish</button></div>
${G.map(g => `<div class=card><div class=row><div><b>${e(g.name)}</b><div class=muted>${e(g.cname)} · ${e(g.schedule)}</div></div><button class=x onclick="del('admin/groups/${g.id}')" aria-label="O'chirish">${ic('x')}</button></div>
${ME.role === 'admin' ? `<select style="margin:10px 0 0" onchange="setT(${g.id},this.value)"><option value="">O'qituvchi biriktirilmagan</option>${ST.filter(t => t.role === 'teacher').map(t => `<option value="${t.id}" ${t.id === g.teacher_id ? 'selected' : ''}>${e(t.full_name)}</option>`).join('')}</select>` : `<div class=muted>${e(g.tname || '')}</div>`}</div>`).join('')}`,
  stu: async () => {
    const S = SL = await api('admin/students'), cs = can('students');
    return `<h1>O'quvchilar</h1>` + (cs ? `<div class=card><input id=sn placeholder="Ism familiya"><input id=sp type=tel placeholder="Telefon (+998...)"><input id=sw placeholder="Parol"><select id=sg><option value="">Guruhsiz</option>${gopt()}</select><input id=sf type=number placeholder="Oylik to'lov (so'm)"><input id=sc placeholder="Do'st promo-kodi (ixtiyoriy)">
<button class=btn id=sb onclick=saveStu()>O'quvchi qo'shish</button></div>` : '') + S.map(s => `<div class=card><div class=row><div><b>${e(s.full_name)}</b><div class=muted>${e(s.phone)} · ${e(s.gname || 'Guruhsiz')}</div></div>
${cs ? `<div class=tools><button class=x onclick="editStu(${s.id})" aria-label="Tahrirlash">${ic('edit')}</button><button class=x onclick="del('admin/students/${s.id}')" aria-label="O'chirish">${ic('x')}</button></div>` : ''}</div>
<div class=row style="margin-top:10px">${can('payments') ? `<button class="pill ${s.debt ? 'bad' : 'ok'}" onclick="pay(${s.id})">${s.debt ? 'Qarzdor' : "To'langan"}</button>` : `<span class="pill ${s.debt ? 'bad' : 'ok'}">${s.debt ? 'Qarzdor' : "To'langan"}</span>`}<span class=muted>Keyingi: ${s.next_payment} · kod: ${s.promo_code}</span></div></div>`).join('');
  },
  att: () => `<h1>Davomat</h1><div class=card><select id=ag>${gopt()}</select><input id=ad type=date value="${today()}"><button class=btn onclick=loadAtt()>Ko'rsatish</button></div><div id=al></div>`,
  rep: async () => {
    const L = await api('admin/reports'), send = can('report_send'), view = can('reports');
    return `<h1>Dars hisobotlari</h1>` + (send ? `<div class=card><select id=rg>${gopt()}</select><input id=rd type=date value="${today()}"><input id=rt placeholder="Dars mavzusi"><textarea id=rh rows=2 placeholder="Uyga vazifa (ixtiyoriy, o'quvchilarga ham chiqadi)"></textarea><textarea id=rn rows=2 placeholder="Izoh (ixtiyoriy)"></textarea>
<p class=muted style="margin-bottom:8px">Davomatni avval belgilang, kelgan va kelmaganlar soni avtomatik chiqadi.</p><button class=btn onclick="add('admin/reports',{group_id:v('rg'),day:v('rd'),topic:v('rt'),homework:v('rh'),note:v('rn')})">Hisobotni yuborish</button></div>` : '')
      + (L.map(r => `<div class="card ${view && !r.seen ? 'c-mus' : ''}"><div class=row><b>${e(r.gname)}</b><span class=muted style="color:inherit">${r.day}</span></div><h2>${e(r.topic)}</h2><div class=muted style="color:inherit">${e(r.teacher)} · Keldi: ${r.present} · Kelmadi: ${r.absent}</div>
${r.homework ? `<p>Vazifa: ${e(r.homework)}</p>` : ''}${r.note ? `<p>${e(r.note)}</p>` : ''}${view && !r.seen ? `<button class="pill ok" style="margin-top:8px" onclick="seen(${r.id})">${ic('check')} Ko'rildi</button>` : ''}</div>`).join('') || `<p class=muted>Hisobot yo'q.</p>`);
  },
  ann: async () => {
    const A = await api('admin/announcements');
    return `<h1>E'lonlar</h1><div class=card><input id=at placeholder="Sarlavha"><textarea id=ab rows=3 placeholder="Matn"></textarea><select id=ak><option value=yangilik>Yangilik</option><option value=vazifa>Uyga vazifa</option></select><select id=ag2><option value="">Hamma guruhlar</option>${gopt()}</select>
<button class=btn onclick="add('admin/announcements',{title:v('at'),body:v('ab'),kind:v('ak'),group_id:v('ag2')})">Joylash</button></div>
${A.map(a => `<div class="card row"><div><span class="pill ok">${a.kind === 'vazifa' ? 'Uyga vazifa' : 'Yangilik'}</span> <span class=muted>${e(a.gname || 'Hamma')}</span><h2>${e(a.title)}</h2><p>${e(a.body)}</p></div><button class=x onclick="del('admin/announcements/${a.id}')" aria-label="O'chirish">${ic('x')}</button></div>`).join('')}`;
  },
  ref: async () => {
    const r = await api('admin/referrals');
    return `<h1>Referral</h1>` + r.map((x, i) => `<div class="card ${i == 0 && x.cnt ? 'c-mus' : ''}"><div class=row><b>${e(x.full_name)}</b><span class=pill style="background:#1e1e1e;color:#fff">${x.promo_code}</span></div><div class=muted style="color:inherit">Olib kelgan: <b>${x.cnt}</b></div>
${x.friends.map(f => `<div class=row style="margin-top:8px"><span>${e(f.name)}</span><button class="pill ${f.paid ? 'ok' : 'sb'}" onclick="bonus(${f.id})">${f.paid ? 'Bonus berildi' : 'Bonus berish'}</button></div>`).join('')}</div>`).join('');
  },
  staff: () => `<h1>Xodimlar</h1><div class=card><input id=fn placeholder="Ism familiya"><input id=fp type=tel placeholder="Telefon (+998...)"><input id=fw placeholder="Parol"><select id=fr onchange="defp(this.value)"><option value=teacher>O'qituvchi</option><option value=manager>Menejer</option></select>
<div style="margin-bottom:8px">${chk('np', DEF.teacher)}</div><button class=btn onclick=addStaff()>Xodim qo'shish</button></div>
${ST.map(s => `<div class=card data-id="${s.id}"><div class=row><div><b>${e(s.full_name)}</b><div class=muted>${e(s.phone)} · ${s.role === 'teacher' ? "O'qituvchi" : 'Menejer'}</div></div><button class=x onclick="del('admin/staff/${s.id}')" aria-label="O'chirish">${ic('x')}</button></div>
<div style="margin:8px 0">${chk('p' + s.id, (s.perms || '').split(','))}</div><input class=npw placeholder="Yangi parol (ixtiyoriy)"><button class=btn onclick="saveStaff(${s.id})">Saqlash</button></div>`).join('')}`
};
let VL = [];
R.mod = async () => {
  VL = await api('admin/vocab/levels');
  return `<h1>Modullar</h1><div class=card><h2>Lug'at bazasi: ${VL.length} daraja</h2><p class=muted style="margin-bottom:8px">Zaxira (.json) faylini tanlang. Darajalar bazaga tushadi; o'zgargan darajalar o'quvchilarda o'zi yangilanadi.</p><input type=file id=vf accept=".json"><button class=btn onclick=importVocab()>Bazaga yuklash</button></div>
<div class=card><h2>Guruh uchun lug'at moduli</h2><select id=mg onchange=loadMod()><option value="">Guruhni tanlang</option>${gopt()}</select><div id=mb></div></div><div id=mr></div>`;
};
async function importVocab() {
  const f = $('#vf').files[0]; if (!f) return toast('Avval fayl tanlang');
  try {
    const d = JSON.parse(await f.text()), tasks = (d.tasks || []).filter(t => t.type === 'quiz' && t.quiz).map(t => ({ id: t.id, title: t.title, difficulty: t.difficulty, quiz: t.quiz }));
    const r = await api('admin/vocab/import', 'POST', { tasks }); toast(r.count + ' daraja yuklandi'); go(tab);
  } catch (x) { toast(x.message || 'Fayl xato'); }
}
async function loadMod() {
  const g = v('mg'); if (!g) { $('#mb').innerHTML = ''; $('#mr').innerHTML = ''; return; }
  const [m, r] = await Promise.all([api('admin/vocab/group/' + g), api('admin/vocab/results?group_id=' + g)]);
  $('#mb').innerHTML = `<label class=chk style="margin:8px 0"><input type=checkbox id=mo ${m.open ? 'checked' : ''}> Modul shu guruh uchun ochiq</label><div style="max-height:320px;overflow:auto;margin-bottom:8px">${VL.map(l => `<label class=chk><input type=checkbox class=lv value="${l.id}" ${m.level_ids.includes(l.id) ? 'checked' : ''}> ${e(l.title)} <span class=muted>(${l.qcount})</span></label>`).join('')}</div>
<div class=row><button class="pill sb" onclick="document.querySelectorAll('.lv').forEach(c=>c.checked=true)">Hammasi</button><button class="pill sb" onclick="document.querySelectorAll('.lv').forEach(c=>c.checked=false)">Hech biri</button></div><button class=btn style="margin-top:10px" onclick=saveMod()>Saqlash</button>`;
  $('#mb').insertAdjacentHTML('beforeend', `${VL.length ? '' : "<p class=muted>Darajalar yo'q: avval yuqoridan zaxira faylini bazaga yuklang.</p>"}<h2 style="margin-top:18px">O'quvchi uchun alohida ruxsat</h2><select id=ms onchange=loadVS()><option value="">O'quvchini tanlang</option>${opt(m.students, 'full_name')}</select><div id=mst></div>`);
  $('#mr').innerHTML = `<h2>So'nggi natijalar</h2>` + (r.map(x => `<div class="card row" style="padding:14px 20px;margin-bottom:8px"><div><b>${e(x.full_name)}</b><div class=muted>${e(x.title)} · ${x.taken}</div></div><b>${x.points}</b></div>`).join('') || `<p class=muted>Natija yo'q.</p>`);
}
async function loadVS() {
  const id = v('ms'); if (!id) { $('#mst').innerHTML = ''; return; }
  const s = await api('admin/vocab/student/' + id);
  $('#mst').innerHTML = `<label class=chk style="margin-top:8px"><input type=checkbox id=mc ${s.custom ? 'checked' : ''}> Shu o'quvchi uchun alohida darajalar (guruh ro'yxati o'rniga)</label><div style="max-height:260px;overflow:auto;margin:8px 0">${VL.map(l => `<label class=chk><input type=checkbox class=sl value="${l.id}" ${s.level_ids.includes(l.id) ? 'checked' : ''}> ${e(l.title)}</label>`).join('')}</div>
<div class=row><button class="pill sb" onclick="document.querySelectorAll('.sl').forEach(c=>c.checked=true)">Hammasi</button><button class="pill sb" onclick="document.querySelectorAll('.sl').forEach(c=>c.checked=false)">Hech biri</button></div><button class=btn style="margin-top:10px" onclick=saveVS()>Saqlash</button>`;
}
async function saveVS() { try { await api('admin/vocab/student/' + v('ms'), 'POST', { custom: $('#mc').checked, level_ids: checked('.sl') }); toast('Saqlandi'); } catch (x) { toast(x.message); } }
async function saveMod() { try { await api('admin/vocab/group/' + v('mg'), 'POST', { open: $('#mo').checked, level_ids: checked('.lv') }); toast('Saqlandi'); } catch (x) { toast(x.message); } }
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
  tab = t; editId = null;
  nav(Object.fromEntries(Object.entries(T).filter(([k, x]) => x[2]()).map(([k, x]) => [k, [x[0], x[1]]])), t, 'go');
  [C, G] = await Promise.all([api('admin/courses').catch(() => []), api('admin/groups').catch(() => [])]);
  if (ME.role === 'admin') ST = await api('admin/staff');
  try { $('#main').innerHTML = await R[t](); } catch (x) { toast(x.message); }
}
api('me').then(m => { if (m.role === 'student') return location.href = '/student.html'; ME = m; go('home'); }).catch(() => location.href = '/');
