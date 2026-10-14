const router = require('express').Router();
const c = require('../controllers/catalogController');
const home = require('../controllers/homeController');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

/* homepage aggregate (banners + rails + grids in one request) */
router.get('/home', home.getHome);

/* products */
router.get('/products', c.listProducts);
router.get('/products/search', c.search);
router.get('/products/:id', c.getProduct);
router.post('/products', requireAdmin, upload.array('images', 8), c.createProduct);
router.put('/products/:id', requireAdmin, upload.array('images', 8), c.updateProduct);
router.delete('/products/:id', requireAdmin, c.deleteProduct);
router.post('/products/:id/duplicate', requireAdmin, c.duplicateProduct);

/* categories */
router.get('/categories', c.listCategories);
router.post('/categories', requireAdmin, c.createCategory);
router.put('/categories/:id', requireAdmin, c.updateCategory);
router.delete('/categories/:id', requireAdmin, c.deleteCategory);

/* collections */
router.get('/collections', c.listCollections);
router.post('/collections', requireAdmin, c.createCollection);
router.put('/collections/:id', requireAdmin, c.updateCollection);
router.delete('/collections/:id', requireAdmin, c.deleteCollection);

/* search */
router.get('/search', c.search);

module.exports = router;
