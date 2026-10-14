'use strict';

/*
 * Ooha Gifts API — unit tests.
 *
 * Uses only Node's built-in test runner and assert module (no extra deps) and
 * does NOT require a live database: the modules under test are the pure
 * request/response helpers and the JWT helpers, which never touch MySQL at
 * import time (mysql2 pools connect lazily on first query).
 *
 *   npm test        ->  node --test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { httpError, asyncHandler, notFound, errorHandler } = require('../middleware/error');
const { sign, isAdminRole, authenticate, requireAdmin } = require('../middleware/auth');

/* ---------------------------------------------------------------- */
/* test helpers                                                     */
/* ---------------------------------------------------------------- */

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    headersSent: false,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

const secret = () => process.env.JWT_SECRET || 'ooha_gifts_dev_secret';

/* ---------------------------------------------------------------- */
/* middleware/error.js                                              */
/* ---------------------------------------------------------------- */

test('httpError builds an exposed HTTP error', () => {
  const err = httpError(404, 'Nope');
  assert.ok(err instanceof Error);
  assert.equal(err.status, 404);
  assert.equal(err.message, 'Nope');
  assert.equal(err.expose, true);
});

test('asyncHandler runs the wrapped handler and forwards its result', async () => {
  const res = mockRes();
  let ran = false;
  await asyncHandler(async (req, r) => { ran = true; r.json({ ok: true }); })({}, res, () => {});
  assert.equal(ran, true);
  assert.deepEqual(res.body, { ok: true });
});

test('asyncHandler forwards a rejected promise to next()', async () => {
  let captured;
  const handler = asyncHandler(async () => { throw new Error('boom'); });
  await handler({}, {}, (e) => { captured = e; });
  assert.ok(captured instanceof Error);
  assert.equal(captured.message, 'boom');
});

test('notFound replies 404 with the requested route', () => {
  const res = mockRes();
  notFound({ method: 'GET', originalUrl: '/api/does-not-exist' }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /GET \/api\/does-not-exist/);
});

test('errorHandler hides internal 500 details', () => {
  const res = mockRes();
  errorHandler(new Error('connection to 10.0.0.5 refused'), {}, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    message: 'Something went wrong. Please try again later.',
  });
});

test('errorHandler exposes an explicit 4xx message', () => {
  const res = mockRes();
  errorHandler(httpError(400, 'Bad input'), {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Bad input');
});

test('errorHandler maps MySQL duplicate-key errors to 409', () => {
  const res = mockRes();
  const err = new Error('dup');
  err.code = 'ER_DUP_ENTRY';
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, 'That record already exists.');
});

test('errorHandler maps Mongo duplicate-key (11000) errors to 409', () => {
  const res = mockRes();
  const err = new Error('dup');
  err.code = 11000;
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 409);
});

test('errorHandler maps MulterError to 400', () => {
  const res = mockRes();
  const err = new Error('File too large');
  err.name = 'MulterError';
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /File too large/);
});

test('errorHandler maps CastError to 400', () => {
  const res = mockRes();
  const err = new Error('bad id');
  err.name = 'CastError';
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 400);
});

test('errorHandler delegates to next when headers are already sent', () => {
  let passed;
  const res = mockRes();
  res.headersSent = true;
  const err = new Error('late failure');
  errorHandler(err, {}, res, (e) => { passed = e; });
  assert.equal(passed, err);
});

/* ---------------------------------------------------------------- */
/* middleware/auth.js                                               */
/* ---------------------------------------------------------------- */

test('isAdminRole accepts admin and superadmin, rejects everything else', () => {
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('superadmin'), true);
  assert.equal(isAdminRole('user'), false);
  assert.equal(isAdminRole(undefined), false);
  assert.equal(isAdminRole(''), false);
});

test('sign() produces a verifiable JWT carrying sub + role', () => {
  const token = sign({ sub: 42, role: 'user' });
  const decoded = jwt.verify(token, secret());
  assert.equal(decoded.sub, 42);
  assert.equal(decoded.role, 'user');
});

test('authenticate rejects a missing token with 401', async () => {
  const res = mockRes();
  let nextCalled = false;
  await authenticate({ headers: {} }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
  assert.equal(nextCalled, false);
});

test('authenticate accepts a valid Bearer token and sets req.auth', async () => {
  const token = sign({ sub: 7, role: 'user' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = mockRes();
  let nextCalled = false;
  await authenticate(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.deepEqual(req.auth, { id: 7, role: 'user' });
});

test('authenticate rejects a malformed token with 401', async () => {
  const res = mockRes();
  let nextCalled = false;
  await authenticate(
    { headers: { authorization: 'Bearer not.a.real.token' } },
    res,
    () => { nextCalled = true; }
  );
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireAdmin blocks a logged-in non-admin user with 403', async () => {
  const token = sign({ sub: 1, role: 'user' });
  const res = mockRes();
  await requireAdmin({ headers: { authorization: `Bearer ${token}` } }, res, () => {});
  assert.equal(res.statusCode, 403);
});

test('requireAdmin allows an admin token through', async () => {
  const token = sign({ sub: 1, role: 'admin' });
  let nextCalled = false;
  await requireAdmin({ headers: { authorization: `Bearer ${token}` } }, mockRes(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

/* ---------------------------------------------------------------- */
/* config/db.js — public surface only (no connection made)          */
/* ---------------------------------------------------------------- */

test('config/db exposes the expected query helpers', () => {
  const db = require('../config/db');
  assert.ok(db.pool, 'pool should be defined');
  for (const fn of ['query', 'one', 'begin', 'commit', 'rollback']) {
    assert.equal(typeof db[fn], 'function', `${fn} should be a function`);
  }
});

/* ---------------------------------------------------------------- */
/* package.json contract                                            */
/* ---------------------------------------------------------------- */

test('package.json defines start and test scripts', () => {
  const pkg = require('../package.json');
  assert.equal(typeof pkg.scripts.start, 'string');
  assert.equal(typeof pkg.scripts.test, 'string');
  assert.equal(pkg.main, 'server.js');
});
