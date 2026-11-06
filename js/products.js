// Каталог товаров и SVG-иллюстрации одежды.
// Каждая вещь рисуется векторно: фон прозрачный, поэтому её можно накладывать на видео с камеры.

const DEFS = `<defs>
<linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
<linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;

// --- Верх: viewBox 0 0 200 260, плечевые суставы ≈ (55,48) и (145,48)
const torso = (b) => `M74 26 Q100 42 126 26 L152 42 Q158 62 151 84 L150 ${b} Q100 ${b + 6} 50 ${b} L49 84 Q42 62 48 42 Z`;
const LONG = ['M48 42 Q30 48 26 74 L16 208 L40 212 L52 100 Z', 'M152 42 Q170 48 174 74 L184 208 L160 212 L148 100 Z'];
const SHORT = ['M48 42 Q28 50 20 86 L44 98 L52 72 Z', 'M152 42 Q172 50 180 86 L156 98 L148 72 Z'];
const CUFFS = (f) => `<path d="M17 194 L41 198 L40 212 L16 208 Z" fill="${f}"/><path d="M183 194 L159 198 L160 212 L184 208 Z" fill="${f}"/>`;
const HEM = (f, y = 222) => `<path d="M50 ${y} Q100 ${y + 6} 150 ${y} L150 ${y + 16} Q100 ${y + 22} 50 ${y + 16} Z" fill="${f}"/>`;

function base(c, b = 236, sleeves = LONG) {
  const shade = (d) => `<path d="${d}" fill="${c}"/><path d="${d}" fill="url(#sh)"/>`;
  return shade(sleeves[0]) + shade(sleeves[1]) + shade(torso(b)) + `<path d="${torso(b)}" fill="url(#hl)"/>`;
}

// --- Низ: viewBox 0 0 200 300, тазобедренные суставы ≈ (64,34) и (136,34)
const PANTS = 'M50 14 L150 14 L157 120 L151 294 L109 294 L101 112 L99 112 L91 294 L49 294 L43 120 Z';
const SHORTS = 'M50 14 L150 14 L160 110 L106 118 L100 76 L94 118 L40 110 Z';
const waist = (f) => `<rect x="50" y="14" width="100" height="14" fill="${f}"/>`;

const SHAPES = {
  tee: { group: 'top', draw: ({ c, d }) => base(c, 226, SHORT)
    + `<path d="M76 28 Q100 52 124 28" fill="none" stroke="${d}" stroke-width="6" stroke-linecap="round"/>` },

  shirt: { group: 'top', draw: ({ c, d }) => base(c)
    + `<path d="M100 46 L100 236" stroke="${d}" stroke-width="2"/>`
    + [72, 102, 132, 162, 192, 222].map((y) => `<circle cx="104" cy="${y}" r="3" fill="${d}"/>`).join('')
    + `<path d="M74 26 L100 46 L86 62 L66 36 Z" fill="${c}" stroke="${d}" stroke-width="2"/>`
    + `<path d="M126 26 L100 46 L114 62 L134 36 Z" fill="${c}" stroke="${d}" stroke-width="2"/>` + CUFFS(d) },

  bomber: { group: 'top', draw: ({ c, d, a }) => base(c, 224) + HEM(d)
    + `<path d="M74 26 Q100 42 126 26 L128 36 Q100 54 72 36 Z" fill="${d}"/>`
    + `<path d="M100 46 L100 238" stroke="${a}" stroke-width="3"/>`
    + `<path d="M62 150 L72 188 M138 150 L128 188" stroke="${d}" stroke-width="4" stroke-linecap="round"/>` + CUFFS(d) },

  denim: { group: 'top', draw: ({ c, d, a }) => base(c, 222)
    + `<path d="M50 206 L150 206 L150 222 Q100 228 50 222 Z" fill="${d}"/>`
    + `<path d="M100 44 L100 222" stroke="${d}" stroke-width="3"/>`
    + `<rect x="60" y="88" width="30" height="28" rx="3" fill="none" stroke="#e0b26a" stroke-width="1.5" stroke-dasharray="3 2"/>`
    + `<rect x="110" y="88" width="30" height="28" rx="3" fill="none" stroke="#e0b26a" stroke-width="1.5" stroke-dasharray="3 2"/>`
    + [80, 120, 160, 196].map((y) => `<circle cx="107" cy="${y}" r="3.5" fill="#c98b45"/>`).join('')
    + `<path d="M74 26 L100 44 L84 66 L60 38 Z" fill="${a}"/><path d="M126 26 L100 44 L116 66 L140 38 Z" fill="${a}"/>` + CUFFS(d) },

  blazer: { group: 'top', draw: ({ c, d, a }) => base(c, 238)
    + `<path d="M78 28 Q100 40 122 28 L100 122 Z" fill="${a}"/>`
    + `<path d="M76 27 L100 122 L90 74 L66 42 Z" fill="${d}"/><path d="M124 27 L100 122 L110 74 L134 42 Z" fill="${d}"/>`
    + `<circle cx="104" cy="150" r="4" fill="#000"/><circle cx="104" cy="180" r="4" fill="#000"/>`
    + `<path d="M58 184 L88 184 M112 184 L142 184 M118 98 L138 98" stroke="${d}" stroke-width="4"/>` },

  hoodie: { group: 'top', draw: ({ c, d, a }) => `<path d="M60 40 Q56 2 100 0 Q144 2 140 40 Q100 30 60 40 Z" fill="${d}"/>`
    + base(c, 226) + HEM(d)
    + `<path d="M74 26 Q100 50 126 26" fill="none" stroke="${d}" stroke-width="8"/>`
    + `<path d="M92 40 L90 92 M108 40 L110 92" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M64 162 L136 162 L146 212 L54 212 Z" fill="${d}" opacity=".55"/>` + CUFFS(d) },

  sweater: { group: 'top', draw: ({ c, d }) => base(c, 222) + HEM(d)
    + Array.from({ length: 9 }, (_, i) => `<path d="M${60 + i * 10} 62 L${60 + i * 10} 218" stroke="${d}" stroke-opacity=".3" stroke-width="2"/>`).join('')
    + `<path d="M74 26 Q100 50 126 26" fill="none" stroke="${d}" stroke-width="9"/>` + CUFFS(d) },

  jeans: { group: 'bottom', draw: ({ c, d, a }) => `<path d="${PANTS}" fill="${c}"/><path d="${PANTS}" fill="url(#sh)"/>` + waist(d)
    + `<path d="M100 28 Q104 70 100 100" stroke="${d}" stroke-width="2" fill="none"/>`
    + `<path d="M56 30 Q66 54 82 30 M144 30 Q134 54 118 30" stroke="${a}" stroke-width="1.5" fill="none"/>`
    + `<circle cx="100" cy="21" r="3" fill="${a}"/>`
    + `<ellipse cx="70" cy="190" rx="14" ry="30" fill="#fff" opacity=".08"/><ellipse cx="130" cy="190" rx="14" ry="30" fill="#fff" opacity=".08"/>` },

  chinos: { group: 'bottom', draw: ({ c, d }) => `<path d="${PANTS}" fill="${c}"/><path d="${PANTS}" fill="url(#sh)"/>` + waist(d)
    + `<path d="M70 40 L70 290 M130 40 L130 290" stroke="${d}" stroke-opacity=".45" stroke-width="2"/>`
    + `<path d="M52 30 L64 60 M148 30 L136 60" stroke="${d}" stroke-width="2"/>` },

  shorts: { group: 'bottom', draw: ({ c, d, a }) => `<path d="${SHORTS}" fill="${c}"/><path d="${SHORTS}" fill="url(#sh)"/>` + waist(d)
    + `<path d="M56 30 Q66 54 82 30 M144 30 Q134 54 118 30" stroke="${a}" stroke-width="1.5" fill="none"/>`
    + `<path d="M44 106 L94 114 M106 114 L156 106" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-dasharray="2 3"/>` },

  // --- Головные уборы: viewBox 0 0 200 160, уши ≈ (54,172) и (146,172) — ниже картинки, это нормально
  cap: { group: 'hat', draw: ({ c, d, a }) => `<path d="M42 122 Q40 34 100 30 Q160 34 158 122 Z" fill="${c}"/><path d="M42 122 Q40 34 100 30 Q160 34 158 122 Z" fill="url(#sh)"/>`
    + `<path d="M100 30 L100 116 M70 40 Q66 80 70 118 M130 40 Q134 80 130 118" stroke="${d}" stroke-opacity=".6" stroke-width="2" fill="none"/>`
    + `<circle cx="100" cy="32" r="5" fill="${d}"/><rect x="86" y="78" width="28" height="12" rx="2" fill="${a}"/>`
    + `<path d="M34 116 Q100 100 166 116 Q172 130 160 136 Q100 124 40 136 Q28 130 34 116 Z" fill="${d}"/>` },

  beanie: { group: 'hat', draw: ({ c, d, a }) => `<circle cx="100" cy="30" r="18" fill="${a}"/>`
    + `<path d="M44 124 Q42 40 100 36 Q158 40 156 124 Z" fill="${c}"/><path d="M44 124 Q42 40 100 36 Q158 40 156 124 Z" fill="url(#sh)"/>`
    + `<path d="M40 94 Q100 84 160 94 L160 130 Q100 122 40 130 Z" fill="${d}"/>`
    + Array.from({ length: 14 }, (_, i) => `<path d="M${48 + i * 8} 94 L${48 + i * 8} 126" stroke="${c}" stroke-opacity=".35" stroke-width="2"/>`).join('') },

  // --- Очки: viewBox 0 0 200 80, зрачки ≈ (60,40) и (140,40)
  sun: { group: 'glasses', draw: ({ c, d }) => `<ellipse cx="60" cy="42" rx="32" ry="24" fill="${c}" opacity=".92" stroke="${d}" stroke-width="5"/>`
    + `<ellipse cx="140" cy="42" rx="32" ry="24" fill="${c}" opacity=".92" stroke="${d}" stroke-width="5"/>`
    + `<path d="M90 34 Q100 26 110 34 M28 34 L2 28 M172 34 L198 28" stroke="${d}" stroke-width="5" fill="none"/>`
    + `<path d="M42 30 Q52 24 64 26 M122 30 Q132 24 144 26" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none"/>` },

  round: { group: 'glasses', draw: ({ c, d }) => `<circle cx="60" cy="40" r="26" fill="${c}" opacity=".35" stroke="${d}" stroke-width="4"/>`
    + `<circle cx="140" cy="40" r="26" fill="${c}" opacity=".35" stroke="${d}" stroke-width="4"/>`
    + `<path d="M86 36 Q100 28 114 36 M34 36 L4 32 M166 36 L196 32" stroke="${d}" stroke-width="4" fill="none"/>` },

  // --- Обувь (только в каталоге): viewBox 0 0 200 140
  sneaker: { group: 'shoes', draw: ({ c, d, a }) => `<path d="M20 104 Q18 70 50 64 L92 54 Q120 40 140 56 L170 82 Q186 92 186 104 Z" fill="${c}"/>`
    + `<path d="M140 56 L170 82 Q186 92 186 104 L156 104 Z" fill="${d}"/><path d="M20 104 Q18 76 34 68 L40 104 Z" fill="${a}"/>`
    + `<path d="M98 56 L108 70 M108 52 L118 66 M118 50 L128 62" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M14 104 L186 104 Q190 118 180 122 L20 122 Q10 118 14 104 Z" fill="#f2f2f2" stroke="#cfcfcf"/>` },

  boot: { group: 'shoes', draw: ({ c, d }) => `<path d="M40 20 L92 20 L94 80 Q120 84 160 96 Q186 102 186 112 L186 118 L36 118 L36 60 Z" fill="${c}"/>`
    + `<path d="M40 20 L92 20 L94 80 Q120 84 160 96 Q186 102 186 112 L186 118 L36 118 L36 60 Z" fill="url(#hl)"/>`
    + `<path d="M58 24 L80 24 L84 76 L56 76 Z" fill="${d}"/><path d="M84 8 L96 8 L94 24 L84 24 Z" fill="${d}"/>`
    + `<rect x="34" y="114" width="154" height="12" rx="3" fill="#1a1a1a"/>` },
};

export const GROUP_META = {
  top: { w: 200, h: 260 }, bottom: { w: 200, h: 300 }, hat: { w: 200, h: 160 },
  glasses: { w: 200, h: 80 }, shoes: { w: 200, h: 140 },
};

export const CATEGORIES = ['outerwear', 'tops', 'shirts', 'pants', 'hats', 'accessories', 'shoes'];

// price — в долларах; рубли считаются по курсу в app.js
export const PRODUCTS = [
  { id: 'bomber-terra', cat: 'outerwear', kind: 'bomber', price: 59, tag: 'new', bg: '#e7a37e', c: '#c0562f', d: '#8e3b1d', a: '#d9c7a8',
    name: { ru: 'Бомбер терракотовый', en: 'Terracotta bomber' } },
  { id: 'denim-velvet', cat: 'outerwear', kind: 'denim', price: 69, bg: '#a9bdd6', c: '#3b5a86', d: '#2a4166', a: '#7a4a2a',
    name: { ru: 'Джинсовая куртка с вельветовым воротником', en: 'Denim jacket, velvet collar' } },
  { id: 'blazer-black', cat: 'outerwear', kind: 'blazer', price: 89, tag: 'hit', bg: '#7f8a6a', c: '#1d1d22', d: '#0c0c0f', a: '#ece6da',
    name: { ru: 'Чёрный пиджак', en: 'Black blazer' } },
  { id: 'blazer-wine', cat: 'outerwear', kind: 'blazer', price: 95, bg: '#d9b5b5', c: '#6b1e2a', d: '#4a1119', a: '#f1e6d8',
    name: { ru: 'Пиджак бордовый', en: 'Burgundy blazer' } },
  { id: 'hoodie-grey', cat: 'tops', kind: 'hoodie', price: 45, bg: '#cfd3d8', c: '#8d8f94', d: '#6e7075', a: '#eeeeee',
    name: { ru: 'Худи серое', en: 'Grey hoodie' } },
  { id: 'sweater-beige', cat: 'tops', kind: 'sweater', price: 49, bg: '#efe2cf', c: '#d8c3a2', d: '#b9a07a',
    name: { ru: 'Вязаный свитер', en: 'Knit sweater' } },
  { id: 'tee-white', cat: 'tops', kind: 'tee', price: 15, bg: '#d6dbe0', c: '#fafafa', d: '#d0d0d0',
    name: { ru: 'Базовая белая футболка', en: 'Basic white tee' } },
  { id: 'tee-black', cat: 'tops', kind: 'tee', price: 15, bg: '#9a9a9a', c: '#232326', d: '#0b0b0c',
    name: { ru: 'Базовая чёрная футболка', en: 'Basic black tee' } },
  { id: 'tee-red', cat: 'tops', kind: 'tee', price: 19, tag: 'new', bg: '#f0c9c4', c: '#c8282d', d: '#8f1a1e',
    name: { ru: 'Красная футболка', en: 'Red tee' } },
  { id: 'shirt-poplin', cat: 'shirts', kind: 'shirt', price: 35, bg: '#e9a63c', c: '#f4f4f1', d: '#c9c9c3',
    name: { ru: 'Рубашка из поплина', en: 'Poplin shirt' } },
  { id: 'shirt-oxford', cat: 'shirts', kind: 'shirt', price: 39, bg: '#dfe7ef', c: '#a9c3e0', d: '#7e9cc0',
    name: { ru: 'Голубая оксфорд-рубашка', en: 'Blue oxford shirt' } },
  { id: 'shirt-olive', cat: 'shirts', kind: 'shirt', price: 42, bg: '#e4e1c9', c: '#6f7550', d: '#4f5537',
    name: { ru: 'Рубашка оливковая', en: 'Olive overshirt' } },
  { id: 'jeans-blue', cat: 'pants', kind: 'jeans', price: 49, tag: 'hit', bg: '#dfe6ef', c: '#3d5f8f', d: '#2c4a73', a: '#e0b26a',
    name: { ru: 'Прямые джинсы', en: 'Straight jeans' } },
  { id: 'jeans-black', cat: 'pants', kind: 'jeans', price: 49, bg: '#c9c9cc', c: '#26272b', d: '#151518', a: '#9a9a9a',
    name: { ru: 'Чёрные джинсы', en: 'Black jeans' } },
  { id: 'chinos-beige', cat: 'pants', kind: 'chinos', price: 45, bg: '#ece7dd', c: '#c9b38d', d: '#a89169',
    name: { ru: 'Бежевые чиносы', en: 'Beige chinos' } },
  { id: 'shorts-denim', cat: 'pants', kind: 'shorts', price: 29, bg: '#f2e3c4', c: '#8fb0d6', d: '#6d8fb8', a: '#e0b26a',
    name: { ru: 'Джинсовые шорты', en: 'Denim shorts' } },
  { id: 'cap-black', cat: 'hats', kind: 'cap', price: 19, bg: '#d8d0c4', c: '#1e1e22', d: '#111114', a: '#e5262b',
    name: { ru: 'Кепка чёрная', en: 'Black cap' } },
  { id: 'beanie-red', cat: 'hats', kind: 'beanie', price: 17, tag: 'new', bg: '#eadfd6', c: '#b52b2f', d: '#8f1f23', a: '#f1e6d8',
    name: { ru: 'Шапка красная', en: 'Red beanie' } },
  { id: 'sun-black', cat: 'accessories', kind: 'sun', price: 25, bg: '#f1d5b0', c: '#141416', d: '#2a2a2e',
    name: { ru: 'Солнцезащитные очки', en: 'Sunglasses' } },
  { id: 'round-tortoise', cat: 'accessories', kind: 'round', price: 29, bg: '#dfe8e1', c: '#c49a6c', d: '#6b3f22',
    name: { ru: 'Круглые очки', en: 'Round glasses' } },
  { id: 'sneaker-white', cat: 'shoes', kind: 'sneaker', price: 79, bg: '#cfd8dc', c: '#f7f7f7', d: '#dcdcdc', a: '#e5262b',
    name: { ru: 'Белые кроссовки', en: 'White sneakers' } },
  { id: 'boot-chelsea', cat: 'shoes', kind: 'boot', price: 99, bg: '#e4d6c3', c: '#4a2f22', d: '#2a1a12',
    name: { ru: 'Челси из замши', en: 'Suede chelsea boots' } },
];

export const byId = (id) => PRODUCTS.find((p) => p.id === id);
export const groupOf = (p) => SHAPES[p.kind].group;
export const isTryable = (p) => groupOf(p) !== 'shoes';
export const metaOf = (p) => GROUP_META[groupOf(p)];

export function svgFor(p, scale = 1) {
  const { w, h } = metaOf(p);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" aria-hidden="true">${DEFS}${SHAPES[p.kind].draw(p)}</svg>`;
}
