/**
 * Ooha Gifts — database initialiser.
 * Creates the `ooha_gifts` schema, all tables, and rich seed data so the
 * storefront and admin dashboard are fully populated on first run.
 *
 *   npm run setup
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'ooha_gifts';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let conn;

async function exec(sql, params) {
  await conn.query(sql, params);
}

async function insert(table, row) {
  const keys = Object.keys(row);
  const sql = `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')})
               VALUES (${keys.map(() => '?').join(', ')})`;
  const [res] = await conn.query(sql, keys.map((k) => row[k]));
  return res.insertId;
}

const now = () => new Date();

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(30) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(40) DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(30) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description VARCHAR(500) DEFAULT NULL,
  image VARCHAR(500) DEFAULT NULL,
  icon VARCHAR(60) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL DEFAULT 'collection', -- occasion | relationship | collection
  description VARCHAR(500) DEFAULT NULL,
  image VARCHAR(500) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description TEXT,
  category_id INT DEFAULT NULL,
  collection_id INT DEFAULT NULL,
  occasion VARCHAR(80) DEFAULT NULL,
  relationship VARCHAR(80) DEFAULT NULL,
  subcategory VARCHAR(120) DEFAULT NULL,
  original_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  sku VARCHAR(80) DEFAULT NULL,
  brand VARCHAR(120) DEFAULT 'Ooha Gifts',
  tags VARCHAR(400) DEFAULT NULL,
  video VARCHAR(500) DEFAULT NULL,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  featured TINYINT DEFAULT 0,
  bestseller TINYINT DEFAULT 0,
  new_arrival TINYINT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_category (category_id),
  KEY idx_collection (collection_id),
  KEY idx_flags (featured, bestseller, new_arrival),
  FULLTEXT KEY ft_search (name, description, tags)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(300) DEFAULT NULL,
  image VARCHAR(500) NOT NULL,
  button_text VARCHAR(80) DEFAULT 'SHOP NOW',
  button_link VARCHAR(300) DEFAULT '/',
  display_order INT DEFAULT 0,
  active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  video_url VARCHAR(600) NOT NULL,
  thumbnail VARCHAR(500) DEFAULT NULL,
  active TINYINT DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT DEFAULT NULL,
  order_id INT DEFAULT NULL,
  user_id INT DEFAULT NULL,
  customer_name VARCHAR(120) NOT NULL,
  rating TINYINT NOT NULL DEFAULT 5,
  title VARCHAR(200) DEFAULT NULL,
  comment TEXT,
  product_purchased VARCHAR(200) DEFAULT NULL,
  review_date DATE DEFAULT NULL,
  status ENUM('pending','approved','hidden') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wishlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(12) NOT NULL,
  is_default TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_code VARCHAR(40) DEFAULT NULL,
  payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  payment_method VARCHAR(40) DEFAULT NULL,
  order_status ENUM('Pending','Confirmed','Packed','Shipped','Out for Delivery','Delivered','Cancelled') DEFAULT 'Pending',
  shipping_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_image VARCHAR(500) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  payment_id VARCHAR(120) DEFAULT NULL,
  order_reference VARCHAR(160) DEFAULT NULL,
  gateway VARCHAR(30) DEFAULT 'razorpay',
  method VARCHAR(40) DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  status ENUM('created','paid','failed','refunded') DEFAULT 'created',
  signature VARCHAR(300) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  discount_type ENUM('percent','flat') DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_order DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2) DEFAULT NULL,
  active TINYINT DEFAULT 1,
  expires_at DATE DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  \`key\` VARCHAR(120) NOT NULL UNIQUE,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(30) NOT NULL,
  default_message VARCHAR(500) DEFAULT 'Hello Ooha Gifts, I would like to know more about your gifts.',
  enabled TINYINT DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

async function seed() {
  /* ---------------- admins & demo user ---------------- */
  const adminPass = await bcrypt.hash('admin123', 10);
  const userPass = await bcrypt.hash('demo123', 10);

  const adminId = await insert('admins', {
    name: 'Ooha Admin',
    email: 'admin@oohagifts.com',
    phone: '9876543210',
    password: adminPass,
    role: 'superadmin',
  });

  const userId = await insert('users', {
    name: 'Aarav Sharma',
    email: 'demo@oohagifts.com',
    phone: '9812345678',
    password: userPass,
  });

  await insert('addresses', {
    user_id: userId,
    full_name: 'Aarav Sharma',
    phone: '9812345678',
    line1: '24, Rose Villa, MG Road',
    line2: 'Near City Mall',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    is_default: 1,
  });

  /* ---------------- categories ---------------- */
  const categories = [
    ['Puzzles', 'Personalised puzzles printed with your favourite photos and messages.', 'images/categories/puzzles.svg', 'Puzzle'],
    ['Mugs', 'Photo mugs, name mugs and couples mugs that brighten every morning.', 'images/categories/mugs.svg', 'Coffee'],
    ['License Plates', 'Custom number-plate gifts for bikes, cars and desks.', 'images/categories/license-plates.svg', 'Car'],
    ['Frames', 'Engraved and photo frames that freeze your sweetest moments.', 'images/categories/frames.svg', 'Frame'],
    ['Engravings', 'Laser engraved keepsakes on wood, metal and acrylic.', 'images/categories/engravings.svg', 'PenTool'],
    ['Calendars', 'Customised calendars filled with your year of memories.', 'images/categories/calendars.svg', 'Calendar'],
    ['Long Distance', 'Care packages made for hearts that live cities apart.', 'images/categories/long-distance.svg', 'MapPin'],
    ['Gift Hampers', 'Curated hampers with treats, keepsakes and handwritten notes.', 'images/categories/gift-hampers.svg', 'Package'],
    ['Customized Name Gifts', 'Gifts engraved and printed with that special name.', 'images/categories/name-gifts.svg', 'Type'],
  ];
  const catIds = {};
  for (let i = 0; i < categories.length; i++) {
    const [name, description, image, icon] = categories[i];
    catIds[name] = await insert('categories', {
      name,
      slug: slugify(name),
      description,
      image,
      icon,
      sort_order: i,
      status: 1,
    });
  }

  /* ---------------- collections ---------------- */
  const occasions = [
    ['Birthday', 'Cake, candles and gifts that make their day unforgettable.'],
    ['Anniversary', 'Celebrate another year of togetherness with love.'],
    ["Love", 'Romantic gifts that say what words cannot.'],
    ["Valentine's Day", 'The most romantic day deserves the perfect gift.'],
    ["Women's Day", 'Celebrate the incredible women in your life.'],
    ['Housewarming', 'Warm new homes with thoughtful gestures.'],
    ['Farewell', 'Sentimental keepsakes for beautiful goodbyes.'],
    ['Make Them Smile', 'Little surprises with big happiness.'],
    ['Special Moments', 'Mark milestones with meaningful gifts.'],
  ];
  const relationships = [
    ['For Her', 'Elegant gifts curated for her.'],
    ['For Him', 'Thoughtful picks he will actually love.'],
    ['For Wife', 'Romantic surprises for your better half.'],
    ['For Husband', 'Make him feel truly special.'],
    ['For Girlfriend', 'Cute, romantic and totally her style.'],
    ['For Boyfriend', 'Cool gifts he will brag about.'],
    ['For Mother', 'Love wrapped as a gift for maa.'],
    ['For Father', 'For the man who gave you everything.'],
    ['For Sister', 'Celebrating your built-in best friend.'],
    ['For Brother', 'Gifts for your first hero.'],
    ['For Best Friend', 'For the one who is family by choice.'],
    ['For Couples', 'Matching gifts for two hearts, one story.'],
  ];
  const collectionsSeed = [
    ['Love Lab', 'collection', 'Our most romantic picks, all in one place.'],
    ['Corporate', 'collection', 'Premium gifting for teams, clients and partners.'],
    ['New Arrivals', 'collection', 'Fresh drops added every week.'],
    ['Best Sellers', 'collection', 'Gifts India cannot stop ordering.'],
    ['Photo Gifts', 'collection', 'Turn your favourite photos into keepsakes.'],
  ];

  const occIds = {};
  for (let i = 0; i < occasions.length; i++) {
    const [name, description] = occasions[i];
    occIds[name] = await insert('collections', {
      name,
      slug: slugify(name),
      type: 'occasion',
      description,
      image: `images/occasions/${slugify(name)}.svg`,
      sort_order: i,
      status: 1,
    });
  }
  const relIds = {};
  for (let i = 0; i < relationships.length; i++) {
    const [name, description] = relationships[i];
    relIds[name] = await insert('collections', {
      name,
      slug: slugify(name),
      type: 'relationship',
      description,
      image: `images/relationships/${slugify(name)}.svg`,
      sort_order: i,
      status: 1,
    });
  }
  const colIds = {};
  for (let i = 0; i < collectionsSeed.length; i++) {
    const [name, type, description] = collectionsSeed[i];
    colIds[name] = await insert('collections', {
      name,
      slug: slugify(name),
      type,
      description,
      image: `images/collections/${slugify(name)}.svg`,
      sort_order: i,
      status: 1,
    });
  }

  /* ---------------- products ---------------- */
  // [name, category, collection, occasion, relationship, original, selling,
  //  stock, tags, flags, description, art]
  const products = [
    ['Personalized Photo Frame', 'Frames', 'Photo Gifts', 'Birthday', 'For Her', 1199, 799, 48, 'photo frame personalized gift birthday', 'f,b,n',
      'A premium wooden frame engraved with your name and a photo that means the world. Printed on archival paper and finished by hand in our studio.', 'frame'],
    ['Customized Couple Photo Mug', 'Mugs', 'Love Lab', 'Anniversary', 'For Couples', 899, 499, 120, 'mug couples photo anniversary coffee', 'f,b',
      'Ceramic mug printed with your couple photograph — one side, one smile. Dishwasher safe, heart-melting guaranteed.', 'mug'],
    ['Name Puzzle With Photo', 'Puzzles', 'Photo Gifts', 'Birthday', 'For Him', 1499, 999, 35, 'puzzle name kids photo birthday', 'n',
      'A wooden jigsaw that spells their name with a hidden photo underneath. Perfect for kids and the young at heart.', 'puzzle'],
    ['Engraved Wooden Love Letter', 'Engravings', 'Love Lab', "Valentine's Day", 'For Girlfriend', 999, 649, 60, 'engraving wood love letter valentine', 'f',
      'Your words laser-engraved on sustainable sheesham wood. A love letter that never fades.', 'letter'],
    ['Custom Calendar 2026', 'Calendars', 'New Arrivals', 'Special Moments', 'For Wife', 1299, 849, 40, 'calendar custom 2026 memories monthly', 'n',
      'Twelve months of your favourite memories, printed on thick matte pages with a premium spiral bind.', 'calendar'],
    ['License Plate Gift — Custom Number', 'License Plates', 'Best Sellers', 'Make Them Smile', 'For Him', 1099, 699, 55, 'license plate car bike number gift', 'b,f',
      'Acrylic number-plate style desk sign with any name or number. A gift every car lover wants.', 'plate'],
    ['Long Distance Care Package', 'Long Distance', 'Love Lab', 'Special Moments', 'For Boyfriend', 2499, 1799, 22, 'long distance care package hamper love', 'f,b',
      'A box of letters, treats and tiny surprises to close the miles between you.', 'hamper'],
    ['Romantic Gift Hamper For Her', 'Gift Hampers', 'Best Sellers', 'Anniversary', 'For Her', 3499, 2499, 18, 'hamper romantic her anniversary premium', 'f,b',
      'Scented candle, dark chocolates, a rose and a handwritten note — packed in a keepsake box.', 'hamper'],
    ['Heart-Shaped Photo Frame', 'Frames', 'Love Lab', "Valentine's Day", 'For Wife', 1499, 999, 42, 'heart frame photo valentine couple', 'b',
      'A heart-cut frame holding two photos of you. Engraved with your anniversary date.', 'heart'],
    ['Custom Name Neon Lamp', 'Customized Name Gifts', 'New Arrivals', 'Housewarming', 'For Girlfriend', 2999, 1999, 15, 'neon lamp name custom room decor', 'f,n',
      'Warm LED neon sign of their name — the coolest addition to any bedroom or desk.', 'lamp'],
    ['Personalized Music Box', 'Customized Name Gifts', 'Photo Gifts', 'Make Them Smile', 'For Sister', 1899, 1299, 25, 'music box personalized song gift', 'n',
      'A hand-crank music box that plays your chosen song with the message engraved on the lid.', 'music'],
    ['Magnetic Photo Booth Strips', 'Frames', 'Photo Gifts', 'Birthday', 'For Best Friend', 699, 399, 80, 'photo strips magnetic booth birthday', 'b',
      'Four sets of printed photo strips with magnets — stick your memories on the fridge.', 'strips'],
    ['Customized Coffee Mug — Name Edition', 'Mugs', 'Best Sellers', 'Make Them Smile', 'For Father', 799, 399, 150, 'mug name father coffee gift', 'b',
      'Their name, your message, steaming coffee. The everyday gift that feels personal.', 'mug'],
    ['Engraved Keychain — Coordinates', 'Engravings', 'Love Lab', 'Anniversary', 'For Husband', 599, 349, 90, 'keychain engraved coordinates love', 'b',
      'The coordinates of where you met, engraved on brushed steel. Small gift, huge meaning.', 'keychain'],
    ['Couple Matching Puzzle', 'Puzzles', 'Love Lab', 'Anniversary', 'For Couples', 1299, 899, 30, 'puzzle couple matching love', 'n',
      'Two interlocking puzzles — one for each of you. Complete them together, stay together.', 'puzzle'],
    ['Wooden Photo Sliding Puzzle', 'Puzzles', 'Photo Gifts', 'Birthday', 'For Brother', 1199, 749, 38, 'puzzle sliding photo wooden brother', '',
      'Slide the tiles to reveal the photo underneath. A desk toy with a secret.', 'puzzle'],
    ['Anniversary Countdown Clock', 'Engravings', 'Best Sellers', 'Anniversary', 'For Wife', 1999, 1399, 20, 'anniversary clock countdown engraved', 'f',
      'A desk clock engraved with your wedding date that counts every second since.', 'clock'],
    ['Customized Portable Bluetooth Speaker', 'Customized Name Gifts', 'New Arrivals', 'Birthday', 'For Boyfriend', 3499, 2499, 26, 'speaker bluetooth custom name birthday', 'n',
      'A pocket speaker laser-engraved with their initials. Big sound, personal style.', 'speaker'],
    ['Photo Puzzle — 1000 Pieces', 'Puzzles', 'Photo Gifts', 'Special Moments', 'For Her', 1599, 1099, 34, 'puzzle 1000 pieces photo custom', 'f',
      'A thousand-piece challenge made from your favourite photograph.', 'puzzle'],
    ['Love Notes Jar', 'Engravings', 'Love Lab', "Valentine's Day", 'For Girlfriend', 899, 549, 65, 'love notes jar valentine romantic', 'b',
      'Thirty-six folded reasons why you love them, in a jar they can open all year.', 'jar'],
    ['Personalized Table Lamp — Photo', 'Customized Name Gifts', 'Photo Gifts', 'Housewarming', 'For Mother', 2499, 1699, 24, 'lamp photo table mother housewarming', 'f',
      'A wooden lamp that projects their favourite photo when switched on.', 'lamp'],
    ['Custom Caricature Doll', 'Customized Name Gifts', 'Best Sellers', 'Make Them Smile', 'For Best Friend', 1799, 1199, 28, 'caricature doll custom fun friend', 'b',
      'A hand-drawn style figurine of them — hilarious, accurate, unforgettable.', 'doll'],
    ['Rose Gold Jewellery Box', 'Gift Hampers', 'Love Lab', 'Anniversary', 'For Her', 2199, 1499, 19, 'jewellery box rose gold anniversary', 'n',
      'Velvet-lined rose gold box with a hidden compartment for the little things.', 'box'],
    ['Personalized Chocolate Box', 'Gift Hampers', 'Best Sellers', "Valentine's Day", 'For Wife', 1499, 999, 44, 'chocolate box personalized valentine', 'b',
      'Twenty-four assorted chocolates with a printed message on the lid.', 'choco'],
    ['Engraved Wallet Card — I Love You', 'Engravings', 'Love Lab', "Valentine's Day", 'For Husband', 649, 399, 70, 'wallet card engraved husband love', 'b',
      'A stainless card that slides into his wallet with your message engraved.', 'card'],
    ['Mug And Photo Frame Combo', 'Mugs', 'Best Sellers', 'Birthday', 'For Mother', 1999, 1299, 36, 'combo mug frame mother birthday', 'f,b',
      'The perfect pair — a photo mug and a matching engraved frame at one lovely price.', 'combo'],
    ['Custom Wall Calendar — Family', 'Calendars', 'New Arrivals', 'Housewarming', 'For Father', 1499, 999, 32, 'calendar family wall custom housewarming', 'n',
      'A family portrait for every month, printed large on gallery-grade paper.', 'calendar'],
    ['Long Distance Touch Bracelets', 'Long Distance', 'Love Lab', 'Special Moments', 'For Boyfriend', 2999, 2199, 17, 'long distance bracelet couple touch', 'f',
      'Two bracelets that glow when the other is touched. Distance never felt closer.', 'bracelet'],
    ['Message In A Bottle', 'Long Distance', 'Photo Gifts', 'Make Them Smile', 'For Sister', 1099, 699, 47, 'message bottle long distance sister', '',
      'A corked glass bottle holding your letter, rolled and tied with a ribbon.', 'bottle'],
    ['Premium Dry Fruit Hamper', 'Gift Hampers', 'Corporate', 'Special Moments', 'For Father', 2999, 2199, 21, 'dry fruit hamper corporate premium', 'f',
      'An elegant hamper of roasted nuts and dry fruits in a reusable wooden crate.', 'hamper'],
    ['Corporate Logo Engraved Pen Set', 'Engravings', 'Corporate', 'Farewell', 'For Boss', 2499, 1699, 40, 'corporate pen set engraved farewell', '',
      'Two metal pens in a gift box, engraved with a name or company logo.', 'pen'],
    ['Name Lock Pendant', 'Customized Name Gifts', 'Love Lab', 'Special Moments', 'For Girlfriend', 1799, 1199, 33, 'pendant name love gift girlfriend', 'b',
      'A delicate pendant cut into any name, on an adjustable chain.', 'pendant'],
    ['Customized Kids Name Rocking Chair', 'Customized Name Gifts', 'New Arrivals', 'Birthday', 'For Kids', 4499, 3299, 8, 'kids chair name birthday wooden', 'n',
      'A keepsake rocking chair engraved with the little one’s name.', 'chair'],
    ['Photo Blanket — Fleece', 'Frames', 'Photo Gifts', 'Special Moments', 'For Mother', 2999, 1999, 14, 'photo blanket fleece mother memory', 'f',
      'Your collage photo printed on ultra-soft fleece. Warm and emotional.', 'blanket'],
    ['Engraved Bottle Opener', 'Engravings', 'Corporate', 'Farewell', 'For Brother', 499, 299, 85, 'bottle opener engraved brother farewell', '',
      'Solid steel opener engraved with a name, date or inside joke.', 'opener'],
    ['Couples Watch Combo', 'Gift Hampers', 'Best Sellers', 'Anniversary', 'For Couples', 5999, 4299, 10, 'watch combo couples anniversary premium', 'f,b',
      'Matching minimal watches for two wrists that beat as one.', 'watch'],
    ['Customized Caricature T-Shirt', 'Customized Name Gifts', 'Make Them Smile', 'Make Them Smile', 'For Best Friend', 1299, 799, 45, 'tshirt caricature fun friend', '',
      'Their caricature printed on premium cotton. Wearable comedy.', 'shirt'],
    ['Personalized Recipe Board', 'Engravings', 'Photo Gifts', 'Housewarming', 'For Mother', 1899, 1249, 27, 'recipe board kitchen engraved housewarming', 'n',
      'Grandma’s recipe engraved on oak — passed down, never burned.', 'board'],
    ['Flower And Chocolate Combo', 'Gift Hampers', 'Love Lab', "Valentine's Day", 'For Her', 1699, 1099, 50, 'flower chocolate combo valentine rose', 'b',
      'A dozen red roses with a box of Belgian chocolates and a card.', 'flowers'],
    ['Personalized Photo Cube', 'Frames', 'Photo Gifts', 'Birthday', 'For Girlfriend', 1399, 899, 31, 'photo cube gift birthday girlfriend', 'f',
      'A rotating cube holding six photos of your favourite moments.', 'cube'],
    ['Custom Map Poster — Your City', 'Frames', 'New Arrivals', 'Housewarming', 'For Husband', 1599, 1099, 23, 'map poster city housewarming husband', 'n',
      'A minimalist map of the city where your story began, with a pin on your street.', 'map'],
    ['Love Coupon Book', 'Engravings', 'Love Lab', "Valentine's Day", 'For Wife', 599, 349, 95, 'love coupon book wife valentine', 'b',
      'Twelve tear-out coupons for date nights, chores and long hugs.', 'coupon'],
    ['Personalized Baby Moon Lamp', 'Customized Name Gifts', 'New Arrivals', 'Special Moments', 'For Kids', 2299, 1599, 16, 'moon lamp baby name kids', 'n',
      'A 3D-printed moon lamp lit with the baby’s name and birth date.', 'moon'],
    ['Diwali Premium Gift Hamper', 'Gift Hampers', 'Corporate', 'Special Moments', 'For Father', 3999, 2999, 12, 'diwali hamper corporate premium festive', 'f',
      'Sweets, dry fruits, a diya set and a candle — festive gifting, sorted.', 'hamper'],
    ['Thank You Teacher Mug', 'Mugs', 'Best Sellers', 'Farewell', 'For Teacher', 749, 449, 60, 'teacher mug thank you farewell', '',
      'A heartfelt mug for the teacher who changed everything.', 'mug'],
    ['Personalized Wooden Wine Box', 'Gift Hampers', 'Corporate', 'Farewell', 'For Him', 2699, 1899, 18, 'wine box engraved corporate farewell', 'f',
      'A sliding-lid wooden wine box engraved with a name and message.', 'wine'],
  ];

  const productIds = [];
  for (const p of products) {
    const [name, cat, col, occ, rel, orig, sell, stock, tags, flags, desc, art] = p;
    const disc = orig - sell;
    const pct = Math.round((disc / orig) * 100);
    const id = await insert('products', {
      name,
      slug: slugify(name),
      description: desc,
      category_id: catIds[cat] || null,
      collection_id: colIds[col] || occIds[col] || relIds[col] || null,
      occasion: occ,
      relationship: rel,
      original_price: orig,
      selling_price: sell,
      discount_amount: disc,
      discount_percentage: pct,
      stock,
      sku: 'OG-' + String(1000 + productIds.length + 1),
      tags,
      featured: flags.includes('f') ? 1 : 0,
      bestseller: flags.includes('b') ? 1 : 0,
      new_arrival: flags.includes('n') ? 1 : 0,
      status: 1,
      rating: (4 + Math.random() * 0.9).toFixed(2),
      review_count: 12 + Math.floor(Math.random() * 180),
    });
    productIds.push(id);

    const imgFile = `images/products/${slugify(name)}.svg`;
    await insert('product_images', { product_id: id, image: imgFile, sort_order: 0 });
    // gallery: two extra art variations
    await insert('product_images', { product_id: id, image: `images/products/${slugify(name)}-alt1.svg`, sort_order: 1 });
    await insert('product_images', { product_id: id, image: `images/products/${slugify(name)}-alt2.svg`, sort_order: 2 });
  }

  /* ---------------- banners ---------------- */
  const banners = [
    ['Make Every Moment Meaningful', 'Thoughtful gifts, handcrafted with love and delivered across India.', 'images/banners/banner-1.svg', 'SHOP NOW', '/', 0],
    ['Thoughtful Gifts. Beautiful Memories.', 'Personalised hampers, frames and keepsakes for every relationship.', 'images/banners/banner-2.svg', 'EXPLORE COLLECTION', '/collection/best-sellers', 1],
    ['Celebrate Love, Every Single Day', 'Romantic picks from our Love Lab — made for two hearts.', 'images/banners/banner-3.svg', 'ENTER LOVE LAB', '/collection/love-lab', 2],
    ['Gifting Season Is Here', 'Up to 40% off on premium hampers and personalized gifts.', 'images/banners/banner-4.svg', 'GRAB OFFERS', '/offers', 3],
    ['Made Just For Them', 'Name lamps, engraved keepsakes and photo magic.', 'images/banners/banner-5.svg', 'CUSTOMIZE NOW', '/category/customized-name-gifts', 4],
  ];
  for (const b of banners) {
    await insert('banners', {
      title: b[0], subtitle: b[1], image: b[2], button_text: b[3], button_link: b[4], display_order: b[5], active: 1,
    });
  }

  /* ---------------- videos ---------------- */
  const videos = [
    ['Unboxing our Love Lab hamper', 'Watch the moment she opened it ❤️', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'images/videos/poster-1.svg'],
    ['How we engrave your message', 'Behind the scenes in our workshop 🔨', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'images/videos/poster-2.svg'],
    ['Personalised mug printing process', 'From photo to mug in 60 seconds ☕', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'images/videos/poster-3.svg'],
    ['Birthday surprise for a best friend', 'She had no idea 🎁', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'images/videos/poster-4.svg'],
    ['Anniversary gift that made them cry', 'Warning: tissues required 💍', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'images/videos/poster-5.svg'],
    ['Packing orders with love', 'Every box is a little story 📦', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'images/videos/poster-6.svg'],
  ];
  for (let i = 0; i < videos.length; i++) {
    await insert('videos', {
      title: videos[i][0],
      description: videos[i][1],
      video_url: videos[i][2],
      thumbnail: videos[i][3],
      active: 1,
      display_order: i,
    });
  }

  /* ---------------- reviews ---------------- */
  const reviews = [
    ['Priya Mehta', 5, 'Perfect anniversary gift', 'The engraved clock is stunning. My husband literally kept it on his desk the whole day. Packaging was premium too!', 'Anniversary Countdown Clock', 'approved'],
    ['Rahul Verma', 5, 'Exactly as shown', 'Ordered the couple mug for my wife’s birthday. Print quality is sharp and the delivery was two days early.', 'Customized Couple Photo Mug', 'approved'],
    ['Sneha Iyer', 4, 'Beautiful hamper', 'The romantic hamper looked lovely. Would have loved a handwritten note option, otherwise perfect.', 'Romantic Gift Hamper For Her', 'approved'],
    ['Arjun Nair', 5, 'Long distance lifesaver', 'My girlfriend cried when the care package arrived. The letters were so personal. 10/10.', 'Long Distance Care Package', 'approved'],
    ['Kavya Reddy', 5, 'Best photo frame ever', 'The wood quality is premium and the engraving is crisp. It instantly became the centrepiece of our living room.', 'Personalized Photo Frame', 'approved'],
    ['Dev Patel', 4, 'Great for corporate', 'We ordered 40 pen sets for our team farewell. Everyone loved them. Bulk pricing was fair too.', 'Corporate Logo Engraved Pen Set', 'approved'],
    ['Ananya Singh', 5, 'So romantic!', 'The love notes jar is the cutest thing ever. Each note made me smile. Great quality paper.', 'Love Notes Jar', 'approved'],
    ['Rohan Gupta', 5, 'Fast delivery', 'Neon lamp arrived safely and the brightness is perfect. Setting it up took a minute.', 'Custom Name Neon Lamp', 'approved'],
    ['Meera Joshi', 4, 'Loved the calendar', 'Our family calendar turned out beautiful. Pages are thick and the printing is vibrant.', 'Custom Calendar 2026', 'pending'],
    ['Karan Malhotra', 5, 'Worth every rupee', 'The speaker sounds great and the engraving gives it a luxury feel. Gifted it to my brother.', 'Customized Portable Bluetooth Speaker', 'pending'],
  ];
  const reviewDates = ['2026-09-28', '2026-09-21', '2026-09-15', '2026-09-08', '2026-08-30', '2026-08-22', '2026-08-14', '2026-08-05', '2026-07-27', '2026-07-19'];
  for (let i = 0; i < reviews.length; i++) {
    const [customer_name, rating, title, comment, product_purchased, status] = reviews[i];
    await insert('reviews', {
      product_id: productIds[i % productIds.length],
      user_id: userId,
      customer_name,
      rating,
      title,
      comment,
      product_purchased,
      review_date: reviewDates[i],
      status,
    });
  }

  /* ---------------- coupons ---------------- */
  await insert('coupons', { code: 'WELCOME10', description: '10% off your first order', discount_type: 'percent', discount_value: 10, min_order: 499, max_discount: 300, active: 1, expires_at: '2026-12-31' });
  await insert('coupons', { code: 'OOHA20', description: '20% off orders above ₹1,499', discount_type: 'percent', discount_value: 20, min_order: 1499, max_discount: 600, active: 1, expires_at: '2026-12-31' });
  await insert('coupons', { code: 'FLAT150', description: 'Flat ₹150 off above ₹999', discount_type: 'flat', discount_value: 150, min_order: 999, active: 1, expires_at: '2026-12-31' });

  /* ---------------- settings ---------------- */
  const settings = {
    site_name: 'OOHA GIFTS',
    tagline: 'Making every moment meaningful.',
    phone: '+91 98765 43210',
    email: 'hello@oohagifts.com',
    address: 'Ooha Studio, 42 Rose Arcade, Pune, Maharashtra 411001',
    instagram: 'https://instagram.com/oohagifts',
    facebook: 'https://facebook.com/oohagifts',
    delivery_charge: '49',
    free_delivery_above: '999',
    whatsapp_number: '919876543210',
    currency: 'INR',
    hero_heading: 'Make Every Moment Meaningful',
    trust_note: 'Secure payments • Fast delivery • Easy returns',
  };
  for (const [key, value] of Object.entries(settings)) {
    await insert('settings', { key, value });
  }

  await insert('whatsapp_settings', {
    phone: process.env.WHATSAPP_NUMBER || '919876543210',
    default_message: 'Hello Ooha Gifts, I am interested in this product.',
    enabled: 1,
  });

  /* ---------------- demo cart, wishlist, orders ---------------- */
  await insert('cart_items', { user_id: userId, product_id: productIds[0], quantity: 1 });
  await insert('cart_items', { user_id: userId, product_id: productIds[1], quantity: 2 });
  await insert('wishlists', { user_id: userId, product_id: productIds[8] });
  await insert('wishlists', { user_id: userId, product_id: productIds[9] });

  const demoOrders = [
    ['OOHA-2609281001', 'Delivered', 'paid', 'UPI', new Date('2026-09-28'), [
      [productIds[0], 1, 799], [productIds[1], 1, 499],
    ]],
    ['OOHA-2610021002', 'Shipped', 'paid', 'Credit Card', new Date('2026-10-02'), [
      [productIds[7], 1, 2499],
    ]],
    ['OOHA-2610051003', 'Pending', 'pending', 'UPI', new Date('2026-10-05'), [
      [productIds[12], 2, 399],
    ]],
  ];
  for (const [order_number, order_status, payment_status, payment_method, created, items] of demoOrders) {
    const total = items.reduce((s, [, qty, price]) => s + qty * price, 0);
    const shipping = total >= 999 ? 0 : 49;
    const orderId = await insert('orders', {
      order_number,
      user_id: userId,
      total_amount: total,
      discount_amount: 0,
      shipping_amount: shipping,
      final_amount: total + shipping,
      payment_status,
      payment_method,
      order_status,
      shipping_address: JSON.stringify({
        full_name: 'Aarav Sharma', phone: '9812345678',
        line1: '24, Rose Villa, MG Road', line2: 'Near City Mall',
        city: 'Pune', state: 'Maharashtra', pincode: '411001',
      }),
      created_at: created,
    });
    for (const [pid, qty, price] of items) {
      const p = await conn.query('SELECT name FROM products WHERE id=?', [pid]);
      await insert('order_items', {
        order_id: orderId, product_id: pid, product_name: p[0][0].name,
        product_image: `images/products/${slugify(p[0][0].name)}.svg`,
        quantity: qty, price, subtotal: qty * price,
      });
    }
    await insert('payments', {
      order_id: orderId, user_id: userId, payment_id: 'pay_demo' + orderId,
      gateway: 'razorpay', method: payment_method, amount: total + shipping,
      status: payment_status === 'paid' ? 'paid' : 'created',
    });
  }

  console.log('✓ Seeded admin  : admin@oohagifts.com / admin123');
  console.log('✓ Seeded customer: demo@oohagifts.com / demo123');
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ------------------------------------------------------------------ */

(async function main() {
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
      charset: 'utf8mb4',
    });

    console.log('→ Connected to MySQL. Initialising database "' + DB_NAME + '" ...');
    await exec(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await exec(`USE \`${DB_NAME}\`;`);
    await exec(SCHEMA);
    console.log('✓ Schema created (' + SCHEMA.split('CREATE TABLE').length + ' tables)');

    const [existing] = await conn.query('SELECT COUNT(*) c FROM products');
    if (existing[0].c > 0) {
      console.log('! Products already exist — skipping seed. Delete the "' + DB_NAME + '" database to re-seed.');
      return;
    }
    await seed();
    console.log('✓ Seed data inserted. Database ready.');
  } catch (err) {
    console.error('✗ Setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
