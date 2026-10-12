const crypto = require('crypto');
const { query, one } = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/error');

const toNum = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const keyId = () => process.env.RAZORPAY_KEY_ID || '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET || '';
const live = () => Boolean(keyId() && keySecret());

/**
 * POST /api/payments/create-order  { order_id }
 * Creates a Razorpay order (or a simulated one in test mode) for an existing order.
 */
const createPaymentOrder = asyncHandler(async (req, res) => {
  const orderId = Number(req.body?.order_id);
  const order = await one('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.auth.id]);
  if (!order) throw httpError(404, 'Order not found');
  if (order.payment_status === 'paid') throw httpError(400, 'This order is already paid');

  const amount = Math.round(Number(order.final_amount) * 100); // paise
  const receipt = order.order_number;

  let rzpOrderId = null;
  if (live()) {
    try {
      const resp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${keyId()}:${keySecret()}`).toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, currency: 'INR', receipt, notes: { order_id: String(orderId) } }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.description || 'Razorpay order creation failed');
      rzpOrderId = data.id;
    } catch (err) {
      throw httpError(502, `Payment gateway error: ${err.message}`);
    }
  } else {
    rzpOrderId = `order_sim_${orderId}_${Date.now()}`;
  }

  await query('UPDATE payments SET payment_id = ?, order_reference = ?, amount = ?, status = ? WHERE order_id = ?',
    [rzpOrderId, rzpOrderId, Number(order.final_amount), 'created', orderId]);

  res.json({
    success: true,
    mode: live() ? 'live' : 'simulated',
    key_id: keyId() || null,
    razorpay_order_id: rzpOrderId,
    amount,
    currency: 'INR',
    order_number: order.order_number,
  });
});

/**
 * POST /api/payments/verify
 * Verifies the Razorpay signature (live) or settles the payment in test mode,
 * then marks the order paid.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body || {};
  const orderId = Number(order_id);
  const order = await one('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.auth.id]);
  if (!order) throw httpError(404, 'Order not found');
  if (order.payment_status === 'paid') {
    return res.json({ success: true, already_paid: true, order_number: order.order_number });
  }

  if (live()) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw httpError(400, 'Missing payment verification data');
    }
    const expected = crypto
      .createHmac('sha256', keySecret())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== String(razorpay_signature)) {
      await query('UPDATE payments SET status = ? WHERE order_id = ?', ['failed', orderId]);
      await query('UPDATE orders SET payment_status = ? WHERE id = ?', ['failed', orderId]);
      throw httpError(400, 'Payment verification failed. Do not close this window.');
    }
    await query('UPDATE payments SET payment_id = ?, signature = ?, status = ? WHERE order_id = ?',
      [razorpay_payment_id, razorpay_signature, 'paid', orderId]);
  } else {
    await query('UPDATE payments SET payment_id = ?, status = ? WHERE order_id = ?',
      [razorpay_payment_id || `pay_sim_${Date.now()}`, 'paid', orderId]);
  }

  await query('UPDATE orders SET payment_status = ?, payment_method = ? WHERE id = ?',
    ['paid', method || order.payment_method || 'UPI', orderId]);

  const updated = await one('SELECT * FROM orders WHERE id = ?', [orderId]);
  res.json({ success: true, message: 'Payment Successful 🎉', order: updated, order_number: updated.order_number });
});

module.exports = { createPaymentOrder, verifyPayment, live };
