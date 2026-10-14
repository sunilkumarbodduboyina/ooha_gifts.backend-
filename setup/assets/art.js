/* Ooha Gifts — SVG artwork library (part 2): object illustrations. */
const { C } = require('./core');

/* Each art fn returns SVG markup centred in an 800x800 canvas. */
const art = {};

const shadow = (cx = 400, cy = 640, rx = 210) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="34" fill="url(#shadow)"/>`;

const defs = `<radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="rgba(44,33,38,0.22)"/><stop offset="1" stop-color="rgba(44,33,38,0)"/>
</radialGradient>`;

function svgWrap(inner) {
  return `<defs>${defs}</defs>${inner}`;
}

art.giftbox = () => svgWrap(`${shadow()}
<g transform="translate(400 400)">
<rect x="-160" y="-70" width="320" height="230" rx="18" fill="${C.rose}"/>
<rect x="-160" y="-70" width="320" height="60" rx="16" fill="${C.deep}"/>
<rect x="-34" y="-70" width="68" height="230" fill="${C.gold}"/>
<rect x="-176" y="-110" width="352" height="64" rx="16" fill="${C.deep}"/>
<rect x="-34" y="-110" width="68" height="64" fill="${C.gold}"/>
<path d="M0 -110 C -30 -170 -110 -170 -90 -120 C -78 -92 -30 -104 0 -110 Z" fill="${C.gold}"/>
<path d="M0 -110 C 30 -170 110 -170 90 -120 C 78 -92 30 -104 0 -110 Z" fill="${C.gold}"/>
<circle cx="0" cy="-112" r="18" fill="${C.deep}"/>
</g>`);

art.mug = () => svgWrap(`${shadow(400, 640, 170)}
<g transform="translate(400 400)">
<rect x="-140" y="-150" width="280" height="300" rx="34" fill="${C.white}"/>
<rect x="-140" y="-150" width="280" height="300" rx="34" fill="none" stroke="rgba(44,33,38,0.10)" stroke-width="4"/>
<path d="M140 -80 C 230 -80 230 70 140 70" fill="none" stroke="${C.white}" stroke-width="44" stroke-linecap="round"/>
<path d="M140 -80 C 230 -80 230 70 140 70" fill="none" stroke="rgba(44,33,38,0.10)" stroke-width="4" stroke-linecap="round"/>
<rect x="-140" y="-150" width="280" height="56" rx="28" fill="${C.rose}" opacity="0.9"/>
<circle cx="0" cy="30" r="58" fill="none" stroke="${C.rose}" stroke-width="10"/>
<path d="M-26 30 l18 20 36 -42" fill="none" stroke="${C.rose}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M-60 -196 q14 -26 0 -52 M0 -206 q14 -26 0 -52 M60 -196 q14 -26 0 -52" fill="none" stroke="rgba(178,58,94,0.45)" stroke-width="8" stroke-linecap="round"/>
</g>`);

art.frame = () => svgWrap(`${shadow(400, 650, 200)}
<g transform="translate(400 400)">
<rect x="-170" y="-200" width="340" height="400" rx="18" fill="${C.deep}"/>
<rect x="-146" y="-176" width="292" height="300" rx="10" fill="${C.cream}"/>
<rect x="-146" y="-176" width="292" height="300" rx="10" fill="none" stroke="${C.gold}" stroke-width="4"/>
<circle cx="-52" cy="-86" r="34" fill="${C.gold}" opacity="0.85"/>
<path d="M-146 60 L -70 -30 L -10 30 L 60 -50 L 146 30 L 146 124 L -146 124 Z" fill="${C.rose}" opacity="0.75"/>
<path d="M-146 96 L -60 20 L 10 76 L 80 10 L 146 66 L 146 124 L -146 124 Z" fill="${C.deep}" opacity="0.55"/>
<rect x="-90" y="146" width="180" height="34" rx="17" fill="${C.gold}"/>
<path d="M0 146 c -14 -22 -50 -22 -50 0" fill="none" stroke="${C.deep}" stroke-width="6"/>
</g>`);

art.puzzle = () => svgWrap(`${shadow(400, 645, 190)}
<g transform="translate(400 400)">
<rect x="-170" y="-170" width="340" height="340" rx="20" fill="${C.white}" stroke="rgba(44,33,38,0.12)" stroke-width="4"/>
<path d="M-170 -60 h340 M-170 60 h340 M-60 -170 v340 M60 -170 v340" stroke="rgba(44,33,38,0.14)" stroke-width="4"/>
<circle cx="-115" cy="-115" r="42" fill="${C.rose}"/>
<circle cx="0" cy="0" r="46" fill="${C.gold}"/>
<rect x="60" y="60" width="110" height="110" fill="${C.deep}"/>
<path d="M-170 60 q26 -30 52 0 q26 30 52 0 q26 -30 52 0 q26 30 52 0 q26 -30 52 0 q26 30 52 0" fill="none" stroke="${C.rose}" stroke-width="6"/>
<circle cx="-115" cy="60" r="30" fill="none" stroke="${C.rose}" stroke-width="8"/>
<path d="M60 -170 v110 M-60 -170 v60" stroke="rgba(44,33,38,0.14)" stroke-width="4"/>
</g>`);

art.calendar = () => svgWrap(`${shadow(400, 650, 195)}
<g transform="translate(400 400)">
<rect x="-165" y="-185" width="330" height="370" rx="20" fill="${C.white}" stroke="rgba(44,33,38,0.12)" stroke-width="4"/>
<rect x="-165" y="-185" width="330" height="86" rx="20" fill="${C.rose}"/>
<rect x="-165" y="-125" width="330" height="26" fill="${C.rose}"/>
<rect x="-120" y="-215" width="26" height="60" rx="13" fill="${C.deep}"/>
<rect x="94" y="-215" width="26" height="60" rx="13" fill="${C.deep}"/>
<g fill="rgba(44,33,38,0.25)">
${[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${-130 + c * 56}" y="${-64 + r * 52}" width="40" height="34" rx="8"/>`).join('')).join('')}
</g>
<rect x="40" y="40" width="40" height="34" rx="8" fill="${C.gold}"/>
<circle cx="-110" cy="-47" r="14" fill="${C.rose}"/>
<path d="M-40 128 h80" stroke="${C.gold}" stroke-width="8" stroke-linecap="round"/>
</g>`);

art.heart = () => svgWrap(`${shadow()}
<g transform="translate(400 390)">
<path d="M0 170 C -210 30 -230 -110 -130 -170 C -60 -210 -10 -160 0 -120 C 10 -160 60 -210 130 -170 C 230 -110 210 30 0 170 Z" fill="${C.rose}"/>
<path d="M0 150 C -180 25 -196 -96 -114 -148 C -58 -182 -16 -140 0 -106 C 16 -140 58 -182 114 -148 C 196 -96 180 25 0 150 Z" fill="none" stroke="${C.gold}" stroke-width="8" opacity="0.7"/>
<circle cx="-64" cy="-58" r="26" fill="rgba(255,255,255,0.35)"/>
<circle cx="0" cy="-46" r="34" fill="none" stroke="${C.white}" stroke-width="6" opacity="0.5"/>
<circle cx="64" cy="-58" r="34" fill="none" stroke="${C.white}" stroke-width="6" opacity="0.5"/>
</g>`);

art.plate = () => svgWrap(`${shadow(400, 600, 220)}
<g transform="translate(400 400)">
<rect x="-230" y="-95" width="460" height="190" rx="24" fill="${C.cream}" stroke="${C.deep}" stroke-width="8"/>
<rect x="-206" y="-71" width="412" height="142" rx="14" fill="none" stroke="rgba(44,33,38,0.18)" stroke-width="4"/>
<text x="0" y="24" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="74" font-weight="bold" fill="${C.deep}" letter-spacing="6">OOHA 01</text>
<circle cx="-206" cy="-64" r="9" fill="${C.deep}"/><circle cx="206" cy="-64" r="9" fill="${C.deep}"/>
<circle cx="-206" cy="64" r="9" fill="${C.deep}"/><circle cx="206" cy="64" r="9" fill="${C.deep}"/>
</g>`);

module.exports = { art, svgWrap, shadow };
