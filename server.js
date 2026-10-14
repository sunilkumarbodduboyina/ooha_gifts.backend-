
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// Trust the proxy used by hosting platforms such as Render.
app.set('trust proxy', 1);

/* --------------------------------------------------
   CORS
-------------------------------------------------- */
const origins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origins.includes('*') ||
        origins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

/* --------------------------------------------------
   Request parsing
-------------------------------------------------- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* --------------------------------------------------
   Security headers
-------------------------------------------------- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

/* --------------------------------------------------
   Static uploads
-------------------------------------------------- */
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '7d',
    immutable: true,
  })
);

/* --------------------------------------------------
   Cache policy
-------------------------------------------------- */
app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path.startsWith('/uploads')
  ) {
    return next();
  }

  const privatePrefixes = [
    '/api/auth',
    '/api/cart',
    '/api/wishlist',
    '/api/orders',
    '/api/admin',
  ];

  const isPrivate = privatePrefixes.some((prefix) =>
    req.path.startsWith(prefix)
  );

  if (!isPrivate) {
    res.setHeader(
      'Cache-Control',
      'public, no-cache, must-revalidate'
    );
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }

  next();
});

/* --------------------------------------------------
   Health check
-------------------------------------------------- */
app.get('/api/health', async (req, res, next) => {
  try {
    const db = require('./config/db');

    if (typeof db.one !== 'function') {
      throw new Error(
        'Database configuration does not export a one() function'
      );
    }

    await db.one('SELECT 1 ok');

    return res.status(200).json({
      success: true,
      service: 'Ooha Gifts API',
      db: 'up',
      time: new Date().toISOString(),
    });
  } catch (error) {
    // Log details on the server, not in the public response.
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

/* --------------------------------------------------
   API routes
-------------------------------------------------- */
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalog'));
app.use('/api', require('./routes/shop'));
app.use('/api/admin', require('./routes/admin'));

/* --------------------------------------------------
   404 and error handlers
-------------------------------------------------- */
app.use(notFound);
app.use(errorHandler);

/* --------------------------------------------------
   Start server
-------------------------------------------------- */
const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('Ooha Gifts API started successfully');
  console.log(`Port: ${PORT}`);
  console.log(`Database: ${process.env.DB_NAME || 'ooha_gifts'}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the other server instance.`
    );
  } else {
    console.error('Server startup failed:', error.message);
  }

  process.exitCode = 1;
});
```