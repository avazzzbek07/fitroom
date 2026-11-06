import { PRODUCTS, CATEGORIES, byId, svgFor, isTryable, groupOf } from './products.js';
import { I18N } from './i18n.js';
import { createTryOn, SLOTS } from './tryon.js';

const RUB_PER_USD = 92;

const store = {
  get(k, d) { try { const v = localStorage.getItem('fitroom_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('fitroom_' + k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};

const state = {
  lang: store.get('lang', 'ru'),
  cart: store.get('cart', {}),
  fav: new Set(store.get('fav', [])),
  outfitIds: ['bomber-terra'],
  trySlot: 'all',
};

const t = (k) => I18N[state.lang][k] ?? k;
const nameOf = (p) => p.name[state.lang];
const price = (usd) => (state.lang === 'ru'
  ? `${(Math.round((usd * RUB_PER_USD) / 10) * 10).toLocaleString('ru-RU')} ₽`
  : `$${usd}`);
const $ = (sel, root = document) => root.querySelector(sel);

const ICON = {
  heart: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  camera: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg>',
  upload: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m-5 5 5-5 5 5M4 20h16"/></svg>',
  video: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

// ---------- общие куски ----------
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
}

function addToCart(id, qty = 1) {
  state.cart[id] = (state.cart[id] || 0) + qty;
  if (state.cart[id] <= 0) delete state.cart[id];
  store.set('cart', state.cart);
  updateHeader();
}

function card(p) {
  const tryable = isTryable(p);
  const img = `${svgFor(p)}${p.tag ? `<span class="tag">${t('tag_' + p.tag)}</span>` : ''}`;
  return `<article class="card">
    ${tryable ? `<a class="card-img" href="#/try/${p.id}" style="--tint:${p.bg}">${img}</a>` : `<div class="card-img" style="--tint:${p.bg}">${img}</div>`}
    <button class="fav ${state.fav.has(p.id) ? 'on' : ''}" data-fav="${p.id}" aria-label="${t('fav')}">${ICON.heart}</button>
    <div class="card-body">
      <h3>${nameOf(p)}</h3>
      <div class="price">${price(p.price)}</div>
      <div class="card-actions">
        <button class="btn sm" data-add="${p.id}">${t('addToCart')}</button>
        ${tryable ? `<a class="btn sm ghost" href="#/try/${p.id}">${t('tryOn')}</a>` : `<span class="muted small">${t('noTryShoes')}</span>`}
      </div>
    </div>
  </article>`;
}

// ---------- страницы ----------
function renderHome(main) {
  const heroItems = ['blazer-black', 'bomber-terra', 'sun-black'].map(byId);
  const fresh = PRODUCTS.filter((p) => p.tag).concat(PRODUCTS.filter((p) => !p.tag)).slice(0, 8);
  main.innerHTML = `
  <section class="hero wrap">
    <div class="hero-text">
      <p class="eyebrow"><span class="dot"></span>${t('heroEyebrow')}</p>
      <h1>${t('heroTitle')}</h1>
      <p class="lead">${t('heroLead')}</p>
      <div class="actions">
        <a class="btn red lg" href="#/try">${ICON.video} ${t('heroTry')}</a>
        <a class="btn ghost lg" href="#/catalog">${t('heroCatalog')}</a>
      </div>
      <div class="stats">
        <div><b>${PRODUCTS.length}</b><span>${t('stat1')}</span></div>
        <div><b>~2</b><span>${t('stat2')}</span></div>
        <div><b>0</b><span>${t('stat3')}</span></div>
      </div>
    </div>
    <div class="hero-cards">
      ${heroItems.map((p, i) => `<a href="#/try/${p.id}" class="hero-card c${i}" style="--tint:${p.bg}">${svgFor(p)}<span>${nameOf(p)}<b>${price(p.price)}</b></span></a>`).join('')}
    </div>
  </section>

  <section class="wrap steps">
    <h2 class="section-title">${t('stepsTitle')}</h2>
    <div class="steps-grid">
      ${[1, 2, 3].map((n) => `<div class="step"><span class="num">0${n}</span><h3>${t(`step${n}t`)}</h3><p>${t(`step${n}d`)}</p></div>`).join('')}
    </div>
  </section>

  <section class="wrap">
    <div class="row-head"><h2 class="section-title">${t('newTitle')}</h2><a href="#/catalog" class="link">${t('allItems')} →</a></div>
    <div class="scroller">${fresh.map(card).join('')}</div>
  </section>`;
}

function renderCatalog(main, filter = '') {
  const chip = (key, label, count) => `<a class="chip ${filter === key ? 'active' : ''}" href="#/catalog${key ? '/' + key : ''}">${label}${count != null ? `<span>${count}</span>` : ''}</a>`;
  const chips = chip('', t('all'), PRODUCTS.length)
    + CATEGORIES.map((c) => chip(c, t('cat_' + c), PRODUCTS.filter((p) => p.cat === c).length)).join('')
    + chip('fav', `♥ ${t('favorites')}`, state.fav.size);

  let body;
  if (!filter) {
    body = CATEGORIES.map((c) => `
      <div class="row-head"><h2 class="row-title">${t('cat_' + c)}</h2><a class="link" href="#/catalog/${c}">${t('all')} →</a></div>
      <div class="scroller">${PRODUCTS.filter((p) => p.cat === c).map(card).join('')}</div>`).join('');
  } else {
    const list = filter === 'fav' ? PRODUCTS.filter((p) => state.fav.has(p.id)) : PRODUCTS.filter((p) => p.cat === filter);
    body = list.length ? `<div class="grid">${list.map(card).join('')}</div>` : `<p class="empty">${t('favEmpty')}</p>`;
  }
  main.innerHTML = `<section class="wrap catalog">
    <h1 class="page-title">${t('catalogTitle')}</h1>
    <div class="chips">${chips}</div>
    ${body}
  </section>`;
}

function renderTry(main, id) {
  const pick = byId(id);
  if (pick && isTryable(pick)) {
    state.outfitIds = state.outfitIds.filter((oid) => groupOf(byId(oid)) !== groupOf(pick)).concat(pick.id);
  }

  main.innerHTML = `<section class="tryon">
    <div class="stage">
      <canvas id="cv"></canvas>
      <video id="vid" playsinline muted></video>
      <div class="stage-bar">
        <span class="status" id="status"></span>
        <div class="stage-actions">
          <button class="icon-btn" id="camBtn" title="${t('camera')}">${ICON.video}</button>
          <label class="icon-btn" title="${t('camUpload')}">${ICON.upload}<input type="file" accept="image/*" class="upload" hidden></label>
          <button class="icon-btn red" id="snap" title="${t('snap')}">${ICON.camera}</button>
        </div>
      </div>
      <div class="stage-empty" id="empty">
        <div>
          <div class="silhouette"></div>
          <h2>${t('camTitle')}</h2>
          <p id="emptyText">${t('camText')}</p>
          <div class="actions center">
            <button class="btn red" id="startCam">${ICON.video} ${t('camStart')}</button>
            <label class="btn ghost">${ICON.upload} ${t('camUpload')}<input type="file" accept="image/*" class="upload" hidden></label>
          </div>
        </div>
      </div>
    </div>
    <aside class="panel">
      <div class="outfit" id="outfit"></div>
      <div class="tabs" id="tabs"></div>
      <div class="thumbs" id="thumbs"></div>
    </aside>
  </section>`;

  const ac = new AbortController();
  const on = (el, ev, fn) => el.addEventListener(ev, fn, { signal: ac.signal });
  const statusEl = $('#status', main), empty = $('#empty', main);

  const tryon = createTryOn({
    canvas: $('#cv', main),
    video: $('#vid', main),
    onStatus: (s) => { statusEl.textContent = t('st_' + s); statusEl.dataset.s = s; },
  });
  state.outfitIds.forEach((oid) => tryon.setItem(byId(oid)));

  function renderOutfit() {
    const items = SLOTS.map((s) => tryon.outfit[s]).filter(Boolean);
    const sum = items.reduce((n, p) => n + p.price, 0);
    $('#outfit', main).innerHTML = `<h3>${t('outfit')}</h3>`
      + (items.length ? items.map((p) => `<div class="outfit-item">
          <div class="mini" style="--tint:${p.bg}">${svgFor(p)}</div>
          <div><div class="o-name">${nameOf(p)}</div><div class="o-price">${price(p.price)}</div></div>
          <button class="icon-btn sm" data-unwear="${groupOf(p)}" title="${t('remove')}">${ICON.x}</button>
        </div>`).join('')
        + `<button class="btn red block" id="addOutfit">${t('addOutfit')} · ${price(sum)}</button>`
        : `<p class="muted small">${t('outfitEmpty')}</p>`);
  }

  function renderThumbs() {
    $('#tabs', main).innerHTML = ['all', ...SLOTS].map((s) => `<button class="chip sm ${state.trySlot === s ? 'active' : ''}" data-slot="${s}">${t('slot_' + s)}</button>`).join('');
    const list = PRODUCTS.filter((p) => isTryable(p) && (state.trySlot === 'all' || groupOf(p) === state.trySlot));
    const worn = new Set(Object.values(tryon.outfit).map((p) => p.id));
    $('#thumbs', main).innerHTML = list.map((p) => `<button class="thumb ${worn.has(p.id) ? 'on' : ''}" data-wear="${p.id}" style="--tint:${p.bg}" title="${nameOf(p)}">${svgFor(p)}</button>`).join('');
  }

  const sync = () => {
    state.outfitIds = Object.values(tryon.outfit).map((p) => p.id);
    renderOutfit(); renderThumbs();
  };
  sync();

  async function start() {
    try {
      await tryon.startCamera();
      empty.hidden = true;
    } catch (e) {
      $('#emptyText', main).textContent = e.message === 'insecure' ? t('camInsecure') : t('camDenied');
      empty.hidden = false;
    }
  }

  on(main, 'click', (e) => {
    const el = e.target.closest('button');
    if (!el) return;
    if (el.dataset.wear) { tryon.setItem(byId(el.dataset.wear)); sync(); }
    else if (el.dataset.unwear) { tryon.removeSlot(el.dataset.unwear); sync(); }
    else if (el.dataset.slot) { state.trySlot = el.dataset.slot; renderThumbs(); }
    else if (el.id === 'addOutfit') { Object.values(tryon.outfit).forEach((p) => addToCart(p.id)); toast(t('added')); }
    else if (el.id === 'startCam' || el.id === 'camBtn') start();
    else if (el.id === 'snap') tryon.snapshot();
  });
  on(main, 'change', async (e) => {
    if (!e.target.classList.contains('upload') || !e.target.files[0]) return;
    await tryon.useImage(e.target.files[0]);
    empty.hidden = true;
    e.target.value = '';
  });

  start();
  return () => { ac.abort(); tryon.destroy(); };
}

function renderCart(main) {
  const rows = Object.entries(state.cart).map(([id, qty]) => ({ p: byId(id), qty })).filter((r) => r.p);
  if (!rows.length) {
    main.innerHTML = `<section class="wrap cart-empty">
      <h1 class="page-title">${t('cartEmpty')}</h1><p class="muted">${t('cartEmptyText')}</p>
      <div class="actions center"><a class="btn red" href="#/try">${t('heroTry')}</a><a class="btn ghost" href="#/catalog">${t('heroCatalog')}</a></div>
    </section>`;
    return;
  }
  const sum = rows.reduce((n, r) => n + r.p.price * r.qty, 0);
  main.innerHTML = `<section class="wrap cart">
    <h1 class="page-title">${t('cartTitle')}</h1>
    <div class="cart-grid">
      <div class="cart-list">${rows.map(({ p, qty }) => `
        <div class="cart-row">
          <div class="mini lg" style="--tint:${p.bg}">${svgFor(p)}</div>
          <div class="cart-info"><div class="o-name">${nameOf(p)}</div><div class="muted small">${t('cat_' + p.cat)}</div></div>
          <div class="qty"><button data-qty="${p.id}" data-d="-1">−</button><span>${qty}</span><button data-qty="${p.id}" data-d="1">+</button></div>
          <div class="cart-price">${price(p.price * qty)}</div>
          <button class="icon-btn sm" data-qty="${p.id}" data-d="${-qty}" title="${t('remove')}">${ICON.x}</button>
        </div>`).join('')}
      </div>
      <aside class="summary">
        <div class="sum-row"><span>${t('subtotal')}</span><span>${price(sum)}</span></div>
        <div class="sum-row"><span>${t('delivery')}</span><span>${t('free')}</span></div>
        <div class="sum-row total"><span>${t('total')}</span><span>${price(sum)}</span></div>
        <button class="btn red block lg" id="checkout">${t('checkout')}</button>
      </aside>
    </div>
  </section>`;
}

function showOrderModal() {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-box"><div class="check">✓</div><h2>${t('orderDone')}</h2><p class="muted">${t('orderText')}</p><button class="btn red block">${t('ok')}</button></div>`;
  m.addEventListener('click', (e) => { if (e.target === m || e.target.tagName === 'BUTTON') { m.remove(); location.hash = '#/'; } });
  document.body.appendChild(m);
}

// ---------- шапка и роутер ----------
function updateHeader(page = currentPage()) {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-nav]').forEach((el) => el.classList.toggle('active', el.dataset.nav === page));
  document.querySelectorAll('[data-lang]').forEach((el) => el.classList.toggle('active', el.dataset.lang === state.lang));
  const n = Object.values(state.cart).reduce((a, b) => a + b, 0);
  const badge = $('#cartCount');
  badge.textContent = n;
  badge.hidden = !n;
}

const currentPage = () => location.hash.replace(/^#\/?/, '').split('/')[0];

let cleanup = null;
function route() {
  cleanup?.();
  cleanup = null;
  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
  const main = $('#app');
  document.body.dataset.page = page || 'home';
  if (page === 'catalog') renderCatalog(main, arg);
  else if (page === 'try') cleanup = renderTry(main, arg);
  else if (page === 'cart') renderCart(main);
  else renderHome(main);
  updateHeader(page);
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-add],[data-fav],[data-lang],[data-qty],#checkout');
  if (!el) return;
  if (el.dataset.add) { addToCart(el.dataset.add); toast(t('added')); }
  else if (el.dataset.fav) {
    const id = el.dataset.fav;
    state.fav.has(id) ? state.fav.delete(id) : state.fav.add(id);
    store.set('fav', [...state.fav]);
    el.classList.toggle('on', state.fav.has(id));
  } else if (el.dataset.lang) {
    state.lang = el.dataset.lang;
    store.set('lang', state.lang);
    route();
  } else if (el.dataset.qty) {
    addToCart(el.dataset.qty, Number(el.dataset.d));
    renderCart($('#app'));
  } else if (el.id === 'checkout') {
    state.cart = {};
    store.set('cart', state.cart);
    updateHeader();
    showOrderModal();
  }
});

window.addEventListener('hashchange', route);
route();
