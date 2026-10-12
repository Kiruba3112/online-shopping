// ---------- Login guard: go to the login page if not signed in ----------
let currentUser = null;
try {
  currentUser = JSON.parse(sessionStorage.getItem('nw_user') || localStorage.getItem('nw_user') || 'null');
} catch (e) {}
if (!currentUser) location.replace('index.html');

// ---------- Product data ----------
// [name, category, brand, price, icon, rating, stock]
const RAW = [
 ['ProBook 14 Laptop','Computers','Northwind',62000,'💻',4.6,12],
 ['ProBook 16 Workstation','Computers','Northwind',98000,'💻',4.8,6],
 ['UltraSharp 27" Monitor','Computers','Vertex',24500,'🖥️',4.5,18],
 ['Compact Desktop PC','Computers','Axis',41000,'🖥️',4.3,9],
 ['Mechanical Keyboard','Accessories','Helix',4800,'⌨️',4.4,40],
 ['Wireless Mouse','Accessories','Helix',1800,'🖱️',4.2,75],
 ['Noise-Cancelling Headset','Accessories','Orion',7200,'🎧',4.6,22],
 ['HD Webcam 1080p','Accessories','Orion',3500,'📷',4.1,30],
 ['USB-C Docking Station','Accessories','Axis',9600,'🔌',4.5,4],
 ['Laptop Stand','Accessories','Helix',2200,'💼',4.0,50],
 ['Ergonomic Office Chair','Furniture','Vertex',15900,'💺',4.7,14],
 ['Height-Adjustable Desk','Furniture','Vertex',28000,'🗄️',4.6,7],
 ['Filing Cabinet 3-Drawer','Furniture','Axis',8900,'🗄️',4.2,16],
 ['Monitor Arm Dual','Furniture','Helix',3900,'🖥️',4.3,25],
 ['Laser Printer A4','Office','Orion',11400,'🖨️',4.4,11],
 ['Whiteboard 4x3 ft','Office','Axis',3200,'📋',4.1,20],
 ['Document Shredder','Office','Vertex',6700,'📄',4.0,8],
 ['Conference Speakerphone','Office','Orion',8400,'📞',4.5,13],
 ['Wireless Presenter','Office','Helix',2100,'🎯',4.2,35],
 ['Wi-Fi 6 Router','Networking','Axis',7800,'📡',4.5,19],
 ['24-Port Network Switch','Networking','Axis',14500,'🌐',4.6,5],
 ['UPS 1 KVA','Networking','Vertex',9200,'🔋',4.3,10],
 ['1 TB Portable SSD','Storage','Northwind',8200,'💾',4.7,28],
 ['2 TB External HDD','Storage','Northwind',5600,'💽',4.2,0]
];
const PRODUCTS = RAW.map((r, i) => ({
  id: i + 1, name: r[0], cat: r[1], brand: r[2], price: r[3], icon: r[4],
  rating: r[5], stock: r[6], sku: 'NW-' + (1000 + i + 1),
  img: ''   // put an image path here (e.g. 'images/laptop.jpg') to show a photo instead of the emoji
}));

// ---------- Business rules ----------
const COUPONS = { SAVE10: {pct: 10, min: 0}, CORP20: {pct: 20, min: 50000} };
const TAX = 0.18;          // 18% GST
const BULK_QTY = 5;        // items needed for bulk discount
const BULK_PCT = 5;        // bulk discount %
const FREE_SHIP = 10000;   // free shipping above this amount
const SHIP = 499;          // flat shipping fee
const CART_KEY = 'nw_cart_v2';
const ORDER_KEY = 'nw_orders_' + currentUser.email;

// ---------- Helpers ----------
const $ = id => document.getElementById(id);
const inr = n => '₹' + n.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

let cart = {};          // { productId: quantity }
let coupon = null;      // applied coupon code
let activeCat = 'All';  // selected category chip

try {
  const s = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
  if (s) { cart = s.cart || {}; coupon = s.coupon || null; }
} catch (e) {}

const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify({cart, coupon})); } catch (e) {} };
const getOrders = () => { try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); } catch (e) { return []; } };

function toast(t) {
  const el = $('toast');
  el.textContent = t;
  el.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('on'), 1900);
}
function setMsg(t, c) { $('msg').textContent = t; $('msg').className = 'msg ' + (c || ''); }

// ---------- User header ----------
$('uname').textContent = currentUser.name;
$('urole').textContent = currentUser.role || '';
$('wname').textContent = currentUser.name.split(' ')[0];
$('av').textContent = currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
$('sProducts').textContent = PRODUCTS.length;

// ---------- Category chips ----------
function renderChips() {
  const cats = ['All', ...new Set(PRODUCTS.map(p => p.cat))];
  $('chips').innerHTML = cats.map(c => {
    const n = c === 'All' ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === c).length;
    return `<button class="chip ${c === activeCat ? 'on' : ''}" data-chip="${c}">${c}<i>${n}</i></button>`;
  }).join('');
}

// ---------- Product grid ----------
function renderGrid() {
  const q = $('q').value.trim().toLowerCase(), s = $('sort').value;
  let list = PRODUCTS.filter(p =>
    (activeCat === 'All' || p.cat === activeCat) &&
    (p.name + ' ' + p.brand + ' ' + p.sku).toLowerCase().includes(q));

  if (s === 'lh') list.sort((a, b) => a.price - b.price);
  if (s === 'hl') list.sort((a, b) => b.price - a.price);
  if (s === 'rt') list.sort((a, b) => b.rating - a.rating);
  if (s === 'az') list.sort((a, b) => a.name.localeCompare(b.name));

  $('result').textContent = 'Showing ' + list.length + ' of ' + PRODUCTS.length + ' products';

  $('grid').innerHTML = list.length ? list.map(p => {
    const inCart = cart[p.id] || 0;
    const tag = p.stock === 0 ? '<span class="tag out">Out of stock</span>'
              : p.stock <= 5 ? `<span class="tag">Only ${p.stock} left</span>` : '';
    const action = p.stock === 0
      ? '<button class="add" disabled>Out of stock</button>'
      : inCart
        ? `<div class="stepper"><button data-dec="${p.id}" aria-label="Decrease">−</button><b>${inCart} in cart</b><button data-inc="${p.id}" aria-label="Increase">+</button></div>`
        : `<button class="add" data-add="${p.id}">Add to cart</button>`;
    return `<article class="card">
      <div class="thumb">${p.img ? `<img src="${p.img}" alt="${p.name}">` : `<span aria-hidden="true">${p.icon}</span>`}${tag}</div>
      <div class="cb">
        <div class="meta"><span>${p.brand}</span><span>${p.sku}</span></div>
        <div class="name">${p.name}</div>
        <div class="rate" aria-label="Rating ${p.rating} out of 5">${stars(p.rating)}<small>${p.rating.toFixed(1)}</small></div>
        <div class="price">${inr(p.price)} <small>excl. GST</small></div>
        ${action}
      </div></article>`;
  }).join('') : '<p class="empty">No products match your search. Try a different keyword or category.</p>';
}

// ---------- Price calculation ----------
function calc() {
  const lines = Object.entries(cart)
    .map(([id, q]) => ({p: PRODUCTS.find(x => x.id == id), q}))
    .filter(l => l.p);

  const units     = lines.reduce((a, l) => a + l.q, 0);
  const subtotal  = lines.reduce((a, l) => a + l.p.price * l.q, 0);
  const bulk      = units >= BULK_QTY ? subtotal * BULK_PCT / 100 : 0;
  const cp        = coupon && COUPONS[coupon] && subtotal >= COUPONS[coupon].min ? COUPONS[coupon] : null;
  const couponAmt = cp ? (subtotal - bulk) * cp.pct / 100 : 0;
  const taxable   = subtotal - bulk - couponAmt;
  const tax       = taxable * TAX;
  const shipping  = units === 0 ? 0 : (taxable >= FREE_SHIP ? 0 : SHIP);

  return {lines, units, subtotal, bulk, cp, couponAmt, taxable, tax, shipping,
          total: taxable + tax + shipping};
}

// ---------- Cart rendering ----------
function renderCart() {
  const r = calc();
  $('count').textContent = r.units;

  $('items').innerHTML = r.lines.length ? r.lines.map(({p, q}) => `
    <div class="row">
      <div><div class="t">${p.name}</div><div class="u">${inr(p.price)} each</div></div>
      <div class="lt">${inr(p.price * q)}</div>
      <div class="qty">
        <button data-dec="${p.id}" aria-label="Decrease quantity of ${p.name}">−</button>
        <b>${q}</b>
        <button data-inc="${p.id}" aria-label="Increase quantity of ${p.name}">+</button>
      </div>
      <div style="text-align:right"><button class="rm" data-rm="${p.id}">Remove</button></div>
    </div>`).join('')
    : '<div class="empty">Your cart is empty. Add products from the catalogue.</div>';

  const L = (a, b, c = '') => `<div class="l ${c}"><span>${a}</span><span>${b}</span></div>`;
  $('totals').innerHTML =
      L('Subtotal (' + r.units + ' items)', inr(r.subtotal))
    + (r.bulk ? L('Bulk discount (' + BULK_PCT + '%)', '− ' + inr(r.bulk), 'd') : '')
    + (r.cp   ? L('Coupon ' + coupon + ' (' + r.cp.pct + '%)', '− ' + inr(r.couponAmt), 'd') : '')
    + L('GST (' + TAX * 100 + '%)', inr(r.tax))
    + L('Shipping', r.units ? (r.shipping ? inr(r.shipping) : 'Free') : '–')
    + L('Total', inr(r.total), 'tot');

  $('co').disabled = !r.units;
  if (coupon && !r.cp && COUPONS[coupon]) {
    setMsg('Coupon ' + coupon + ' needs a subtotal of ' + inr(COUPONS[coupon].min) + '.', 'err');
  }
  save();
  renderGrid();
}

// ---------- Cart actions ----------
function change(id, d) {
  const p = PRODUCTS.find(x => x.id == id);
  const n = (cart[id] || 0) + d;
  if (n > p.stock) { toast('Only ' + p.stock + ' in stock'); return; }
  if (n <= 0) delete cart[id]; else cart[id] = n;
  renderCart();
}

document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (t) {
    const d = t.dataset;
    if (d.add)  { change(d.add, 1); toast('Added to cart'); }
    if (d.inc)  change(d.inc, 1);
    if (d.dec)  change(d.dec, -1);
    if (d.rm)   { delete cart[d.rm]; renderCart(); toast('Item removed'); }
    if (d.chip) { activeCat = d.chip; renderChips(); renderGrid(); }
  }
  const row = e.target.closest('.olist');
  if (row) showInvoice(getOrders()[row.dataset.order]);
});

$('apply').onclick = () => {
  const c = $('code').value.trim().toUpperCase();
  if (!c) return setMsg('Enter a coupon code.', 'err');
  if (!COUPONS[c]) {
    coupon = null;
    setMsg('Invalid coupon code. Check the code and try again.', 'err');
    return renderCart();
  }
  if (calc().subtotal < COUPONS[c].min) {
    return setMsg('Coupon ' + c + ' needs a subtotal of ' + inr(COUPONS[c].min) + '.', 'err');
  }
  coupon = c;
  setMsg('Coupon ' + c + ' applied.', 'ok');
  renderCart();
};

function resetCart() {
  cart = {}; coupon = null;
  $('code').value = '';
  setMsg('');
  renderCart();
}
$('clear').onclick = resetCart;

// ---------- Orders & invoice ----------
function openModal(html) { $('mbody').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; }
$('mclose').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

$('co').onclick = () => {
  const r = calc();
  const order = {
    no: 'NW-' + Date.now().toString().slice(-7),
    date: new Date().toLocaleString('en-IN'),
    coupon: r.cp ? coupon : null,
    lines: r.lines.map(l => ({name: l.p.name, sku: l.p.sku, price: l.p.price, q: l.q})),
    subtotal: r.subtotal, bulk: r.bulk, couponAmt: r.couponAmt,
    tax: r.tax, shipping: r.shipping, total: r.total
  };
  r.lines.forEach(l => { l.p.stock -= l.q; });   // reduce stock for this session
  const all = getOrders();
  all.unshift(order);
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(all.slice(0, 20))); } catch (e) {}
  resetCart();
  showInvoice(order, true);
};

function showInvoice(o, fresh) {
  const L = (a, b) => `<tr><td colspan="3" class="r">${a}</td><td class="r">${b}</td></tr>`;
  openModal(`
    ${fresh ? '<span class="okbadge">Order placed successfully</span>' : ''}
    <h3>Tax invoice ${o.no}</h3>
    <div style="color:var(--muted);font-size:14px">${o.date}<br>Billed to: ${currentUser.name} (${currentUser.email})</div>
    <table>
      <tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
      ${o.lines.map(l => `<tr>
        <td>${l.name}<br><small style="color:var(--muted)">${l.sku}</small></td>
        <td class="r">${l.q}</td><td class="r">${inr(l.price)}</td><td class="r">${inr(l.price * l.q)}</td></tr>`).join('')}
      ${L('Subtotal', inr(o.subtotal))}
      ${o.bulk ? L('Bulk discount', '− ' + inr(o.bulk)) : ''}
      ${o.couponAmt ? L('Coupon ' + o.coupon, '− ' + inr(o.couponAmt)) : ''}
      ${L('GST (18%)', inr(o.tax))}
      ${L('Shipping', o.shipping ? inr(o.shipping) : 'Free')}
      ${L('<b>Total payable</b>', '<b>' + inr(o.total) + '</b>')}
    </table>
    <div class="noprint"><button class="pbtn" onclick="window.print()">Print invoice</button></div>`);
}

$('orders').onclick = () => {
  const all = getOrders();
  openModal('<h3>My orders</h3>' + (all.length
    ? all.map((o, i) => `<div class="olist" data-order="${i}">
        <div><b>${o.no}</b><br><small style="color:var(--muted)">${o.date} · ${o.lines.reduce((a, l) => a + l.q, 0)} items</small></div>
        <b>${inr(o.total)}</b></div>`).join('')
    : '<p class="empty">You have not placed any orders yet.</p>'));
};

// ---------- Navigation ----------
$('jump').onclick = () => $('cart').scrollIntoView({behavior: 'smooth'});
$('logout').onclick = () => {
  try { sessionStorage.removeItem('nw_user'); localStorage.removeItem('nw_user'); } catch (e) {}
  location.href = 'index.html';
};
['q', 'sort'].forEach(i => $(i).addEventListener('input', renderGrid));

// ---------- Init ----------
if (coupon) $('code').value = coupon;
renderChips();
renderCart();