const { query, one } = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/error');

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
}

async function uniqueSlug(table, base, ignoreId = null) {
  let slug = slugify(base) || 'item';
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  const row = await one(`SELECT id FROM ${table} WHERE slug = ?${ignoreId ? ' AND id <> ?' : ''}`, ignoreId ? [slug, ignoreId] : [slug]);
  if (!row) return slug;
  do {
    n += 1;
    slug = `${slugify(base)}-${n}`;
    // eslint-disable-next-line no-await-in-loop
    const r2 = await one(`SELECT id FROM ${table} WHERE slug = ?${ignoreId ? ' AND id <> ?' : ''}`, ignoreId ? [slug, ignoreId] : [slug]);
    if (!r2) return slug;
  } while (n < 300);
  return `${slugify(base)}-${Date.now()}`;
}

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/* URL slugs are hyphenated (valentine-s-day, for-wife) but products store
   display names ("Valentine's Day", "For Wife"). Resolve the slug through
   the collections table so multi-word occasions/relationships actually
   match; fall back to the raw value when no such row exists. */
async function displayNameFor(slug) {
  const row = await one('SELECT name FROM collections WHERE slug = ?', [slugify(slug)]);
  return row?.name || slug;
}

/* ================================================================== */
/* PRODUCTS                                                            */
/* ================================================================== */

/* GET /api/products */
const listProducts = asyncHandler(async (req, res) => {
  const {
    category, collection, occasion, relationship, search, featured, bestseller,
    new_arrival, min_price, max_price, sort, status, low_stock,
  } = req.query;
  const page = Math.max(1, toNum(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, toNum(req.query.limit, 20)));
  const admin = req.query.admin === '1';

  const where = [];
  const params = [];

  if (!admin || String(status ?? '1') !== 'all') {
    where.push('p.status = ?');
    params.push(toNum(status, 1));
  }
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (collection) {
    where.push('col.slug = ?');
    params.push(collection);
  }
  if (occasion) {
    where.push('(col.slug = ? OR p.occasion = ?)');
    params.push(slugify(occasion), await displayNameFor(occasion));
  }
  if (relationship) {
    where.push('(col.slug = ? OR p.relationship = ?)');
    params.push(slugify(relationship), await displayNameFor(relationship));
  }
  if (featured !== undefined) { where.push('p.featured = ?'); params.push(toNum(featured)); }
  if (bestseller !== undefined) { where.push('p.bestseller = ?'); params.push(toNum(bestseller)); }
  if (new_arrival !== undefined) { where.push('p.new_arrival = ?'); params.push(toNum(new_arrival)); }
  if (min_price) { where.push('p.selling_price >= ?'); params.push(toNum(min_price)); }
  if (max_price) { where.push('p.selling_price <= ?'); params.push(toNum(max_price)); }
  if (low_stock === '1') { where.push('p.stock <= 10'); }
  if (search) {
    where.push('(p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR c.name LIKE ? OR col.name LIKE ? OR p.occasion LIKE ? OR p.relationship LIKE ?)');
    const like = `%${String(search).trim()}%`;
    params.push(like, like, like, like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortMap = {
    newest: 'p.created_at DESC',
    price_asc: 'p.selling_price ASC',
    price_desc: 'p.selling_price DESC',
    discount: 'p.discount_percentage DESC',
    popular: 'p.review_count DESC',
    rating: 'p.rating DESC',
    name: 'p.name ASC',
  };
  const orderSql = sortMap[sort] || 'p.featured DESC, p.id DESC';

  const countRow = await one(
    `SELECT COUNT(*) total FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN collections col ON col.id = p.collection_id
     ${whereSql}`,
    params
  );

  const rows = await query(
    `SELECT p.*, c.name category_name, c.slug category_slug,
            col.name collection_name, col.slug collection_slug, col.type collection_type,
            (SELECT image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) image,
            (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) image_count
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN collections col ON col.id = p.collection_id
     ${whereSql}
     ORDER BY ${orderSql}
     LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  res.json({
    success: true,
    products: rows,
    total: countRow.total,
    page,
    pages: Math.ceil(countRow.total / limit),
  });
});

/* GET /api/products/:id  (id or slug) */
const getProduct = asyncHandler(async (req, res) => {
  const key = req.params.id;
  const numeric = /^\d+$/.test(key);
  const product = await one(
    `SELECT p.*, c.name category_name, c.slug category_slug,
            col.name collection_name, col.slug collection_slug, col.type collection_type
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN collections col ON col.id = p.collection_id
     WHERE ${numeric ? 'p.id = ?' : 'p.slug = ?'}`,
    [key]
  );
  if (!product) throw httpError(404, 'Product not found');

  const images = await query('SELECT image FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [product.id]);
  const reviews = await query(
    `SELECT id, customer_name, rating, title, comment, product_purchased, review_date, created_at
     FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC`,
    [product.id]
  );
  const related = await query(
    `SELECT p.id, p.name, p.slug, p.original_price, p.selling_price, p.discount_percentage, p.stock, p.rating, p.review_count,
            (SELECT image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) image
     FROM products p
     WHERE p.status = 1 AND p.id <> ? AND (p.category_id = ? OR p.collection_id = ? OR p.occasion = ?)
     ORDER BY p.featured DESC, p.bestseller DESC, RAND()
     LIMIT 8`,
    [product.id, product.category_id || 0, product.collection_id || 0, product.occasion || '']
  );

  res.json({ success: true, product, images: images.map((i) => i.image), reviews, related });
});

/* POST /api/products (admin) */
const createProduct = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) throw httpError(400, 'Product name is required');

  const original = toNum(b.original_price, 0);
  const selling = toNum(b.selling_price, 0);
  if (selling <= 0) throw httpError(400, 'Selling price must be greater than 0');
  const discountAmount = Math.max(0, original - selling);
  const discountPct = original > 0 ? Math.round((discountAmount / original) * 100) : 0;

  const slug = await uniqueSlug('products', b.name);
  const r = await query(
    `INSERT INTO products (name, slug, description, category_id, collection_id, occasion, relationship, subcategory,
       original_price, selling_price, discount_amount, discount_percentage, stock, sku, brand, tags, video,
       featured, bestseller, new_arrival, status, rating, review_count)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)`,
    [
      String(b.name).trim(), slug, b.description || '', numOrNull(b.category_id), numOrNull(b.collection_id),
      b.occasion || null, b.relationship || null, b.subcategory || null,
      original, selling, discountAmount, discountPct, toNum(b.stock, 0),
      b.sku || null, b.brand || 'Ooha Gifts', b.tags || null, b.video || null,
      toNum(b.featured), toNum(b.bestseller), toNum(b.new_arrival), toNum(b.status, 1),
    ]
  );
  const productId = r.insertId;
  await saveImages(productId, b, req);
  res.status(201).json({ success: true, id: productId, slug, message: 'Product created' });
});

/* PUT /api/products/:id (admin) */
const updateProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing) throw httpError(404, 'Product not found');
  const b = req.body || {};

  const original = toNum(b.original_price, existing.original_price);
  const selling = toNum(b.selling_price, existing.selling_price);
  if (selling <= 0) throw httpError(400, 'Selling price must be greater than 0');
  const discountAmount = Math.max(0, original - selling);
  const discountPct = original > 0 ? Math.round((discountAmount / original) * 100) : 0;

  const slug = b.name && String(b.name).trim() !== existing.name
    ? await uniqueSlug('products', b.name, id)
    : existing.slug;

  await query(
    `UPDATE products SET name=?, slug=?, description=?, category_id=?, collection_id=?, occasion=?, relationship=?,
       subcategory=?, original_price=?, selling_price=?, discount_amount=?, discount_percentage=?, stock=?, sku=?,
       brand=?, tags=?, video=?, featured=?, bestseller=?, new_arrival=?, status=? WHERE id=?`,
    [
      b.name !== undefined ? String(b.name).trim() : existing.name, slug,
      b.description !== undefined ? b.description : existing.description,
      b.category_id !== undefined ? numOrNull(b.category_id) : existing.category_id,
      b.collection_id !== undefined ? numOrNull(b.collection_id) : existing.collection_id,
      b.occasion !== undefined ? b.occasion || null : existing.occasion,
      b.relationship !== undefined ? b.relationship || null : existing.relationship,
      b.subcategory !== undefined ? b.subcategory || null : existing.subcategory,
      original, selling, discountAmount, discountPct,
      b.stock !== undefined ? toNum(b.stock, 0) : existing.stock,
      b.sku !== undefined ? b.sku || null : existing.sku,
      b.brand !== undefined ? b.brand || 'Ooha Gifts' : existing.brand,
      b.tags !== undefined ? b.tags || null : existing.tags,
      b.video !== undefined ? b.video || null : existing.video,
      b.featured !== undefined ? toNum(b.featured) : existing.featured,
      b.bestseller !== undefined ? toNum(b.bestseller) : existing.bestseller,
      b.new_arrival !== undefined ? toNum(b.new_arrival) : existing.new_arrival,
      b.status !== undefined ? toNum(b.status) : existing.status,
      id,
    ]
  );
  if (b.images || req.files?.length) await saveImages(id, b, req, true);
  res.json({ success: true, message: 'Product updated' });
});

async function saveImages(productId, body, req, replace = false) {
  let urls = [];
  if (req.files?.length) {
    urls = req.files.map((f) => `/uploads/${f.filename}`);
  } else if (body.images) {
    try {
      const parsed = JSON.parse(body.images);
      if (Array.isArray(parsed)) urls = parsed;
    } catch {
      urls = String(body.images).split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!urls.length) return;
  if (replace) await query('DELETE FROM product_images WHERE product_id = ?', [productId]);
  let i = replace ? 0 : (await one('SELECT COALESCE(MAX(sort_order),-1) m FROM product_images WHERE product_id = ?', [productId])).m + 1;
  for (const u of urls) {
    // eslint-disable-next-line no-await-in-loop
    await query('INSERT INTO product_images (product_id, image, sort_order) VALUES (?,?,?)', [productId, u, i]);
    i += 1;
  }
}

const numOrNull = (v) => (v === undefined || v === null || v === '' || Number(v) === 0 ? null : Number(v));

/* DELETE /api/products/:id (admin) */
const deleteProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one('SELECT id FROM products WHERE id = ?', [id]);
  if (!existing) throw httpError(404, 'Product not found');
  await query('DELETE FROM product_images WHERE product_id = ?', [id]);
  await query('DELETE FROM wishlists WHERE product_id = ?', [id]);
  await query('DELETE FROM cart_items WHERE product_id = ?', [id]);
  await query('DELETE FROM products WHERE id = ?', [id]);
  res.json({ success: true, message: 'Product deleted' });
});

/* POST /api/products/:id/duplicate (admin) */
const duplicateProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const p = await one('SELECT * FROM products WHERE id = ?', [id]);
  if (!p) throw httpError(404, 'Product not found');
  const slug = await uniqueSlug('products', `${p.name} Copy`);
  const r = await query(
    `INSERT INTO products (name, slug, description, category_id, collection_id, occasion, relationship, subcategory,
       original_price, selling_price, discount_amount, discount_percentage, stock, sku, brand, tags, video,
       featured, bestseller, new_arrival, status, rating, review_count)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)`,
    [
      `${p.name} (Copy)`, slug, p.description, p.category_id, p.collection_id, p.occasion, p.relationship, p.subcategory,
      p.original_price, p.selling_price, p.discount_amount, p.discount_percentage, p.stock,
      `${p.sku || 'OG'}-COPY`, p.brand, p.tags, p.video,
      p.featured, p.bestseller, p.new_arrival, 0,
    ]
  );
  await saveImages(r.insertId, { images: JSON.stringify((await query('SELECT image FROM product_images WHERE product_id = ?', [id])).map((x) => x.image)) }, {});
  res.status(201).json({ success: true, id: r.insertId, message: 'Product duplicated as draft' });
});

/* ================================================================== */
/* CATEGORIES                                                          */
/* ================================================================== */

const listCategories = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 1) product_count
     FROM categories c ORDER BY c.sort_order, c.name`
  );
  res.json({ success: true, categories: rows });
});

const createCategory = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name?.trim()) throw httpError(400, 'Category name is required');
  const slug = await uniqueSlug('categories', b.name);
  const r = await query(
    'INSERT INTO categories (name, slug, description, image, icon, sort_order, status) VALUES (?,?,?,?,?,?,?)',
    [b.name.trim(), slug, b.description || null, b.image || null, b.icon || null, toNum(b.sort_order), toNum(b.status, 1)]
  );
  res.status(201).json({ success: true, id: r.insertId, slug, message: 'Category created' });
});

const updateCategory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one('SELECT * FROM categories WHERE id = ?', [id]);
  if (!existing) throw httpError(404, 'Category not found');
  const b = req.body || {};
  const slug = b.name && b.name.trim() !== existing.name ? await uniqueSlug('categories', b.name, id) : existing.slug;
  await query(
    'UPDATE categories SET name=?, slug=?, description=?, image=?, icon=?, sort_order=?, status=? WHERE id=?',
    [
      b.name !== undefined ? b.name.trim() : existing.name, slug,
      b.description !== undefined ? b.description || null : existing.description,
      b.image !== undefined ? b.image || null : existing.image,
      b.icon !== undefined ? b.icon || null : existing.icon,
      b.sort_order !== undefined ? toNum(b.sort_order) : existing.sort_order,
      b.status !== undefined ? toNum(b.status) : existing.status,
      id,
    ]
  );
  res.json({ success: true, message: 'Category updated' });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await query('UPDATE products SET category_id = NULL WHERE category_id = ?', [id]);
  await query('DELETE FROM categories WHERE id = ?', [id]);
  res.json({ success: true, message: 'Category deleted' });
});

/* ================================================================== */
/* COLLECTIONS                                                         */
/* ================================================================== */

const listCollections = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const params = [];
  let sql = `SELECT col.*, (SELECT COUNT(*) FROM products p WHERE p.collection_id = col.id AND p.status = 1) product_count
             FROM collections col`;
  if (type) { sql += ' WHERE col.type = ?'; params.push(type); }
  sql += ' ORDER BY col.type, col.sort_order, col.name';
  res.json({ success: true, collections: await query(sql, params) });
});

const createCollection = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name?.trim()) throw httpError(400, 'Collection name is required');
  const slug = await uniqueSlug('collections', b.name);
  const r = await query(
    'INSERT INTO collections (name, slug, type, description, image, sort_order, status) VALUES (?,?,?,?,?,?,?)',
    [b.name.trim(), slug, b.type || 'collection', b.description || null, b.image || null, toNum(b.sort_order), toNum(b.status, 1)]
  );
  res.status(201).json({ success: true, id: r.insertId, slug, message: 'Collection created' });
});

const updateCollection = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one('SELECT * FROM collections WHERE id = ?', [id]);
  if (!existing) throw httpError(404, 'Collection not found');
  const b = req.body || {};
  const slug = b.name && b.name.trim() !== existing.name ? await uniqueSlug('collections', b.name, id) : existing.slug;
  await query(
    'UPDATE collections SET name=?, slug=?, type=?, description=?, image=?, sort_order=?, status=? WHERE id=?',
    [
      b.name !== undefined ? b.name.trim() : existing.name, slug,
      b.type !== undefined ? b.type : existing.type,
      b.description !== undefined ? b.description || null : existing.description,
      b.image !== undefined ? b.image || null : existing.image,
      b.sort_order !== undefined ? toNum(b.sort_order) : existing.sort_order,
      b.status !== undefined ? toNum(b.status) : existing.status,
      id,
    ]
  );
  res.json({ success: true, message: 'Collection updated' });
});

const deleteCollection = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await query('UPDATE products SET collection_id = NULL WHERE collection_id = ?', [id]);
  await query('DELETE FROM collections WHERE id = ?', [id]);
  res.json({ success: true, message: 'Collection deleted' });
});

/* ================================================================== */
/* SEARCH SUGGESTIONS                                                  */
/* ================================================================== */

const search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ success: true, products: [], categories: [], collections: [] });
  const like = `%${q}%`;

  const products = await query(
    `SELECT p.id, p.name, p.slug, p.selling_price, p.original_price, p.discount_percentage,
            (SELECT image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) image
     FROM products p WHERE p.status = 1 AND (p.name LIKE ? OR p.tags LIKE ? OR p.description LIKE ?)
     ORDER BY p.bestseller DESC, p.featured DESC, p.id DESC LIMIT 8`,
    [like, like, like]
  );
  const categories = await query('SELECT name, slug FROM categories WHERE name LIKE ? AND status = 1 LIMIT 5', [like]);
  const collections = await query('SELECT name, slug, type FROM collections WHERE (name LIKE ? OR description LIKE ?) AND status = 1 LIMIT 5', [like, like]);

  res.json({ success: true, products, categories, collections });
});

module.exports = {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct, duplicateProduct,
  listCategories, createCategory, updateCategory, deleteCategory,
  listCollections, createCollection, updateCollection, deleteCollection,
  search, slugify,
};
