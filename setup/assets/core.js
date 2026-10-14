/* Ooha Gifts — SVG asset generator (part 1: helpers + palettes). */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'frontend', 'public', 'images');

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const PALS = [
  ['#fff2f4', '#ffd6e0'], ['#f8efe2', '#ffe6bf'], ['#eef3ff', '#dde7ff'],
  ['#f0fbf3', '#d8f5e3'], ['#fdf5ff', '#f6e2ff'], ['#fff7ed', '#ffe3c7'],
  ['#f4f0ff', '#e6ddff'], ['#fff0f6', '#ffd9ec'],
];

const C = { rose: '#b23a5e', deep: '#7d2141', gold: '#d9a441', ink: '#2c2126', cream: '#fffaf3', white: '#ffffff' };

function wrap(w, h, bg0, bg1, inner) {
  const id = 'g' + Math.abs(hash(bg0 + bg1 + w)).toString(36);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${bg0}"/><stop offset="1" stop-color="${bg1}"/>
</linearGradient>
<radialGradient id="${id}s" cx="0.5" cy="0.92" r="0.5">
<stop offset="0" stop-color="rgba(44,33,38,0.20)"/><stop offset="1" stop-color="rgba(44,33,38,0)"/>
</radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#${id})"/>
${inner}
</svg>`;
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

module.exports = { write, wrap, PALS, C, hash, OUT };
