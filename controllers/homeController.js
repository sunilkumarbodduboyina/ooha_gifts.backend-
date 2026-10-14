const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/error');

/*
 * Aggregated homepage payload.
 *
 * The storefront homepage used to fire ~10 separate requests
 * (banners, categories, 3x collections, 3x product rails, reviews,
 * videos), each with its own round-trip and skeleton state. This
 * endpoint answers all of them in ONE request by running the queries
 * in parallel and returning one JSON object. It is served with
 * ETag/`no-cache` revalidation so repeat visits are instant but
 * admin edits are never stale.
 */

const PROD_SELECT = `
  SELECT p.*, c.name category_name, c.slug category_slug,
         col.name collection_name, col.slug collection_slug, col.type collection_type,
         (SELECT image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) image,
         (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) image_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN collections col ON col.id = p.collection_id
`;

const getHome = asyncHandler(async (req, res) => {
  const [
    banners, categories, collections, featured, loveLab, discount, reviews, videos,
    newArrivals, bestSellers, couponRows, settingRows, whatsapp,
    birthday, anniversary, couples, personalized, corporate, recentlyAdded, statsRow,
  ] = await Promise.all([
    /* hero carousel */
    query('SELECT * FROM banners WHERE active = 1 ORDER BY display_order, id'),

    /* "Meaningful Gifts Starting…" */
    query(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 1) product_count
       FROM categories c WHERE c.status = 1 ORDER BY c.sort_order, c.name`
    ),

    /* all collections (storefront filters by type client-side) */
    query(
      `SELECT col.*, (SELECT COUNT(*) FROM products p WHERE p.collection_id = col.id AND p.status = 1) product_count
       FROM collections col WHERE col.status = 1 ORDER BY col.type, col.sort_order, col.name`
    ),

    /* Featured Gifts rail */
    query(`${PROD_SELECT} WHERE p.status = 1 AND p.featured = 1 ORDER BY p.id DESC LIMIT 8`),

    /* Love Lab auto-scroll rail */
    query(`${PROD_SELECT} WHERE p.status = 1 AND col.slug = 'love-lab' ORDER BY p.id DESC LIMIT 12`),

    /* Unique Collection (biggest discounts) */
    query(`${PROD_SELECT} WHERE p.status = 1 ORDER BY p.discount_percentage DESC, p.id DESC LIMIT 8`),

    /* What Our Customers Say */
    query(
      `SELECT r.*, p.name product_name, p.slug product_slug,
              (SELECT image FROM product_images pi WHERE pi.product_id = r.product_id ORDER BY pi.sort_order, pi.id LIMIT 1) product_image
       FROM reviews r LEFT JOIN products p ON p.id = r.product_id
       WHERE r.status = 'approved' ORDER BY r.created_at DESC LIMIT 9`
    ),

    /* Watch & Explore reels */
    query('SELECT * FROM videos WHERE active = 1 ORDER BY display_order, id'),

    /* New Arrivals homepage section */
    query(`${PROD_SELECT} WHERE p.status = 1 AND col.slug = 'new-arrivals' ORDER BY p.id DESC LIMIT 6`),

    /* Best Sellers homepage section */
    query(`${PROD_SELECT} WHERE p.status = 1 AND col.slug = 'best-sellers' ORDER BY p.id DESC LIMIT 6`),

    /* Offers & Coupons homepage section (active, unexpired only) */
    query(
      `SELECT * FROM coupons WHERE active = 1 AND (expires_at IS NULL OR expires_at >= NOW())
       ORDER BY id DESC LIMIT 6`
    ),

    /* Contact section (public settings) */
    query('SELECT `key`, value FROM settings'),

    /* Contact section (WhatsApp support row) */
    query('SELECT * FROM whatsapp_settings ORDER BY id LIMIT 1'),

    /* Birthday Gifts */
    query(`${PROD_SELECT} WHERE p.status = 1 AND p.occasion = 'Birthday' ORDER BY p.featured DESC, p.id DESC LIMIT 10`),

    /* Anniversary Gifts */
    query(`${PROD_SELECT} WHERE p.status = 1 AND p.occasion = 'Anniversary' ORDER BY p.featured DESC, p.id DESC LIMIT 10`),

    /* Gifts for Couples */
    query(`${PROD_SELECT} WHERE p.status = 1 AND p.relationship = 'For Couples' ORDER BY p.featured DESC, p.id DESC LIMIT 10`),

    /* Personalized Gifts */
    query(`${PROD_SELECT} WHERE p.status = 1 AND (c.slug = 'customized-name-gifts' OR p.name LIKE '%Personal%' OR p.tags LIKE '%personal%') ORDER BY p.featured DESC, p.id DESC LIMIT 10`),

    /* Corporate Gifts */
    query(`${PROD_SELECT} WHERE p.status = 1 AND col.slug = 'corporate' ORDER BY p.featured DESC, p.id DESC LIMIT 10`),

    /* Recently Added (newest products) */
    query(`${PROD_SELECT} WHERE p.status = 1 ORDER BY p.id DESC LIMIT 10`),

    /* Real store stats for the trust / benefits bar */
    query(
      `SELECT
         (SELECT COUNT(*) FROM products WHERE status = 1) productCount,
         (SELECT COUNT(*) FROM categories WHERE status = 1) categoryCount,
         (SELECT COUNT(*) FROM users) customerCount,
         (SELECT COUNT(*) FROM orders) orderCount,
         (SELECT COUNT(*) FROM orders WHERE payment_status = 'paid') paidOrderCount,
         (SELECT COUNT(*) FROM reviews WHERE status = 'approved') reviewCount,
         (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE status = 'approved') avgRating,
         (SELECT ROUND(AVG(rating), 2) FROM products WHERE status = 1 AND rating > 0) avgProductRating`
    ),
  ]);

  const settings = {};
  settingRows.forEach((r) => { settings[r.key] = r.value; });

  const raw = statsRow[0] || {};
  const stats = {
    productCount: Number(raw.productCount) || 0,
    categoryCount: Number(raw.categoryCount) || 0,
    customerCount: Number(raw.customerCount) || 0,
    orderCount: Number(raw.orderCount) || 0,
    paidOrderCount: Number(raw.paidOrderCount) || 0,
    reviewCount: Number(raw.reviewCount) || 0,
    avgRating: Number(raw.avgRating) || Number(raw.avgProductRating) || 0,
  };

  res.json({
    success: true,
    banners,
    categories,
    collections,
    featured,
    loveLab,
    discount,
    reviews,
    videos,
    newArrivals,
    bestSellers,
    birthday,
    anniversary,
    couples,
    personalized,
    corporate,
    recentlyAdded,
    coupons: couponRows,
    settings,
    stats,
    whatsapp: whatsapp[0] || null,
  });
});

module.exports = { getHome };