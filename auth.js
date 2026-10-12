const router = require('express').Router();
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', c.register);
router.post('/login', c.login);
router.post('/admin/login', c.adminLogin);
router.get('/me', authenticate, c.me);
router.put('/profile', authenticate, c.updateProfile);
router.put('/password', authenticate, c.changePassword);

module.exports = router;
