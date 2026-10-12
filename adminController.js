const { query, one } = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/error');
const { upload } = require('../middleware/upload');

const toNum = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/* ================================================================== */
/* DASHBOARD STATISTICS                                                */
/* ================================================================== */

const dashboard = asyncHandler(async (req, res) => {
  const totals = await one(`
    SELECT
      (SELECT COUNT(*) FROM products) total_products,
      (SELECT COUNT(*) FROM orders) total_orders,
      (SELECT COUNT(*) FROM users) total_customers,
      (SELECT COALESCE(SUM(final_amount),0) FROM orders WHERE payment_status = 'paid') total_revenue,
      (SELECT COUNT(*) FROM orders WHERE order_status = 'Pending') pending_orders,
      (SELECT COUNT(*) FROM orders WHERE order_status = 'Delivered') delivered_orders,
      (SELECT COUNT(*) FROM products WHERE stock <= 10 AND status = 1) low_stock,
      (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) today_orders,
      (SELECT COALESCE(SUM(final_amount),0) FROM orders WHERE DATE(created_at) = CURDATE()) today_revenue,
      (SELECT COUNT(*) FROM reviews WHERE status = 'pending') pending_reviews
  `);

  const sales = await query(`
    SELECT DATE(created_at) day,
           COUNT(*) orders,
           COALESCE(SUM(final_amount),0) revenue
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
    GROUP BY DATE(created_at)
    ORDER BY day
  `);

  const popular = await query(`
    SELECT oi.product_name, SUM(oi.quantity) qty, SUM(oi.subtotal) revenue,
           (SELECT image FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.sort_order, pi.id LIMIT 1) image
    FROM order_items oi
    GROUP BY oi.product_id, oi.product_name
    ORDER BY qty DESC
    LIMIT 6
  `);

  const statusSplit = await query(`
    SELECT order_status label, COUNT(*) value FROM orders GROUP BY order_status
  `);

  const recentOrders = await query(`
    SELECT o.id, o.order_number, o.final_amount, o.order_status, o.payment_status, o.created_at, u.name customer_name
    FROM orders o LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC LIMIT 6
  `);

  const recentReviews = await query(`
    SELECT id, customer_name, rating, title, status, created_at FROM reviews
    ORDER BY created_at DESC LIMIT 6
  `);

  res.json({ success: true, stats: { ...totals, sales, popular, statusSplit, recentOrders, recentReviews } });
});

/* GET /api/customers */
const customers = asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT u.id, u.name, u.email, u.phone, u.created_at,
           COUNT(o.id) orders,
           COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.final_amount END),0) spend
    FROM users u LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  res.json({ success: true, customers: rows });
});

/* GET /api/payments (admin) */
const payments = asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT p.*, o.order_number, o.order_status, u.name customer_name, u.email customer_email
    FROM payments p
    LEFT JOIN orders o ON o.id = p.order_id
    LEFT JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT 300
  `);
  res.json({ success: true, payments: rows });
});

/* ================================================================== */
/* GENERIC CRUD FOR BANNERS / VIDEOS / COUPONS                         */
/* ================================================================== */

function crud(table, publicFields) {
  const fields = publicFields.join(', ');

  const list = asyncHandler(async (req, res) => {
    const rows = await query(`SELECT ${fields} FROM ${table} ORDER BY id DESC`);
    res.json({ success: true, [table]: rows });
  });

  const create = asyncHandler(async (req, res) => {
    const b = { ...req.body };
    if (Array.isArray(req.files) && req.files.length) {
      if (b.image_field && b.image_field === 'video_url') b.video_url = `/uploads/${req.files[0].filename}`;
      else if (table === 'banners') b.image = `/uploads/${req.files[0].filename}`;
      else if (table === 'videos') {
        const vid = req.files.find((f) => f.mimetype.startsWith('video/'));
        const thumb = req.files.find((f) => f.mimetype.startsWith('image/'));
        if (vid) b.video_url = `/uploads/${vid.filename}`;
        if (thumb) b.thumbnail = `/uploads/${thumb.filename}`;
      }
    }
    const cols = Object.keys(b).filter((k) => publicFields.includes(k));
    if (!cols.length) throw httpError(400, 'No valid fields supplied');
    const r = await query(
      `INSERT INTO ${table} (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => b[c])
    );
    res.status(201).json({ success: true, id: r.insertId, message: `${table.slice(0, -1)} created` });
  });

  const update = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await one(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!existing) throw httpError(404, 'Not found');
    const b = { ...req.body };
    if (Array.isArray(req.files) && req.files.length) {
      if (table === 'banners') b.image = `/uploads/${req.files[0].filename}`;
      else if (table === 'videos') {
        const vid = req.files.find((f) => f.mimetype.startsWith('video/'));
        const thumb = req.files.find((f) => f.mimetype.startsWith('image/'));
        if (vid) b.video_url = `/uploads/${vid.filename}`;
        if (thumb) b.thumbnail = `/uploads/${thumb.filename}`;
      }
    }
    const cols = Object.keys(b).filter((k) => publicFields.includes(k) && b[k] !== undefined);
    if (!cols.length) throw httpError(400, 'No valid fields supplied');
    await query(
      `UPDATE ${table} SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
      [...cols.map((c) => b[c]), id]
    );
    res.json({ success: true, message: `${table.slice(0, -1)} updated` });
  });

  const remove = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const r = await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    if (!r.affectedRows) throw httpError(404, 'Not found');
    res.json({ success: true, message: `${table.slice(0, -1)} deleted` });
  });

  return { list, create, update, remove };
}

const bannerCrud = crud('banners', ['title', 'subtitle', 'image', 'button_text', 'button_link', 'display_order', 'active']);
const videoCrud = crud('videos', ['title', 'description', 'video_url', 'thumbnail', 'active', 'display_order']);
const couponCrud = crud('coupons', ['code', 'description', 'discount_type', 'discount_value', 'min_order', 'max_discount', 'active', 'expires_at']);

/* ================================================================== */
/* SETTINGS                                                            */
/* ================================================================== */

const updateSettings = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const entries = Object.entries(body).filter(([k]) => /^[a-z0-9_]+$/i.test(k));
  if (!entries.length) throw httpError(400, 'Nothing to update');
  for (const [key, value] of entries) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      'INSERT INTO settings (`key`, value) VALUES (?,?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, String(value ?? '')]
    );
  }
  res.json({ success: true, message: 'Website settings saved' });
});

const updateWhatsApp = asyncHandler(async (req, res) => {
  const { phone, default_message, enabled } = req.body || {};
  if (!phone) throw httpError(400, 'WhatsApp number is required');
  const existing = await one('SELECT id FROM whatsapp_settings ORDER BY id LIMIT 1');
  if (existing) {
    await query('UPDATE whatsapp_settings SET phone = ?, default_message = ?, enabled = ? WHERE id = ?',
      [String(phone), default_message || '', enabled === undefined ? 1 : toNum(enabled), existing.id]);
  } else {
    await query('INSERT INTO whatsapp_settings (phone, default_message, enabled) VALUES (?,?,?)',
      [String(phone), default_message || '', enabled === undefined ? 1 : toNum(enabled)]);
  }
  res.json({ success: true, message: 'WhatsApp settings saved' });
});

/* ================================================================== */
/* FILE UPLOAD                                                         */
/* ================================================================== */

const uploadFiles = (req, res) => {
  upload.any()(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No file received' });
    res.status(201).json({
      success: true,
      files: req.files.map((f) => ({ url: `/uploads/${f.filename}`, name: f.originalname, size: f.size, mimetype: f.mimetype })),
    });
  });
};

module.exports = {
  dashboard, customers, payments,
  banners: bannerCrud, videos: videoCrud, coupons: couponCrud,
  updateSettings, updateWhatsApp, uploadFiles,
};
