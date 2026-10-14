const { query, one } = require('../config/db');
const { isAdminRole } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/error');

const toNum = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/* ================================================================== */
/* CART                                                                */
/* ================================================================== */

const getCart = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT ci.id, ci.quantity, p.id product_id, p.name, p.slug, p.selling_price, p.original_price,
            p.discount_percentage, p.stock, p.status,
            (SELECT image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) image
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = ? ORDER BY ci.created_at DESC`,
    [req.auth.id]
  );
  res.json({ success: true, items: rows });
});

const addToCart = asyncHandler(async (req, res) => {
  const { product_id, quantity = 1 } = req.body || {};
  const pid = Number(product_id);
  if (!pid) throw httpError(400, 'product_id is required');
  const product = await one('SELECT id, stock, status FROM products WHERE id = ?', [pid]);
  if (!product || product.status !== 1) throw httpError(404, 'Product is no longer available');
  const qty = Math.max(1, toNum(quantity, 1));

  const existing = await one('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [req.auth.id, pid]);
  if (existing) {
    await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [Math.min(99, existing.quantity + qty), existing.id]);
  } else {
    await query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?,?,?)', [req.auth.id, pid, qty]);
  }
  const count = await one('SELECT COALESCE(SUM(quantity),0) c FROM cart_items WHERE user_id = ?', [req.auth.id]);
  res.status(201).json({ success: true, cart_count: count.c, message: 'Added to cart' });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const qty = Math.max(1, Math.min(99, toNum(req.body?.quantity, 1)));
  const r = await query('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [qty, Number(req.params.id), req.auth.id]);
  if (!r.affectedRows) throw httpError(404, 'Cart item not found');
  res.json({ success: true, message: 'Cart updated' });
});

const removeCartItem = asyncHandler(async (req, res) => {
  await query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [Number(req.params.id), req.auth.id]);
  res.json({ success: true, message: 'Removed from cart' });
});

const clearCart = asyncHandler(async (req, res) => {
  await query('DELETE FROM cart_items WHERE user_id = ?', [req.auth.id]);
  res.json({ success: true, message: 'Cart cleared' });
});

/* ================================================================== */
/* WISHLIST                                                            */
/* ================================================================== */

const getWishlist = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT w.id, w.product_id, p.name, p.slug, p.selling_price, p.original_price, p.discount_percentage, p.stock, p.status,
            (SELECT image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) image
     FROM wishlists w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = ? ORDER BY w.created_at DESC`,
    [req.auth.id]
  );
  res.json({ success: true, items: rows, product_ids: rows.map((r) => r.product_id) });
});

const toggleWishlist = asyncHandler(async (req, res) => {
  const pid = Number(req.body?.product_id);
  if (!pid) throw httpError(400, 'product_id is required');
  const existing = await one('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [req.auth.id, pid]);
  if (existing) {
    await query('DELETE FROM wishlists WHERE id = ?', [existing.id]);
    return res.json({ success: true, wished: false, message: 'Removed from wishlist' });
  }
  await query('INSERT INTO wishlists (user_id, product_id) VALUES (?,?)', [req.auth.id, pid]);
  res.status(201).json({ success: true, wished: true, message: 'Added to wishlist' });
});

/* ================================================================== */
/* ORDERS                                                              */
/* ================================================================== */

function orderNumber() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `OOHA-${y}${md}${Math.floor(1000 + Math.random() * 9000)}`;
}

/* POST /api/orders */
const createOrder = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const address = b.shipping_address || b.address;
  if (!address || !address.full_name || !address.line1 || !address.city || !address.pincode) {
    throw httpError(400, 'Please provide a complete shipping address');
  }

  let items = b.items;
  if (!items || !items.length) {
    items = (await query(
      'SELECT product_id, quantity FROM cart_items WHERE user_id = ?', [req.auth.id]
    )).map((r) => ({ product_id: r.product_id, quantity: r.quantity }));
  }
  if (!items.length) throw httpError(400, 'Your cart is empty');

  let total = 0;
  const lines = [];
  for (const it of items) {
    const p = await one('SELECT id, name, selling_price, stock, status FROM products WHERE id = ?', [Number(it.product_id)]);
    if (!p || p.status !== 1) throw httpError(400, 'A product in your cart is no longer available');
    const qty = Math.max(1, toNum(it.quantity, 1));
    if (p.stock < qty) throw httpError(400, `Only ${p.stock} left of "${p.name}"`);
    const subtotal = Number(p.selling_price) * qty;
    total += subtotal;
    lines.push({ p, qty, subtotal });
  }

  let discount = 0;
  if (b.coupon_code) {
    const c = await one('SELECT * FROM coupons WHERE code = ? AND active = 1', [String(b.coupon_code).toUpperCase()]);
    if (c && (!c.expires_at || new Date(c.expires_at) >= new Date()) && total >= Number(c.min_order || 0)) {
      discount = c.discount_type === 'percent'
        ? Math.min(total * (Number(c.discount_value) / 100), Number(c.max_discount || Infinity))
        : Math.min(Number(c.discount_value), total);
      discount = Math.round(discount * 100) / 100;
    } else if (c) {
      throw httpError(400, 'This coupon is not applicable to your order');
    } else {
      throw httpError(400, 'Invalid coupon code');
    }
  }

  const settings = {};
  (await query('SELECT `key`, value FROM settings')).forEach((s) => { settings[s.key] = s.value; });
  const freeAbove = toNum(settings.free_delivery_above, 999);
  const fee = toNum(settings.delivery_charge, 49);
  const shipping = total - discount >= freeAbove || freeAbove === 0 ? 0 : fee;
  const finalAmount = Math.max(0, total - discount + shipping);

  const paymentMethod = b.payment_method || 'COD';

  const r = await query(
    `INSERT INTO orders (order_number, user_id, total_amount, discount_amount, shipping_amount, final_amount,
       coupon_code, payment_status, payment_method, order_status, shipping_address)
     VALUES (?,?,?,?,?,?,?,?,?,'Pending',?)`,
    [orderNumber(), req.auth.id, total, discount, shipping, finalAmount,
      b.coupon_code ? String(b.coupon_code).toUpperCase() : null,
      paymentMethod === 'COD' ? 'pending' : 'pending',
      paymentMethod,
      JSON.stringify(address)]
  );
  const orderId = r.insertId;

  for (const { p, qty, subtotal } of lines) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price, subtotal)
       VALUES (?,?,?,?,?,?,?)`,
      [orderId, p.id, p.name, (await one('SELECT image FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [p.id]))?.image || null,
        qty, p.selling_price, subtotal]
    );
    // eslint-disable-next-line no-await-in-loop
    await query('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [qty, p.id]);
  }

  await query('INSERT INTO payments (order_id, user_id, gateway, method, amount, status) VALUES (?,?,?,?,?,?)',
    [orderId, req.auth.id, 'razorpay', paymentMethod, finalAmount, 'created']);
  await query('DELETE FROM cart_items WHERE user_id = ?', [req.auth.id]);

  const order = await one('SELECT * FROM orders WHERE id = ?', [orderId]);
  res.status(201).json({ success: true, order, message: 'Order placed successfully' });
});

/* GET /api/orders — own orders (user) or all orders (admin: ?all=1) */
const listOrders = asyncHandler(async (req, res) => {
  const isAdmin = isAdminRole(req.auth.role);
  const wantAll = isAdmin && req.query.all === '1';
  const params = [];
  let where = '';
  if (wantAll) {
    if (req.query.status) { where = 'WHERE o.order_status = ?'; params.push(req.query.status); }
    if (req.query.payment_status) {
      where += where ? ' AND ' : 'WHERE ';
      where += 'o.payment_status = ?';
      params.push(req.query.payment_status);
    }
    if (req.query.search) {
      where += where ? ' AND ' : 'WHERE ';
      where += '(o.order_number LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)';
      const like = `%${req.query.search}%`;
      params.push(like, like, like, like);
    }
  } else {
    where = 'WHERE o.user_id = ?';
    params.push(req.auth.id);
  }

  const orders = await query(
    `SELECT o.*, u.name customer_name, u.phone customer_phone, u.email customer_email,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) item_count,
            (SELECT IFNULL(SUM(oi.quantity),0) FROM order_items oi WHERE oi.order_id = o.id) item_qty,
            (SELECT GROUP_CONCAT(CONCAT(oi.product_name, ' \u00d7', oi.quantity) SEPARATOR ' \u00b7 ')
               FROM order_items oi WHERE oi.order_id = o.id) item_names,
            (SELECT oi.product_image FROM order_items oi WHERE oi.order_id = o.id ORDER BY oi.id LIMIT 1) item_image
     FROM orders o LEFT JOIN users u ON u.id = o.user_id
     ${where} ORDER BY o.created_at DESC`,
    params
  );
  res.json({ success: true, orders });
});

/* GET /api/orders/:id */
const getOrder = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const order = await one(
    `SELECT o.*, u.name customer_name, u.phone customer_phone, u.email customer_email
     FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
    [id]
  );
  if (!order) throw httpError(404, 'Order not found');
  if (!isAdminRole(req.auth.role) && order.user_id !== req.auth.id) throw httpError(403, 'Not your order');

  const items = await query('SELECT * FROM order_items WHERE order_id = ?', [id]);
  const payment = await one('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1', [id]);
  res.json({ success: true, order: { ...order, items, payment } });
});

/* PUT /api/orders/:id — admin updates status / payment */
const updateOrder = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one('SELECT * FROM orders WHERE id = ?', [id]);
  if (!existing) throw httpError(404, 'Order not found');
  const b = req.body || {};
  const statuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
  const paymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

  if (b.order_status && !statuses.includes(b.order_status)) throw httpError(400, 'Invalid order status');
  if (b.payment_status && !paymentStatuses.includes(b.payment_status)) throw httpError(400, 'Invalid payment status');

  await query(
    'UPDATE orders SET order_status = ?, payment_status = ?, payment_method = ? WHERE id = ?',
    [
      b.order_status || existing.order_status,
      b.payment_status || existing.payment_status,
      b.payment_method || existing.payment_method,
      id,
    ]
  );
  if (b.payment_status === 'paid') {
    await query('UPDATE payments SET status = ? WHERE order_id = ?', ['paid', id]);
  }
  const order = await one('SELECT * FROM orders WHERE id = ?', [id]);
  res.json({ success: true, order, message: 'Order updated' });
});

/* ================================================================== */
/* REVIEWS                                                             */
/* ================================================================== */

const listReviews = asyncHandler(async (req, res) => {
  const { product_id, status } = req.query;
  const isAdmin = isAdminRole(req.auth?.role);
  const where = [];
  const params = [];
  if (product_id) { where.push('r.product_id = ?'); params.push(Number(product_id)); }
  if (status) { where.push('r.status = ?'); params.push(status); }
  else if (!isAdmin) { where.push("r.status = 'approved'"); }
  const sql = `SELECT r.*, p.name product_name, p.slug product_slug,
      (SELECT image FROM product_images pi WHERE pi.product_id = r.product_id ORDER BY pi.sort_order, pi.id LIMIT 1) product_image
     FROM reviews r LEFT JOIN products p ON p.id = r.product_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY r.created_at DESC LIMIT 200`;
  const rows = await query(sql, params);
  res.json({ success: true, reviews: rows });
});

const createReview = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const rating = Math.max(1, Math.min(5, toNum(b.rating, 5)));
  if (!b.comment || String(b.comment).trim().length < 5) throw httpError(400, 'Please write a short review');
  const name = b.customer_name || req.user?.name || 'Ooha Customer';
  await query(
    `INSERT INTO reviews (product_id, user_id, customer_name, rating, title, comment, product_purchased, review_date, status)
     VALUES (?,?,?,?,?,?,?, CURDATE(), 'pending')`,
    [Number(b.product_id) || null, req.auth.id, name, rating, b.title || null,
      String(b.comment).trim(), b.product_purchased || null]
  );
  res.status(201).json({ success: true, message: 'Thank you! Your review will appear once approved.' });
});

const updateReview = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one('SELECT * FROM reviews WHERE id = ?', [id]);
  if (!existing) throw httpError(404, 'Review not found');
  if (!isAdminRole(req.auth.role) && existing.user_id !== req.auth.id) {
    throw httpError(403, 'Not your review');
  }
  const b = req.body || {};
  if (b.rating !== undefined) {
    if (!isAdminRole(req.auth.role) && existing.user_id !== req.auth.id) {
      throw httpError(403, 'Not your review');
    }
    await query('UPDATE reviews SET rating = ? WHERE id = ?', [Math.max(1, Math.min(5, toNum(b.rating, 5))), id]);
  }
  if (b.status !== undefined) {
    if (!isAdminRole(req.auth.role)) throw httpError(403, 'Admin access required');
    if (!['pending', 'approved', 'hidden'].includes(b.status)) throw httpError(400, 'Invalid status');
    await query('UPDATE reviews SET status = ? WHERE id = ?', [b.status, id]);
  }
  res.json({ success: true, message: 'Review updated' });
});

const deleteReview = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one('SELECT * FROM reviews WHERE id = ?', [id]);
  if (!existing) throw httpError(404, 'Review not found');
  if (!isAdminRole(req.auth.role) && existing.user_id !== req.auth.id) {
    throw httpError(403, 'Not your review');
  }
  await query('DELETE FROM reviews WHERE id = ?', [id]);
  res.json({ success: true, message: 'Review deleted' });
});

/* ================================================================== */
/* BANNERS / VIDEOS / SETTINGS / COUPONS (public reads)               */
/* ================================================================== */

const listBanners = asyncHandler(async (req, res) => {
  const admin = isAdminRole(req.auth?.role) && req.query.all === '1';
  const rows = admin
    ? await query('SELECT * FROM banners ORDER BY display_order, id')
    : await query('SELECT * FROM banners WHERE active = 1 ORDER BY display_order, id');
  res.json({ success: true, banners: rows });
});

const listVideos = asyncHandler(async (req, res) => {
  const admin = isAdminRole(req.auth?.role) && req.query.all === '1';
  const rows = admin
    ? await query('SELECT * FROM videos ORDER BY display_order, id')
    : await query('SELECT * FROM videos WHERE active = 1 ORDER BY display_order, id');
  res.json({ success: true, videos: rows });
});

const getSettings = asyncHandler(async (req, res) => {
  const rows = await query('SELECT `key`, value FROM settings');
  const settings = {};
  rows.forEach((r) => { settings[r.key] = r.value; });
  const wa = await one('SELECT * FROM whatsapp_settings ORDER BY id LIMIT 1');
  res.json({ success: true, settings, whatsapp: wa || null });
});

const listCoupons = asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM coupons ORDER BY id DESC');
  res.json({ success: true, coupons: rows });
});

/* GET /api/coupons/validate?code=X&cart_total=Y */
const validateCoupon = asyncHandler(async (req, res) => {
  const code = String(req.query.code || '').toUpperCase().trim();
  const total = toNum(req.query.cart_total, 0);
  const c = await one('SELECT * FROM coupons WHERE code = ? AND active = 1', [code]);
  if (!c) throw httpError(404, 'Invalid coupon code');
  if (c.expires_at && new Date(c.expires_at) < new Date()) throw httpError(400, 'This coupon has expired');
  if (total < Number(c.min_order || 0)) throw httpError(400, `Minimum order of ₹${c.min_order} required`);
  const discount = c.discount_type === 'percent'
    ? Math.min(total * (Number(c.discount_value) / 100), Number(c.max_discount || Infinity))
    : Math.min(Number(c.discount_value), total);
  res.json({ success: true, coupon: c, discount: Math.round(discount * 100) / 100 });
});

module.exports = {
  getCart, addToCart, updateCartItem, removeCartItem, clearCart,
  getWishlist, toggleWishlist,
  createOrder, listOrders, getOrder, updateOrder,
  listReviews, createReview, updateReview, deleteReview,
  listBanners, listVideos, getSettings, listCoupons, validateCoupon,
};
