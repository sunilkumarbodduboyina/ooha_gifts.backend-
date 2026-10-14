/* Ooha Gifts — SVG artwork library (part 2b): remaining objects. */
const { C } = require('./core');
const { svgWrap, shadow } = require('./art');

const art2 = {};

art2.hamper = () => svgWrap(`${shadow(400, 645, 215)}
<g transform="translate(400 400)">
<path d="M-190 -40 h380 l-40 200 a24 24 0 0 1 -24 20 h-252 a24 24 0 0 1 -24 -20 Z" fill="#c98a4b"/>
<path d="M-190 -40 h380 l-12 60 h-356 Z" fill="#a96f37"/>
<path d="M-130 20 v140 M-40 20 v140 M50 20 v140 M140 20 v140" stroke="rgba(44,33,38,0.18)" stroke-width="6"/>
<path d="M-170 70 h340 M-160 130 h320" stroke="rgba(44,33,38,0.14)" stroke-width="6"/>
<path d="M-150 -40 C -150 -170 150 -170 150 -40" fill="none" stroke="#a96f37" stroke-width="22"/>
<circle cx="-80" cy="-70" r="46" fill="${C.rose}"/>
<circle cx="20" cy="-90" r="40" fill="${C.deep}"/>
<circle cx="110" cy="-66" r="44" fill="${C.gold}"/>
<path d="M-80 -70 l0 -10 M20 -90 l0 -10 M110 -66 l0 -10" stroke="${C.cream}" stroke-width="6"/>
<path d="M-240 -14 q40 -60 80 0 M160 -14 q40 -60 80 0" fill="none" stroke="${C.gold}" stroke-width="8" opacity="0.7"/>
</g>`);

art2.lamp = () => svgWrap(`${shadow(400, 650, 160)}
<g transform="translate(400 400)">
<circle cx="0" cy="-60" r="170" fill="${C.gold}" opacity="0.35"/>
<circle cx="0" cy="-60" r="130" fill="${C.cream}" stroke="${C.gold}" stroke-width="6"/>
<path d="M-130 -60 a130 130 0 0 1 260 0" fill="none" stroke="${C.rose}" stroke-width="10"/>
<circle cx="-40" cy="-90" r="18" fill="rgba(255,255,255,0.9)"/>
<rect x="-70" y="90" width="140" height="40" rx="14" fill="${C.deep}"/>
<rect x="-14" y="30" width="28" height="70" fill="${C.deep}"/>
<path d="M-180 -190 l30 -20 M180 -190 l-30 -20 M0 -250 l0 -34" stroke="${C.gold}" stroke-width="8" stroke-linecap="round"/>
</g>`);

art2.letter = () => svgWrap(`${shadow(400, 630, 210)}
<g transform="translate(400 400)">
<rect x="-200" y="-130" width="400" height="260" rx="16" fill="${C.cream}" stroke="rgba(44,33,38,0.15)" stroke-width="4"/>
<path d="M-200 -130 L0 30 L200 -130" fill="none" stroke="${C.rose}" stroke-width="10"/>
<path d="M-200 130 L-60 10 M200 130 L60 10" stroke="rgba(44,33,38,0.12)" stroke-width="4"/>
<circle cx="0" cy="66" r="52" fill="${C.rose}"/>
<path d="M0 92 c -30 -20 -40 -44 -26 -62 c 12 -16 30 -10 26 8 c -4 -18 14 -24 26 -8 c 14 18 4 42 -26 62 Z" fill="${C.gold}"/>
<path d="M-150 -80 h120 M-150 -40 h80" stroke="rgba(44,33,38,0.18)" stroke-width="8" stroke-linecap="round"/>
</g>`);

art2.keychain = () => svgWrap(`${shadow(400, 650, 140)}
<g transform="translate(400 400)">
<circle cx="0" cy="-170" r="70" fill="none" stroke="#b9b3ad" stroke-width="26"/>
<circle cx="0" cy="-170" r="70" fill="none" stroke="rgba(44,33,38,0.25)" stroke-width="6"/>
<rect x="-110" y="-110" width="220" height="300" rx="30" fill="#d9d4ce" stroke="rgba(44,33,38,0.2)" stroke-width="6"/>
<rect x="-88" y="-88" width="176" height="256" rx="20" fill="none" stroke="${C.deep}" stroke-width="5"/>
<text x="0" y="-6" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${C.deep}">19.0760</text>
<text x="0" y="44" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${C.deep}">72.8777</text>
<path d="M-50 96 h100" stroke="${C.rose}" stroke-width="8" stroke-linecap="round"/>
<path d="M0 176 c -16 -20 -44 -18 -44 4 c 0 20 30 34 44 48 c 14 -14 44 -28 44 -48 c 0 -22 -28 -24 -44 -4 Z" fill="${C.rose}"/>
</g>`);

art2.pendant = () => svgWrap(`${shadow(400, 640, 150)}
<g transform="translate(400 400)">
<path d="M-170 -190 C -80 -60 80 -60 170 -190" fill="none" stroke="${C.gold}" stroke-width="7"/>
<path d="M-170 -190 C -80 -60 80 -60 170 -190" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="3"/>
<circle cx="0" cy="30" r="34" fill="${C.gold}"/>
<path d="M0 -4 v30" stroke="${C.gold}" stroke-width="10"/>
<text x="0" y="46" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="${C.deep}">A</text>
<circle cx="-120" cy="-140" r="8" fill="${C.gold}"/><circle cx="120" cy="-140" r="8" fill="${C.gold}"/>
<circle cx="-60" cy="-78" r="7" fill="${C.gold}"/><circle cx="60" cy="-78" r="7" fill="${C.gold}"/>
</g>`);

art2.watch = () => svgWrap(`${shadow(400, 655, 150)}
<g transform="translate(400 400)">
<rect x="-64" y="-260" width="128" height="200" rx="26" fill="${C.deep}"/>
<rect x="-64" y="60" width="128" height="200" rx="26" fill="${C.deep}"/>
<circle cx="0" cy="0" r="130" fill="${C.cream}" stroke="${C.gold}" stroke-width="14"/>
<circle cx="0" cy="0" r="106" fill="none" stroke="rgba(44,33,38,0.12)" stroke-width="4"/>
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
  const a = (i * 30 * Math.PI) / 180;
  const x = Math.sin(a) * 92; const y = -Math.cos(a) * 92;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${C.deep}"/>`;
}).join('')}
<path d="M0 0 L0 -66" stroke="${C.deep}" stroke-width="10" stroke-linecap="round"/>
<path d="M0 0 L48 30" stroke="${C.rose}" stroke-width="8" stroke-linecap="round"/>
<circle cx="0" cy="0" r="10" fill="${C.rose}"/>
<rect x="126" y="-18" width="22" height="36" rx="8" fill="${C.gold}"/>
</g>`);

art2.speaker = () => svgWrap(`${shadow(400, 640, 180)}
<g transform="translate(400 400)">
<rect x="-140" y="-190" width="280" height="380" rx="46" fill="${C.deep}"/>
<rect x="-140" y="-190" width="280" height="380" rx="46" fill="none" stroke="${C.gold}" stroke-width="6"/>
<circle cx="0" cy="-70" r="76" fill="${C.ink}"/>
<circle cx="0" cy="-70" r="50" fill="none" stroke="${C.gold}" stroke-width="8"/>
<circle cx="0" cy="-70" r="20" fill="${C.gold}"/>
<circle cx="0" cy="88" r="44" fill="${C.ink}"/>
<circle cx="0" cy="88" r="24" fill="none" stroke="${C.rose}" stroke-width="7"/>
<circle cx="-90" cy="-160" r="9" fill="${C.rose}"/><circle cx="-60" cy="-160" r="9" fill="rgba(255,255,255,0.5)"/>
</g>`);

art2.music = () => svgWrap(`${shadow(400, 640, 180)}
<g transform="translate(400 400)">
<rect x="-170" y="-60" width="340" height="220" rx="20" fill="#b5773f"/>
<rect x="-170" y="-60" width="340" height="70" rx="20" fill="#96602f"/>
<rect x="-140" y="-130" width="280" height="70" rx="14" fill="#96602f"/>
<circle cx="0" cy="70" r="56" fill="${C.cream}" stroke="${C.gold}" stroke-width="6"/>
<text x="0" y="86" text-anchor="middle" font-family="Georgia, serif" font-size="52" fill="${C.rose}">&#9835;</text>
<path d="M60 -170 q40 -40 80 0" fill="none" stroke="${C.gold}" stroke-width="10" stroke-linecap="round"/>
<circle cx="140" cy="-170" r="16" fill="${C.gold}"/>
<path d="M-120 -160 h60 M-120 -130 h40" stroke="rgba(255,255,255,0.4)" stroke-width="6" stroke-linecap="round"/>
</g>`);

art2.bracelet = () => svgWrap(`${shadow(400, 645, 170)}
<g transform="translate(400 400)">
<ellipse cx="-90" cy="0" rx="110" ry="140" fill="none" stroke="${C.rose}" stroke-width="30"/>
<ellipse cx="90" cy="0" rx="110" ry="140" fill="none" stroke="${C.deep}" stroke-width="30"/>
<ellipse cx="-90" cy="0" rx="110" ry="140" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="8"/>
<ellipse cx="90" cy="0" rx="110" ry="140" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="8"/>
<circle cx="0" cy="-140" r="26" fill="${C.gold}"/>
<circle cx="0" cy="140" r="26" fill="${C.gold}"/>
<path d="M0 -150 c -14 -14 -36 -12 -36 6 c 0 16 24 26 36 38 c 12 -12 36 -22 36 -38 c 0 -18 -22 -20 -36 -6 Z" fill="${C.cream}"/>
</g>`);

art2.bottle = () => svgWrap(`${shadow(400, 655, 130)}
<g transform="translate(400 400)">
<path d="M-95 -110 a95 95 0 0 1 190 0 v190 a60 60 0 0 1 -60 60 h-70 a60 60 0 0 1 -60 -60 Z" fill="rgba(255,255,255,0.55)" stroke="rgba(44,33,38,0.25)" stroke-width="6"/>
<rect x="-58" y="-200" width="116" height="60" rx="14" fill="#c98a4b"/>
<rect x="-70" y="-230" width="140" height="34" rx="16" fill="#a96f37"/>
<path d="M-60 -40 q40 -50 90 -10 q40 34 60 -10" fill="none" stroke="${C.cream}" stroke-width="16" stroke-linecap="round"/>
<rect x="-64" y="20" width="128" height="90" rx="8" fill="${C.cream}" transform="rotate(-8)"/>
<path d="M-46 44 h92 M-46 66 h70" stroke="rgba(44,33,38,0.35)" stroke-width="6" stroke-linecap="round" transform="rotate(-8)"/>
<path d="M0 170 c -16 -20 -44 -18 -44 4 c 0 20 30 34 44 48 c 14 -14 44 -28 44 -48 c 0 -22 -28 -24 -44 -4 Z" fill="${C.rose}"/>
</g>`);

art2.doll = () => svgWrap(`${shadow(400, 655, 150)}
<g transform="translate(400 400)">
<rect x="-90" y="-40" width="180" height="200" rx="40" fill="${C.rose}"/>
<rect x="-120" y="-30" width="46" height="150" rx="23" fill="${C.deep}"/>
<rect x="74" y="-30" width="46" height="150" rx="23" fill="${C.deep}"/>
<circle cx="0" cy="-130" r="94" fill="#f6d3b8"/>
<path d="M-94 -150 a94 94 0 0 1 188 0 q-30 -50 -94 -50 q-64 0 -94 50 Z" fill="${C.ink}"/>
<circle cx="-32" cy="-128" r="10" fill="${C.ink}"/><circle cx="32" cy="-128" r="10" fill="${C.ink}"/>
<path d="M-26 -84 q26 26 52 0" fill="none" stroke="${C.rose}" stroke-width="8" stroke-linecap="round"/>
<circle cx="-58" cy="-98" r="14" fill="rgba(226,120,140,0.5)"/><circle cx="58" cy="-98" r="14" fill="rgba(226,120,140,0.5)"/>
<path d="M-40 60 h80" stroke="${C.gold}" stroke-width="10" stroke-linecap="round"/>
</g>`);

art2.combo = () => svgWrap(`${shadow(400, 650, 220)}
<g transform="translate(400 400)">
<rect x="-230" y="-150" width="230" height="300" rx="18" fill="${C.deep}"/>
<rect x="-206" y="-126" width="182" height="200" rx="10" fill="${C.cream}"/>
<circle cx="-150" cy="-70" r="26" fill="${C.gold}"/>
<path d="M-206 40 l-40 -50 l50 40 l40 -30 l40 40 v56 h-90 Z" fill="${C.rose}" opacity="0.8"/>
<rect x="40" y="-110" width="190" height="260" rx="30" fill="${C.white}" stroke="rgba(44,33,38,0.12)" stroke-width="4"/>
<path d="M230 -40 C 300 -40 300 60 230 60" fill="none" stroke="${C.white}" stroke-width="34" stroke-linecap="round"/>
<path d="M230 -40 C 300 -40 300 60 230 60" fill="none" stroke="rgba(44,33,38,0.1)" stroke-width="4"/>
<rect x="40" y="-110" width="190" height="46" rx="23" fill="${C.rose}"/>
<circle cx="135" cy="40" r="44" fill="none" stroke="${C.rose}" stroke-width="8"/>
<path d="M118 40 l12 14 24 -28" stroke="${C.rose}" stroke-width="8" fill="none" stroke-linecap="round"/>
</g>`);

art2.map = () => svgWrap(`${shadow(400, 650, 210)}
<g transform="translate(400 400)">
<rect x="-220" y="-230" width="440" height="460" rx="16" fill="${C.cream}" stroke="${C.deep}" stroke-width="8"/>
<path d="M-220 -60 h440 M-220 90 h440 M-80 -230 v460 M90 -230 v460" stroke="rgba(44,33,38,0.16)" stroke-width="8"/>
<path d="M-220 20 C -80 -40 -40 140 90 40 C 160 -10 200 -60 220 -30" fill="none" stroke="${C.rose}" stroke-width="10" stroke-dasharray="4 14" stroke-linecap="round"/>
<path d="M0 -70 c -34 -6 -58 20 -50 52 c 8 34 50 74 50 74 s 42 -40 50 -74 c 8 -32 -16 -58 -50 -52 Z" fill="${C.rose}"/>
<circle cx="0" cy="-18" r="16" fill="${C.cream}"/>
<text x="0" y="180" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="${C.deep}" font-style="italic">our city</text>
</g>`);

module.exports = { art2 };
