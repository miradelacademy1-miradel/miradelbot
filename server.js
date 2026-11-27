const express = require('express'), { Pool } = require('pg'), bcrypt = require('bcryptjs'),
  jwt = require('jsonwebtoken'), cp = require('cookie-parser'), path = require('path');
const app = express(), SECRET = process.env.JWT_SECRET || 'dev-secret-ozgartiring';
const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url, ssl: url && !/railway\.internal|localhost|127\.0\.0\.1/.test(url) ? { rejectUnauthorized: false } : false });
const q = (s, p) => pool.query(s, p).then(r => r.rows);
const w = f => (req, res) => f(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Server xatosi' }); });
const code = () => 'MA' + Math.random().toString(36).slice(2, 7).toUpperCase();
const auth = role => (req, res, next) => {
  try { const u = jwt.verify(req.cookies.t, SECRET); if (role && u.role !== role) throw 0; req.u = u; next(); }
  catch { res.status(401).json({ error: 'Kirish talab qilinadi' }); }
};
app.set('trust proxy', 1);
app.use(express.json(), cp(), express.static(path.join(__dirname, 'public')));

async function init() {
  await q(`CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY, role TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, promo_code TEXT UNIQUE, referred_by INT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS courses(id SERIAL PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS study_groups(id SERIAL PRIMARY KEY, course_id INT REFERENCES courses(id) ON DELETE CASCADE, name TEXT NOT NULL, schedule TEXT);
CREATE TABLE IF NOT EXISTS students(user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, group_id INT REFERENCES study_groups(id) ON DELETE SET NULL, monthly_fee INT DEFAULT 0, paid BOOLEAN DEFAULT false, next_payment DATE DEFAULT CURRENT_DATE);
CREATE TABLE IF NOT EXISTS attendance(id SERIAL PRIMARY KEY, student_id INT REFERENCES users(id) ON DELETE CASCADE, day DATE NOT NULL, status TEXT NOT NULL, score INT DEFAULT 0, UNIQUE(student_id, day));
CREATE TABLE IF NOT EXISTS announcements(id SERIAL PRIMARY KEY, title TEXT NOT NULL, body TEXT, kind TEXT DEFAULT 'yangilik', group_id INT REFERENCES study_groups(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT now());`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS perms TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_paid BOOLEAN DEFAULT false;
ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS teacher_id INT REFERENCES users(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS lesson_reports(id SERIAL PRIMARY KEY, teacher_id INT REFERENCES users(id) ON DELETE CASCADE, group_id INT REFERENCES study_groups(id) ON DELETE CASCADE, day DATE NOT NULL, topic TEXT NOT NULL, homework TEXT, note TEXT, seen BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now());`);
  const ph = process.env.ADMIN_PHONE, pw = process.env.ADMIN_PASSWORD;
  if (ph && pw && !(await q("SELECT 1 FROM users WHERE role='admin'")).length)
    await q("INSERT INTO users(role,full_name,phone,password_hash) VALUES('admin','Administrator',$1,$2)", [ph.replace(/\s/g, ''), bcrypt.hashSync(pw, 10)]);
}

// ---- Auth
app.post('/api/login', w(async (req, res) => {
  const { phone, password } = req.body;
  const [u] = await q('SELECT * FROM users WHERE phone=$1', [String(phone || '').replace(/\s/g, '')]);
  if (!u || !bcrypt.compareSync(String(password || ''), u.password_hash)) return res.status(401).json({ error: "Telefon yoki parol noto'g'ri" });
  res.cookie('t', jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '30d' }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 2592e6 });
  res.json({ role: u.role });
}));
app.get('/api/me', w(async (req, res) => {
  let t; try { t = jwt.verify(req.cookies.t, SECRET); } catch { return res.status(401).json({ error: 'Kirish talab qilinadi' }); }
  const [u] = await q('SELECT role, full_name, perms FROM users WHERE id=$1', [t.id]);
  if (!u) return res.status(401).json({ error: 'Kirish talab qilinadi' });
  res.json({ role: u.role, name: u.full_name, perms: u.role === 'admin' ? ALL : (u.perms || '').split(',').filter(Boolean) });
}));
app.post('/api/logout', (req, res) => { res.clearCookie('t'); res.json({ ok: 1 }); });

// ---- Admin
const ALL = ['groups', 'students', 'payments', 'attendance', 'announcements', 'referrals', 'reports', 'report_send'];
const NEED = [
  ['GET', /^\/stats$/, ['students', 'payments']],
  ['GET', /^\/(courses|groups)$/, ['groups', 'students', 'attendance', 'announcements']],
  [null, /^\/(courses|groups)/, ['groups']],
  ['PATCH', /^\/students\/\d+\/pay$/, ['payments']],
  ['GET', /^\/students$/, ['students', 'payments']],
  [null, /^\/students/, ['students']],
  [null, /^\/attendance/, ['attendance']],
  [null, /^\/announcements/, ['announcements']],
  [null, /^\/referrals/, ['referrals']],
  [null, /^\/reports/, ['reports', 'report_send']]
];
const A = async (req, res, next) => {
  try {
    let t; try { t = jwt.verify(req.cookies.t, SECRET); } catch { return res.status(401).json({ error: 'Kirish talab qilinadi' }); }
    const [u] = await q('SELECT id, role, full_name, perms FROM users WHERE id=$1', [t.id]);
    if (!u || u.role === 'student') return res.status(401).json({ error: 'Kirish talab qilinadi' });
    const ps = u.role === 'admin' ? ALL : (u.perms || '').split(',').filter(Boolean);
    req.u = { id: u.id, role: u.role, name: u.full_name, perms: ps };
    if (u.role !== 'admin') {
      const p = req.path.replace('/api/admin', ''), r = NEED.find(n => (!n[0] || n[0] === req.method) && n[1].test(p));
      if (!r || !r[2].some(x => ps.includes(x))) return res.status(403).json({ error: "Ruxsat yo'q" });
    }
    next();
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server xatosi' }); }
};
const adminOnly = (req, res, next) => req.u.role === 'admin' ? next() : res.status(403).json({ error: "Ruxsat yo'q" });
const okGroup = async (u, gid) => u.role !== 'teacher' || (await q('SELECT 1 FROM study_groups WHERE id=$1 AND teacher_id=$2', [gid, u.id])).length > 0;
const cl = p => (Array.isArray(p) ? p : []).filter(x => ALL.includes(x)).join(',');

// Xodimlar (faqat admin)
app.get('/api/admin/staff', A, adminOnly, w(async (req, res) => res.json(await q("SELECT id, full_name, phone, role, perms FROM users WHERE role IN ('teacher','manager') ORDER BY role, full_name"))));
app.post('/api/admin/staff', A, adminOnly, w(async (req, res) => {
  const { full_name, phone, password, role, perms } = req.body;
  if (!full_name || !phone || !password || !['teacher', 'manager'].includes(role)) return res.status(400).json({ error: 'Ism, telefon, parol va rol kerak' });
  try { await q('INSERT INTO users(role,full_name,phone,password_hash,perms) VALUES($1,$2,$3,$4,$5)', [role, full_name, phone.replace(/\s/g, ''), bcrypt.hashSync(password, 10), cl(perms)]); res.json({ ok: 1 }); }
  catch (e) { if (e.code === '23505') return res.status(400).json({ error: 'Bu telefon raqam allaqachon bor' }); throw e; }
}));
app.patch('/api/admin/staff/:id', A, adminOnly, w(async (req, res) => {
  await q("UPDATE users SET perms=$1 WHERE id=$2 AND role IN ('teacher','manager')", [cl(req.body.perms), req.params.id]);
  if (req.body.password) await q("UPDATE users SET password_hash=$1 WHERE id=$2 AND role IN ('teacher','manager')", [bcrypt.hashSync(req.body.password, 10), req.params.id]);
  res.json({ ok: 1 });
}));
app.delete('/api/admin/staff/:id', A, adminOnly, w(async (req, res) => { await q("DELETE FROM users WHERE id=$1 AND role IN ('teacher','manager')", [req.params.id]); res.json({ ok: 1 }); }));

// Guruhlar: o'qituvchi faqat o'zinikini ko'radi; admin o'qituvchi biriktiradi
app.get('/api/admin/groups', A, w(async (req, res) => res.json(await q(`SELECT g.*, c.name cname, t.full_name tname FROM study_groups g JOIN courses c ON c.id=g.course_id
  LEFT JOIN users t ON t.id=g.teacher_id WHERE ($1::int IS NULL OR g.teacher_id=$1) ORDER BY c.name, g.name`, [req.u.role === 'teacher' ? req.u.id : null]))));
app.patch('/api/admin/groups/:id', A, adminOnly, w(async (req, res) => { await q('UPDATE study_groups SET teacher_id=$1 WHERE id=$2', [req.body.teacher_id || null, req.params.id]); res.json({ ok: 1 }); }));

// O'quvchini tahrirlash
app.patch('/api/admin/students/:id', A, w(async (req, res) => {
  const { full_name, phone, group_id, monthly_fee, password } = req.body;
  if (!full_name || !phone) return res.status(400).json({ error: 'Ism va telefon kerak' });
  try {
    await q("UPDATE users SET full_name=$1, phone=$2 WHERE id=$3 AND role='student'", [full_name, phone.replace(/\s/g, ''), req.params.id]);
    if (password) await q('UPDATE users SET password_hash=$1 WHERE id=$2', [bcrypt.hashSync(password, 10), req.params.id]);
    await q('UPDATE students SET group_id=$1, monthly_fee=$2 WHERE user_id=$3', [group_id || null, monthly_fee || 0, req.params.id]);
    res.json({ ok: 1 });
  } catch (e) { if (e.code === '23505') return res.status(400).json({ error: 'Bu telefon raqam band' }); throw e; }
}));

// Davomat: o'qituvchi faqat o'z guruhida
app.get('/api/admin/attendance', A, w(async (req, res) => {
  if (!(await okGroup(req.u, req.query.group_id))) return res.status(403).json({ error: "Bu guruh sizniki emas" });
  res.json(await q(`SELECT u.id, u.full_name, a.status, COALESCE(a.score,0) score FROM students s JOIN users u ON u.id=s.user_id
    LEFT JOIN attendance a ON a.student_id=u.id AND a.day=$2 WHERE s.group_id=$1 ORDER BY u.full_name`, [req.query.group_id, req.query.date]));
}));
app.post('/api/admin/attendance', A, w(async (req, res) => {
  const { date, rows } = req.body;
  for (const r of rows) {
    if (!r.status) continue;
    if (req.u.role === 'teacher' && !(await q('SELECT 1 FROM students s JOIN study_groups g ON g.id=s.group_id WHERE s.user_id=$1 AND g.teacher_id=$2', [r.student_id, req.u.id])).length) continue;
    await q(`INSERT INTO attendance(student_id,day,status,score) VALUES($1,$2,$3,$4) ON CONFLICT(student_id,day) DO UPDATE SET status=$3, score=$4`, [r.student_id, date, r.status, Math.max(0, parseInt(r.score) || 0)]);
  }
  res.json({ ok: 1 });
}));

// Referral + bonus
app.get('/api/admin/referrals', A, w(async (req, res) => res.json(await q(`SELECT u.id, u.full_name, u.promo_code,
  (SELECT count(*) FROM users r WHERE r.referred_by=u.id)::int cnt,
  COALESCE((SELECT json_agg(json_build_object('id', r.id, 'name', r.full_name, 'paid', r.bonus_paid)) FROM users r WHERE r.referred_by=u.id), '[]') friends
  FROM users u WHERE u.role='student' ORDER BY cnt DESC, u.full_name`))));
app.patch('/api/admin/referrals/:id/bonus', A, w(async (req, res) => { await q('UPDATE users SET bonus_paid = NOT bonus_paid WHERE id=$1 AND referred_by IS NOT NULL', [req.params.id]); res.json({ ok: 1 }); }));

// Dars hisobotlari: o'qituvchi yuboradi, admin va menejer ('reports' ruxsati) ko'radi
app.get('/api/admin/reports', A, w(async (req, res) => res.json(await q(`SELECT r.id, to_char(r.day,'YYYY-MM-DD') AS day, r.topic, r.homework, r.note, r.seen, t.full_name teacher, g.name gname,
  (SELECT count(*) FROM attendance a JOIN students s ON s.user_id=a.student_id WHERE s.group_id=r.group_id AND a.day=r.day AND a.status='keldi')::int present,
  (SELECT count(*) FROM attendance a JOIN students s ON s.user_id=a.student_id WHERE s.group_id=r.group_id AND a.day=r.day AND a.status<>'keldi')::int absent
  FROM lesson_reports r JOIN users t ON t.id=r.teacher_id JOIN study_groups g ON g.id=r.group_id
  WHERE ($1::int IS NULL OR r.teacher_id=$1) ORDER BY r.created_at DESC LIMIT 50`, [req.u.perms.includes('reports') ? null : req.u.id]))));
app.post('/api/admin/reports', A, w(async (req, res) => {
  if (!req.u.perms.includes('report_send')) return res.status(403).json({ error: "Ruxsat yo'q" });
  const { group_id, day, topic, homework, note } = req.body;
  if (!group_id || !day || !topic) return res.status(400).json({ error: 'Guruh, sana va mavzu kerak' });
  if (!(await okGroup(req.u, group_id))) return res.status(403).json({ error: 'Bu guruh sizniki emas' });
  await q('INSERT INTO lesson_reports(teacher_id,group_id,day,topic,homework,note) VALUES($1,$2,$3,$4,$5,$6)', [req.u.id, group_id, day, topic, homework || '', note || '']);
  if (homework && homework.trim()) await q("INSERT INTO announcements(title,body,kind,group_id) VALUES($1,$2,'vazifa',$3)", ['Uyga vazifa: ' + topic, homework, group_id]);
  res.json({ ok: 1 });
}));
app.patch('/api/admin/reports/:id/seen', A, w(async (req, res) => {
  if (!req.u.perms.includes('reports')) return res.status(403).json({ error: "Ruxsat yo'q" });
  await q('UPDATE lesson_reports SET seen=true WHERE id=$1', [req.params.id]); res.json({ ok: 1 });
}));
app.get('/api/admin/stats', A, w(async (req, res) => {
  const [s] = await q(`SELECT (SELECT count(*) FROM students)::int students,
    (SELECT count(*) FROM students WHERE NOT paid OR next_payment<CURRENT_DATE)::int debtors,
    (SELECT count(*) FROM attendance WHERE day=CURRENT_DATE AND status='keldi')::int today,
    (SELECT count(*) FROM users WHERE referred_by IS NOT NULL)::int referrals`);
  res.json(s);
}));
app.get('/api/admin/courses', A, w(async (req, res) => res.json(await q('SELECT * FROM courses ORDER BY name'))));
app.post('/api/admin/courses', A, w(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'Kurs nomi kerak' });
  await q('INSERT INTO courses(name) VALUES($1)', [req.body.name]); res.json({ ok: 1 });
}));
app.delete('/api/admin/courses/:id', A, w(async (req, res) => { await q('DELETE FROM courses WHERE id=$1', [req.params.id]); res.json({ ok: 1 }); }));
app.get('/api/admin/groups', A, w(async (req, res) => res.json(await q('SELECT g.*, c.name cname FROM study_groups g JOIN courses c ON c.id=g.course_id ORDER BY c.name, g.name'))));
app.post('/api/admin/groups', A, w(async (req, res) => {
  const { course_id, name, schedule } = req.body;
  if (!course_id || !name) return res.status(400).json({ error: 'Kurs va guruh nomi kerak' });
  await q('INSERT INTO study_groups(course_id,name,schedule) VALUES($1,$2,$3)', [course_id, name, schedule || '']); res.json({ ok: 1 });
}));
app.delete('/api/admin/groups/:id', A, w(async (req, res) => { await q('DELETE FROM study_groups WHERE id=$1', [req.params.id]); res.json({ ok: 1 }); }));

app.get('/api/admin/students', A, w(async (req, res) => res.json(await q(`SELECT u.id, u.full_name, u.phone, u.promo_code, s.group_id, g.name gname, s.monthly_fee,
  (NOT s.paid OR s.next_payment<CURRENT_DATE) debt, to_char(s.next_payment,'YYYY-MM-DD') next_payment
  FROM users u JOIN students s ON s.user_id=u.id LEFT JOIN study_groups g ON g.id=s.group_id ORDER BY u.full_name`))));
app.post('/api/admin/students', A, w(async (req, res) => {
  const { full_name, phone, password, group_id, monthly_fee, promo } = req.body;
  if (!full_name || !phone || !password) return res.status(400).json({ error: 'Ism, telefon va parol kerak' });
  let ref = null;
  if (promo && promo.trim()) {
    const [r] = await q('SELECT id FROM users WHERE promo_code=$1', [promo.trim().toUpperCase()]);
    if (!r) return res.status(400).json({ error: 'Promo-kod topilmadi' });
    ref = r.id;
  }
  try {
    const [u] = await q("INSERT INTO users(role,full_name,phone,password_hash,promo_code,referred_by) VALUES('student',$1,$2,$3,$4,$5) RETURNING id",
      [full_name, phone.replace(/\s/g, ''), bcrypt.hashSync(password, 10), code(), ref]);
    await q('INSERT INTO students(user_id,group_id,monthly_fee) VALUES($1,$2,$3)', [u.id, group_id || null, monthly_fee || 0]);
    res.json({ ok: 1 });
  } catch (e) { if (e.code === '23505') return res.status(400).json({ error: 'Bu telefon raqam allaqachon bor' }); throw e; }
}));
app.patch('/api/admin/students/:id/pay', A, w(async (req, res) => {
  await q(`UPDATE students SET paid = NOT (paid AND next_payment>=CURRENT_DATE),
    next_payment = CASE WHEN paid AND next_payment>=CURRENT_DATE THEN next_payment ELSE GREATEST(next_payment,CURRENT_DATE)+30 END WHERE user_id=$1`, [req.params.id]);
  res.json({ ok: 1 });
}));
app.delete('/api/admin/students/:id', A, w(async (req, res) => { await q("DELETE FROM users WHERE id=$1 AND role='student'", [req.params.id]); res.json({ ok: 1 }); }));

app.get('/api/admin/attendance', A, w(async (req, res) => res.json(await q(`SELECT u.id, u.full_name, a.status, COALESCE(a.score,0) score
  FROM students s JOIN users u ON u.id=s.user_id LEFT JOIN attendance a ON a.student_id=u.id AND a.day=$2
  WHERE s.group_id=$1 ORDER BY u.full_name`, [req.query.group_id, req.query.date]))));
app.post('/api/admin/attendance', A, w(async (req, res) => {
  const { date, rows } = req.body;
  for (const r of rows) if (r.status) await q(`INSERT INTO attendance(student_id,day,status,score) VALUES($1,$2,$3,$4)
    ON CONFLICT(student_id,day) DO UPDATE SET status=$3, score=$4`, [r.student_id, date, r.status, Math.max(0, parseInt(r.score) || 0)]);
  res.json({ ok: 1 });
}));

app.get('/api/admin/announcements', A, w(async (req, res) => res.json(await q(`SELECT a.id,a.title,a.body,a.kind,g.name gname FROM announcements a LEFT JOIN study_groups g ON g.id=a.group_id ORDER BY a.created_at DESC`))));
app.post('/api/admin/announcements', A, w(async (req, res) => {
  const { title, body, kind, group_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Sarlavha kerak' });
  await q('INSERT INTO announcements(title,body,kind,group_id) VALUES($1,$2,$3,$4)', [title, body || '', kind || 'yangilik', group_id || null]); res.json({ ok: 1 });
}));
app.delete('/api/admin/announcements/:id', A, w(async (req, res) => { await q('DELETE FROM announcements WHERE id=$1', [req.params.id]); res.json({ ok: 1 }); }));
app.get('/api/admin/referrals', A, w(async (req, res) => res.json(await q(`SELECT u.id, u.full_name, u.promo_code,
  (SELECT count(*) FROM users r WHERE r.referred_by=u.id)::int cnt,
  (SELECT string_agg(r.full_name, ', ') FROM users r WHERE r.referred_by=u.id) friends
  FROM users u WHERE u.role='student' ORDER BY cnt DESC, u.full_name`))));

// ---- Student
const S = auth('student');
app.get('/api/student/home', S, w(async (req, res) => {
  const id = req.u.id;
  const [me] = await q(`SELECT u.full_name, u.promo_code, s.group_id, g.name gname, s.monthly_fee,
    (NOT s.paid OR s.next_payment<CURRENT_DATE) debt, to_char(s.next_payment,'YYYY-MM-DD') next_payment
    FROM users u JOIN students s ON s.user_id=u.id LEFT JOIN study_groups g ON g.id=s.group_id WHERE u.id=$1`, [id]);
  const att = await q("SELECT to_char(day,'YYYY-MM-DD') AS day, status, score FROM attendance WHERE student_id=$1 ORDER BY day DESC LIMIT 90", [id]);
  const [{ c }] = await q('SELECT count(*)::int c FROM users WHERE referred_by=$1', [id]);
  const news = await q("SELECT title, body, kind, to_char(created_at,'YYYY-MM-DD') d FROM announcements WHERE group_id IS NULL OR group_id=$1 ORDER BY created_at DESC LIMIT 30", [me.group_id]);
  res.json({ me, att, friends: c, news });
}));
app.get('/api/student/leaderboard', S, w(async (req, res) => {
  const rows = await q(`SELECT u.id, u.full_name, COALESCE(SUM(a.score),0)::int score FROM students s JOIN users u ON u.id=s.user_id
    LEFT JOIN attendance a ON a.student_id=u.id WHERE s.group_id=(SELECT group_id FROM students WHERE user_id=$1)
    GROUP BY u.id ORDER BY score DESC, u.full_name LIMIT 20`, [req.u.id]);
  res.json(rows.map((r, i) => ({ rank: i + 1, full_name: r.full_name, score: r.score, is_me: r.id === req.u.id })));
}));

const PORT = process.env.PORT || 3000;
init().then(() => app.listen(PORT, () => console.log('Miradel ishga tushdi:', PORT))).catch(e => { console.error(e); process.exit(1); });
