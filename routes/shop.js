const router = require('express').Router();
const c = require('../controllers/shopController');
const p = require('../controllers/paymentController');
const { authenticate, isAdminRole, loadUser } = require('../middleware/auth');

/* cart (auth) */
router.get('/cart', authenticate, c.getCart);
router.post('/cart', authenticate, c.addToCart);
router.put('/cart/:id', authenticate, c.updateCartItem);
router.delete('/cart/:id', authenticate, c.removeCartItem);
router.delete('/cart', authenticate, c.clearCart);

/* wishlist (auth) */
router.get('/wishlist', authenticate, c.getWishlist);
router.post('/wishlist', authenticate, c.toggleWishlist);

/* orders */
router.post('/orders', authenticate, c.createOrder);
router.get('/orders', authenticate, c.listOrders);
router.get('/orders/:id', authenticate, c.getOrder);
router.put('/orders/:id', authenticate, (req, res, next) => {
  if (!isAdminRole(req.auth?.role)) return res.status(403).json({ success: false, message: 'Admin access required' });
  return c.updateOrder(req, res, next);
});

/* reviews */
router.get('/reviews', (req, res, next) => {
  // public read; admin sees everything via query
  const auth = req.headers.authorization;
  if (!auth) return c.listReviews(req, res, next);
  return authenticate(req, res, (err) => (err ? next(err) : c.listReviews(req, res, next)));
});
router.post('/reviews', authenticate, loadUser, c.createReview);
router.put('/reviews/:id', authenticate, loadUser, c.updateReview);
router.delete('/reviews/:id', authenticate, loadUser, c.deleteReview);

/* payments */
router.post('/payments/create-order', authenticate, p.createPaymentOrder);
router.post('/payments/verify', authenticate, p.verifyPayment);

/* public content */
router.get('/banners', c.listBanners);
router.get('/videos', c.listVideos);
router.get('/settings', c.getSettings);
router.get('/coupons', c.listCoupons);
router.get('/coupons/validate', c.validateCoupon);

module.exports = router;
