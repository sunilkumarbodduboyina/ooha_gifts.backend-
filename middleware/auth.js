const jwt = require('jsonwebtoken');
const { one } = require('../config/db');

const SECRET = () => process.env.JWT_SECRET || 'ooha_gifts_dev_secret';
const ADMIN_ROLES = new Set(['admin', 'superadmin']);

function isAdminRole(role) {
  return ADMIN_ROLES.has(role);
}

function sign(payload) {
  return jwt.sign(payload, SECRET(), { expiresIn: process.env.JWT_EXPIRES || '7d' });
}

/** Verify a Bearer token and attach { id, role } to req.auth. */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
    const decoded = jwt.verify(token, SECRET());
    req.auth = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }
}

/** Accepts either a logged-in user or a logged-in admin. */
async function authenticateAny(req, res, next) {
  return authenticate(req, res, next);
}

/** Admin-only gate. */
async function requireAdmin(req, res, next) {
  return authenticate(req, res, (err) => {
    if (err) return next(err);
    if (!isAdminRole(req.auth?.role)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  });
}

/** Attaches req.user with profile data (404s if user vanished). */
async function loadUser(req, res, next) {
  try {
    const user = await one('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [req.auth.id]);
    if (!user) return res.status(401).json({ success: false, message: 'Account not found' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { sign, isAdminRole, authenticate, authenticateAny, requireAdmin, loadUser };
