require('dotenv').config();
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

/* ------------------------------------------------------------------ */
/* CORS                                                                */
/* ------------------------------------------------------------------ */
const origins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.includes('*') || origins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------------------------ */
/* Static uploads                                                      */
/* ------------------------------------------------------------------ */
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', immutable: true }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

/* ------------------------------------------------------------------ */
/* Performance: ETag revalidation + gzip                              */
/* ------------------------------------------------------------------ */
/*
 * Public GET endpoints get `no-cache, must-revalidate` — the browser
 * stores the response with its ETag and revalidates each visit, which
 * returns an instant 304 when nothing changed. This keeps repeat loads
 * fast WITHOUT ever serving stale data, so admin edits still reflect
 * immediately on the storefront. Private endpoints (auth, cart,
 * wishlist, orders, admin) skip the shared-cache policy.
 */
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/uploads')) return next();
  const isPrivate = ['/api/auth', '/api/cart', '/api/wishlist', '/api/orders', '/api/admin']
    .some((p) => req.path.startsWith(p));
  if (!isPrivate) {
    res.setHeader('Cache-Control', 'public, no-cache, must-revalidate');
    res.setHeader('Vary', 'Accept-Encoding');
  }
  next();
});

const GZIP_CT = /json|javascript|css|html|svg|xml|text/i;

/* gzip as many API responses as possible (no extra dependency). */
app.use((req, res, next) => {
  if (req.method !== 'GET' || !/gzip/i.test(req.headers['accept-encoding'] || '')) return next();
  const send = res.send.bind(res);
  res.setHeader('Vary', 'Accept-Encoding');
  res.send = (body) => {
    const ct = String(res.getHeader('Content-Type') || '');
    if (
      res.statusCode !== 200 ||
      res.getHeader('Content-Encoding') ||
      !GZIP_CT.test(ct)
    ) return send(body);
    const gzip = zlib.createGzip();
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    let done = false;
    const restore = () => { res.write = origWrite; res.end = origEnd; };
    const finish = () => {
      if (done) return;
      done = true;
      restore();
      if (!gzip.writableEnded) gzip.end();
      origEnd();
    };
    res.write = (c, e, cb) => { gzip.write(c, e, cb); return true; };
    res.end = (c, e, cb) => {
      if (done) return origEnd(c, e, cb);
      /* Express downgrades to 304/204 inside send() — skip compression. */
      if (res.statusCode !== 200) {
        done = true;
        restore();
        res.removeHeader('Content-Encoding');
        gzip.destroy();
        return origEnd(c, e, cb);
      }
      res.removeHeader('Content-Length');
      if (c !== undefined && c !== null) { gzip.write(c, e, cb); gzip.end(); }
      else { gzip.end(); }
      return res;
    };
    gzip.on('data', (c) => origWrite(c));
    gzip.on('end', finish);
    gzip.on('error', finish);
    res.setHeader('Content-Encoding', 'gzip');
    res.removeHeader('Content-Length');
    send(body);
    /* Express re-sets Content-Length from the uncompressed body. On a
       304 downgrade, origEnd() has already flushed the headers, so
       removing it again would throw ERR_HTTP_HEADERS_SENT. */
    if (!res.headersSent) res.removeHeader('Content-Length');
    return res;
  };
  return next();
});

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */
app.get('/api/health', async (req, res) => {
  try {
    const { one } = require('./config/db');
    await one('SELECT 1 ok');
    return res.status(200).json({
      success: true,
      service: 'Ooha Gifts API',
      db: 'up',
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    return res.status(503).json({
      success: false,
      service: 'Ooha Gifts API',
      db: 'down',
      message: 'Database health check failed',
      time: new Date().toISOString(),
    });
  }
});

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalog'));
app.use('/api', require('./routes/shop'));
app.use('/api/admin', require('./routes/admin'));

app.use(notFound);
app.use(errorHandler);

/* ------------------------------------------------------------------ */
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`\n  🎁 Ooha Gifts API running on http://localhost:${PORT}`);
  console.log(`  🗄  Database : ${process.env.DB_NAME || 'ooha_gifts'}`);
  console.log(`  💳 Payments : ${process.env.RAZORPAY_KEY_ID ? 'Razorpay live keys' : 'simulated test mode'}\n`);
});
