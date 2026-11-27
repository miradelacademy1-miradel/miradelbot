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
app.get('/api/me', auth(), (req, res) => res.json({ role: req.u.role }));
app.post('/api/logout', (req, res) => { res.clearCookie('t'); res.json({ ok: 1 }); });

// ---- Admin
const A = auth('admin');
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
  const att = await q("SELECT to_char(day,'YYYY-MM-DD') day, status, score FROM attendance WHERE student_id=$1 ORDER BY day DESC LIMIT 90", [id]);
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
