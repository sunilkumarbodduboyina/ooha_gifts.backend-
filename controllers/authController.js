const bcrypt = require('bcryptjs');
const { query, one } = require('../config/db');
const { sign, requireAdmin, isAdminRole } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/error');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, created_at: u.created_at });

/* The client only distinguishes 'admin' vs regular users, but the admins table
   may store a finer-grained role (e.g. 'superadmin'). Normalise it for every
   client-facing response so the login payload, /auth/me and the role guards
   all agree — the JWT keeps the real DB role for authorization. */
const publicAdmin = (a) => ({ id: a.id, name: a.name, email: a.email, phone: a.phone, role: 'admin' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+\-\s]{8,15}$/;

/* POST /api/auth/register */
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, confirm_password } = req.body || {};
  if (!name || name.trim().length < 2) throw httpError(400, 'Please enter your full name');
  if (!email || !EMAIL_RE.test(String(email))) throw httpError(400, 'Please enter a valid email address');
  if (phone && !PHONE_RE.test(String(phone))) throw httpError(400, 'Please enter a valid mobile number');
  if (!password || String(password).length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (confirm_password !== undefined && confirm_password !== password) throw httpError(400, 'Passwords do not match');

  const exists = await one('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase()]);
  if (exists) throw httpError(409, 'An account with this email already exists');

  const hash = await bcrypt.hash(String(password), 10);
  const res2 = await query('INSERT INTO users (name, email, phone, password) VALUES (?,?,?,?)', [
    String(name).trim(),
    String(email).toLowerCase(),
    phone ? String(phone) : null,
    hash,
  ]);
  const user = await one('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [res2.insertId]);
  const token = sign({ sub: user.id, role: 'user' });
  res.status(201).json({ success: true, token, user: publicUser(user), message: 'Welcome to Ooha Gifts!' });
});

/* POST /api/auth/login  — accepts email or mobile */
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body || {};
  const id = String(identifier || req.body?.email || req.body?.phone || '').trim();
  if (!id || !password) throw httpError(400, 'Enter your email/mobile and password');

  const user = await one('SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1', [id.toLowerCase(), id]);
  if (!user) throw httpError(401, 'No account found with those details');

  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) throw httpError(401, 'Incorrect password. Please try again.');

  const token = sign({ sub: user.id, role: 'user' });
  res.json({ success: true, token, user: publicUser(user) });
});

/* POST /api/admin/login */
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw httpError(400, 'Enter your email and password');
  const admin = await one('SELECT * FROM admins WHERE email = ?', [String(email).toLowerCase()]);
  if (!admin) throw httpError(401, 'Invalid admin credentials');
  const ok = await bcrypt.compare(String(password), admin.password);
  if (!ok) throw httpError(401, 'Invalid admin credentials');
  const token = sign({ sub: admin.id, role: admin.role || 'admin' });
  res.json({
    success: true,
    token,
    admin: publicAdmin(admin),
  });
});

/* GET /api/auth/me */
const me = asyncHandler(async (req, res) => {
  if (isAdminRole(req.auth.role)) {
    const admin = await one('SELECT id, name, email, phone, role FROM admins WHERE id = ?', [req.auth.id]);
    if (!admin) throw httpError(401, 'Account not found');
    return res.json({ success: true, user: publicAdmin(admin) });
  }
  const user = await one('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [req.auth.id]);
  if (!user) throw httpError(401, 'Account not found');
  res.json({ success: true, user });
});

/* PUT /api/auth/profile */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body || {};
  if (isAdminRole(req.auth.role)) {
    if (name) await query('UPDATE admins SET name = ?, phone = ? WHERE id = ?', [String(name).trim(), phone || null, req.auth.id]);
    const admin = await one('SELECT id, name, email, phone, role FROM admins WHERE id = ?', [req.auth.id]);
    return res.json({ success: true, user: publicAdmin(admin), message: 'Profile updated' });
  }
  if (!name || String(name).trim().length < 2) throw httpError(400, 'Please enter your name');
  await query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [String(name).trim(), phone || null, req.auth.id]);
  const user = await one('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [req.auth.id]);
  res.json({ success: true, user, message: 'Profile updated' });
});

/* PUT /api/auth/password */
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!new_password || String(new_password).length < 6) throw httpError(400, 'New password must be at least 6 characters');
  const table = isAdminRole(req.auth.role) ? 'admins' : 'users';
  const row = await one(`SELECT password FROM ${table} WHERE id = ?`, [req.auth.id]);
  if (!row) throw httpError(404, 'Account not found');
  const ok = await bcrypt.compare(String(current_password || ''), row.password);
  if (!ok) throw httpError(400, 'Current password is incorrect');
  const hash = await bcrypt.hash(String(new_password), 10);
  await query(`UPDATE ${table} SET password = ? WHERE id = ?`, [hash, req.auth.id]);
  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = { register, login, adminLogin, me, updateProfile, changePassword, requireAdmin };
