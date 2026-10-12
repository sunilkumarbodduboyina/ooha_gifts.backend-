const router = require('express').Router();
const c = require('../controllers/adminController');
const s = require('../controllers/shopController');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(requireAdmin);

router.get('/stats/dashboard', c.dashboard);
router.get('/customers', c.customers);
router.get('/payments', c.payments);

/* banners */
router.get('/banners', c.banners.list);
router.post('/banners', upload.any(), c.banners.create);
router.put('/banners/:id', upload.any(), c.banners.update);
router.delete('/banners/:id', c.banners.remove);

/* videos */
router.get('/videos', c.videos.list);
router.post('/videos', upload.any(), c.videos.create);
router.put('/videos/:id', upload.any(), c.videos.update);
router.delete('/videos/:id', c.videos.remove);

/* coupons / offers */
router.get('/coupons', c.coupons.list);
router.post('/coupons', c.coupons.create);
router.put('/coupons/:id', c.coupons.update);
router.delete('/coupons/:id', c.coupons.remove);

/* orders (admin) */
router.get('/orders', (req, res, next) => { req.query.all = '1'; return s.listOrders(req, res, next); });
router.get('/orders/:id', s.getOrder);
router.put('/orders/:id', s.updateOrder);

/* reviews moderation */
router.get('/reviews', s.listReviews);
router.put('/reviews/:id', s.updateReview);
router.delete('/reviews/:id', s.deleteReview);

/* settings */
router.put('/settings', c.updateSettings);
router.put('/whatsapp', c.updateWhatsApp);

/* uploads */
router.post('/upload', c.uploadFiles);

module.exports = router;
