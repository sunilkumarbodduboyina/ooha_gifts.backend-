/* Ooha Gifts — generates every SVG artwork used by the storefront.
 * Run from backend/:  node setup/assets.js
 */
const { query, pool } = require('../config/db');
const { write, wrap, PALS } = require('./assets/core');
const { art } = require('./assets/art');
const { art2 } = require('./assets/art2');

const ART = { ...art, ...art2 };

function typeFor(p) {
  const s = `${p.name} ${p.category_name || ''} ${p.tags || ''}`.toLowerCase();
  if (/mug/.test(s)) return 'mug';
  if (/puzzle/.test(s)) return 'puzzle';
  if (/calendar/.test(s)) return 'calendar';
  if (/license|plate/.test(s)) return 'plate';
  if (/hamper|care package|chocolate|dry fruit|flower|wine/.test(s)) return 'hamper';
  if (/lamp|neon|moon/.test(s)) return 'lamp';
  if (/keychain|wallet card|opener|pen |recipe board|clock|engraved/.test(s)) return 'keychain';
  if (/letter|notes jar|coupon|message in a bottle/.test(s)) return 'letter';
  if (/pendant|jewellery/.test(s)) return 'pendant';
  if (/watch/.test(s)) return 'watch';
  if (/speaker/.test(s)) return 'speaker';
  if (/music box/.test(s)) return 'music';
  if (/bracelet/.test(s)) return 'bracelet';
  if (/bottle/.test(s)) return 'bottle';
  if (/caricature/.test(s)) return 'doll';
  if (/combo/.test(s)) return 'combo';
  if (/map/.test(s)) return 'map';
  if (/heart/.test(s)) return 'heart';
  if (/frame|blanket|strips|cube|poster|photo/.test(s)) return 'frame';
  return 'giftbox';
}

function objectSvg(type, variant = 0) {
  const fn = ART[type] || ART.giftbox;
  const inner = fn();
  return variant === 0 ? inner : inner.replace(/translate\(400 400\)/g, `translate(400 400) rotate(${[0, -6, 5][variant]})`);
}

async function main() {
  const products = await query(
    `SELECT p.id, p.name, p.slug, c.name category_name, p.tags
     FROM products p LEFT JOIN categories c ON c.id = p.category_id`
  );
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    const type = typeFor(p);
    const base = i % PALS.length;
    write(`products/${p.slug}.svg`, wrap(800, 800, PALS[base][0], PALS[base][1], objectSvg(type, 0)));
    write(`products/${p.slug}-alt1.svg`, wrap(800, 800, PALS[(base + 3) % PALS.length][0], PALS[(base + 3) % PALS.length][1], objectSvg(type, 1)));
    write(`products/${p.slug}-alt2.svg`, wrap(800, 800, PALS[(base + 5) % PALS.length][0], PALS[(base + 5) % PALS.length][1], objectSvg(type, 2)));
  }
  console.log(`✓ ${products.length * 3} product images`);

  const cats = await query('SELECT id, slug, icon, name FROM categories');
  const iconMap = { Coffee: 'mug', Car: 'plate', Frame: 'frame', PenTool: 'keychain', Calendar: 'calendar', MapPin: 'bottle', Package: 'hamper', Type: 'giftbox', Puzzle: 'puzzle' };
  cats.forEach((c, i) => {
    write(`categories/${c.slug}.svg`, wrap(640, 640, PALS[i % PALS.length][0], PALS[i % PALS.length][1], objectSvg(iconMap[c.icon] || 'giftbox')));
  });
  console.log(`✓ ${cats.length} category images`);

  const cols = await query('SELECT slug, type, name FROM collections');
  cols.forEach((c, i) => {
    const s = c.name.toLowerCase();
    let t = 'giftbox';
    if (/love|valentine|her|girlfriend|wife/.test(s)) t = 'heart';
    else if (/birthday|smile|kid/.test(s)) t = 'giftbox';
    else if (/anniversary|couple/.test(s)) t = 'watch';
    else if (/mother|father|family|housewarm/.test(s)) t = 'frame';
    else if (/photo/.test(s)) t = 'frame';
    else if (/corporate|farewell|business/.test(s)) t = 'letter';
    else if (/him|boyfriend|brother|best friend/.test(s)) t = 'speaker';
    else if (/sister|women/.test(s)) t = 'pendant';
    const dir = c.type === 'occasion' ? 'occasions' : c.type === 'relationship' ? 'relationships' : 'collections';
    write(`${dir}/${c.slug}.svg`, wrap(640, 640, PALS[(i + 2) % PALS.length][0], PALS[(i + 2) % PALS.length][1], objectSvg(t)));
  });
  console.log(`✓ ${cols.length} collection images`);

  const banners = await query('SELECT id FROM banners ORDER BY display_order, id');
  banners.forEach((b, i) => {
    const p1 = ['#3d1526', '#7d2141', '#2b1b3d', '#5a1a33', '#402033'][i % 5];
    const p2 = ['#b23a5e', '#d9628a', '#8a4bb5', '#c2557e', '#b8628f'][i % 5];
    const decor = `
      <circle cx="${1150 + i * 40}" cy="140" r="220" fill="rgba(255,255,255,0.10)"/>
      <circle cx="${1350 - i * 30}" cy="520" r="300" fill="rgba(217,164,65,0.22)"/>
      <circle cx="${1120}" cy="470" r="120" fill="rgba(255,255,255,0.12)"/>
      <circle cx="${640 + i * 60}" cy="620" r="90" fill="rgba(255,255,255,0.07)"/>
      ${objectSvg(['giftbox', 'heart', 'mug', 'hamper', 'frame'][i % 5]).replace(/translate\(400 400\)/g, 'translate(1230 360) scale(0.62)')}
      <g fill="rgba(255,255,255,0.55)">
        <circle cx="${300 + i * 70}" cy="120" r="7"/><circle cx="${420 + i * 40}" cy="200" r="5"/>
        <circle cx="${860 - i * 30}" cy="90" r="6"/><circle cx="${980}" cy="640" r="7"/>
      </g>
      <path d="M${240 + i * 50} 560 q40 -60 80 0" stroke="rgba(217,164,65,0.6)" stroke-width="6" fill="none"/>`;
    write(`banners/banner-${b.id}.svg`, wrap(1600, 720, p1, p2, decor));
  });
  console.log(`✓ ${banners.length} banners`);

  for (let i = 1; i <= 6; i += 1) {
    const pal = PALS[i % PALS.length];
    const play = `<g transform="translate(320 320)">
      <circle r="74" fill="rgba(255,255,255,0.85)"/>
      <path d="M-24 -40 L44 0 L-24 40 Z" fill="#b23a5e"/>
    </g>`;
    write(`videos/poster-${i}.svg`, wrap(640, 640, pal[0], pal[1], `${objectSvg(['hamper', 'keychain', 'mug', 'giftbox', 'heart', 'frame'][(i - 1) % 6]).replace('translate(400 400)', 'translate(320 250) scale(0.6)')}${play}`));
  }
  console.log('✓ 6 video posters');

  const extras = [
    ['collections/love-lab-banner.svg', 'heart', '#3d1526', '#b23a5e'],
    ['placeholder.svg', 'giftbox', '#f8efe2', '#ffd6e0'],
  ];
  extras.forEach(([file, t, a, b]) => write(file, wrap(800, 800, a, b, objectSvg(t))));
  console.log('✓ done — assets written to frontend/public/images');
  await pool.end();
}

main().catch(async (e) => {
  console.error('✗ asset generation failed:', e.message);
  process.exit(1);
});
