/*
  Ahead student ordering page.

  INTEGRATION (after your team puts folders together):
  1. Place this `student-app` folder beside P1's `queue-engine` folder.
  2. The dynamic import below will then use P1's real createOrder() and
     Supabase client automatically. No Firebase config belongs in this page.
  3. Run through a local web server (see index.html) and open DevTools Console.
     You should see "Ahead: connected to shared queue engine".

  Until queue-engine is beside this folder, this uses local demo data so the
  complete menu → cart → token flow remains visible and testable.
*/

const DEMO_MENU = [
  { id: 'itm-01', name: 'Vada Pav', price: 20, prep_time_min: 3, popularity_count: 32 },
  { id: 'itm-02', name: 'Samosa (2 pcs)', price: 25, prep_time_min: 2, popularity_count: 28 },
  { id: 'itm-03', name: 'Veg Sandwich', price: 40, prep_time_min: 5, popularity_count: 25 },
  { id: 'itm-04', name: 'Masala Chai', price: 15, prep_time_min: 4, popularity_count: 22 },
  { id: 'itm-05', name: 'Veg Cutlet', price: 30, prep_time_min: 6, popularity_count: 17 },
  { id: 'itm-06', name: 'Poha', price: 35, prep_time_min: 7, popularity_count: 15 },
  { id: 'itm-07', name: 'Cold Coffee', price: 45, prep_time_min: 3, popularity_count: 19 },
  { id: 'itm-08', name: 'Veg Thali (mini)', price: 80, prep_time_min: 10, popularity_count: 12 },
];

const MENU_PHOTOS = {
  'itm-01': 'assets/vada-pav.webp', 'itm-02': 'assets/samosa.jpg', 'itm-03': 'assets/veg-sandwich.jpg', 'itm-04': 'assets/masala-chai.jpg',
  'itm-05': 'assets/veg-cutlet.jpg', 'itm-06': 'assets/poha.jpg', 'itm-07': 'assets/cold-coffee.jpg', 'itm-08': 'assets/veg-thali.jpg',
};
const state = { menu: [], cart: new Map(), order: null, unsubscribe: null, queueUnsubscribe: null, api: null, demoMode: true, activeOrders: [] };
const $ = (selector) => document.querySelector(selector);
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
const normaliseMenu = (item) => ({ ...item, prepTimeMin: item.prepTimeMin ?? item.prep_time_min, popularityCount: item.popularityCount ?? item.popularity_count ?? 0 });

async function setupApi() {
  try {
    // This exact relative path works after moving both team folders into one parent folder.
    const [{ createOrder, listenToOrders }, { supabase }] = await Promise.all([
      import('../queue-engine/queue-engine.js'),
      import('../queue-engine/supabase-config.js'),
    ]);
    state.api = {
      createOrder,
      listenToOrder: (orderId, onChange) => {
        const stop = listenToOrders((orders) => {
          const latest = orders.find((order) => order.id === orderId);
          if (latest) onChange(latest);
        });
        return stop;
      },
      listenToQueue: listenToOrders,
      loadMenu: async () => {
        const { data, error } = await supabase.from('menu').select('*').order('name');
        if (error) throw error;
        return data.map(normaliseMenu);
      },
    };
    state.demoMode = false;
    console.info('Ahead: connected to shared queue engine.');
  } catch (error) {
    console.info('Ahead: running standalone demo mode. Add ../queue-engine to connect live data.', error.message);
    let demoCounter = 17;
    state.api = {
      loadMenu: async () => DEMO_MENU.map(normaliseMenu),
      createOrder: async (items) => ({ id: crypto.randomUUID(), token: `A-${String(++demoCounter).padStart(3, '0')}`, items, status: 'queued', placed_at: new Date().toISOString(), estimated_ready_at: new Date(Date.now() + 12 * 60000).toISOString() }),
      listenToOrder: (_id, _onChange) => () => {},
      listenToQueue: (onChange) => { onChange([]); return () => {}; },
    };
  }
}

async function loadMenu() {
  try {
    state.menu = await state.api.loadMenu();
    $('#menu-state').textContent = state.demoMode ? 'Demo menu' : `${state.menu.length} items available`;
    renderMenu(); renderCombos(); updateRushMeter();
  } catch (error) {
    console.error('Could not load menu:', error);
    $('#menu-state').textContent = 'Menu unavailable';
    $('#menu-grid').innerHTML = '<p class="empty-cart">The menu could not load. Check your Supabase connection and try again.</p>';
  }
}

function renderMenu() {
  const grid = $('#menu-grid'); const template = $('#menu-item-template'); grid.replaceChildren();
  state.menu.forEach((item) => {
    const node = template.content.cloneNode(true);
    const photo = node.querySelector('.menu-photo'); photo.src = MENU_PHOTOS[item.id] ?? 'assets/veg-thali.jpg'; photo.alt = item.name;
    node.querySelector('.prep-time').textContent = `${item.prepTimeMin} min prep`;
    node.querySelector('h3').textContent = item.name;
    node.querySelector('.item-price').textContent = money(item.price);
    if (item.popularityCount >= 20) node.querySelector('.popular-badge').hidden = false;
    const control = node.querySelector('.item-control');
    const qty = state.cart.get(item.id)?.qty ?? 0;
    control.append(qty ? createStepper(item, qty) : createAddButton(item)); grid.append(node);
  });
}
function createAddButton(item) { const button = document.createElement('button'); button.className = 'add-button'; button.textContent = 'Add'; button.onclick = () => changeQty(item, 1); return button; }
function createStepper(item, qty) {
  const wrapper = document.createElement('div'); wrapper.className = 'stepper';
  const remove = document.createElement('button'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove one ${item.name}`); remove.textContent = '−'; remove.onclick = () => changeQty(item, -1);
  const count = document.createElement('span'); count.textContent = qty; count.setAttribute('aria-label', `${qty} ${item.name}`);
  const add = document.createElement('button'); add.type = 'button'; add.setAttribute('aria-label', `Add one ${item.name}`); add.textContent = '+'; add.onclick = () => changeQty(item, 1);
  wrapper.append(remove, count, add); return wrapper;
}
function changeQty(item, delta) { const current = state.cart.get(item.id)?.qty ?? 0; const qty = Math.max(0, current + delta); if (qty) state.cart.set(item.id, { ...item, qty }); else state.cart.delete(item.id); renderMenu(); renderCart(); }

function renderCart() {
  const items = [...state.cart.values()]; const count = items.reduce((sum, item) => sum + item.qty, 0); const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  $('#cart-count').textContent = `${count} item${count === 1 ? '' : 's'}`; $('#cart-total').textContent = money(total); $('#place-order-total').textContent = money(total); $('#place-order-button').disabled = !count;
  const container = $('#cart-items'); container.replaceChildren();
  if (!items.length) { container.innerHTML = '<p class="empty-cart">Your cart is waiting for something delicious.</p>'; return; }
  items.forEach((item) => { const row = document.createElement('div'); row.className = 'cart-item'; row.innerHTML = `<span class="cart-item-name"></span><span class="cart-item-price">${money(item.price * item.qty)}</span>`; row.querySelector('.cart-item-name').textContent = item.name; row.append(createStepper(item, item.qty)); container.append(row); });
}

function renderCombos() {
  const pairs = [['Masala Chai', 'Samosa (2 pcs)'], ['Cold Coffee', 'Veg Sandwich'], ['Vada Pav', 'Masala Chai']];
  const list = $('#combo-list'); list.replaceChildren();
  pairs.forEach((pair) => { const items = pair.map((name) => state.menu.find((item) => item.name === name)).filter(Boolean); if (items.length !== 2) return; const button = document.createElement('button'); button.className = 'combo-button'; button.innerHTML = `<span>${pair.join(' + ')}</span><span>Add both</span>`; button.onclick = () => items.forEach((item) => changeQty(item, 1)); list.append(button); });
}
function updateRushMeter() {
  const meter = $('.rush-meter');
  const activeItems = state.activeOrders.reduce((total, order) => total + (order.items ?? []).reduce((sum, item) => sum + (item.qty || 1), 0), 0);
  const isBusy = activeItems >= 10; const isModerate = activeItems >= 5;
  meter.classList.toggle('is-busy', isBusy);
  $('#rush-level').textContent = isBusy ? 'Peak rush' : isModerate ? 'Steady crowd' : 'Low crowd';
  $('#rush-detail').textContent = isBusy ? `${state.activeOrders.length} active orders — expect a longer wait` : isModerate ? `${state.activeOrders.length} active orders in progress` : 'Good time to order';
}

function startQueueListener() {
  state.queueUnsubscribe?.();
  state.queueUnsubscribe = state.api.listenToQueue((orders) => {
    state.activeOrders = orders.filter((order) => ['queued', 'preparing'].includes(order.status));
    updateRushMeter();
  });
}

async function placeOrder() {
  const button = $('#place-order-button'); const items = [...state.cart.values()].map(({ id, name, qty }) => ({ menuId: id, name, qty })); if (!items.length) return;
  button.disabled = true; button.textContent = 'Placing order…'; $('#order-error').textContent = '';
  try {
    const order = await state.api.createOrder(items); showConfirmation(order); state.cart.clear(); renderCart();
  } catch (error) { console.error('Order placement failed:', error); $('#order-error').textContent = 'We could not place that order. Check the connection and try again.'; button.disabled = false; button.innerHTML = `Place order <span>${$('#place-order-total').textContent}</span>`; }
}
function showConfirmation(order) {
  state.order = normaliseOrder(order); $('#browse-view').hidden = true; $('#cart').hidden = true; $('#confirmation-view').hidden = false; updateOrderUI(state.order);
  state.unsubscribe?.(); state.unsubscribe = state.api.listenToOrder(state.order.id, (latest) => { state.order = normaliseOrder(latest); updateOrderUI(state.order); });
}
function normaliseOrder(order) { return { ...order, placedAt: order.placedAt ?? order.placed_at, estimatedReadyAt: order.estimatedReadyAt ?? order.estimated_ready_at }; }
function updateOrderUI(order) {
  $('#order-token').textContent = order.token; const ready = new Date(order.estimatedReadyAt); const now = Date.now(); const minutes = Math.max(0, Math.ceil((ready.getTime() - now) / 60000));
  $('#ready-time').textContent = ready.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); $('#wait-time').textContent = order.status === 'ready' ? 'Ready now' : `${minutes} min`;
  const stage = { queued: 0, preparing: 1, ready: 2, picked_up: 2 }[order.status] ?? 0; $('#progress-fill').style.width = `${[10, 54, 100][stage]}%`;
  document.querySelectorAll('[data-step]').forEach((step, index) => step.classList.toggle('is-active', index <= stage));
  $('#status-message').textContent = ({ queued: 'Waiting for the canteen to accept your order. Your pickup estimate will stay updated.', preparing: 'Accepted — the kitchen is preparing your order now.', ready: 'Your order is ready for pickup.', picked_up: 'Order collected. Enjoy your meal!' })[order.status] ?? 'Your order is being updated.';
}

function resetForNewOrder() { state.unsubscribe?.(); state.unsubscribe = null; $('#confirmation-view').hidden = true; $('#browse-view').hidden = false; $('#cart').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function initCart() { $('#cart-toggle').onclick = () => { const cart = $('#cart'); cart.classList.toggle('is-open'); $('#cart-toggle').setAttribute('aria-expanded', String(cart.classList.contains('is-open'))); $('#cart-toggle').textContent = cart.classList.contains('is-open') ? 'Close cart' : 'View cart'; }; $('#place-order-button').onclick = placeOrder; $('#new-order-button').onclick = resetForNewOrder; renderCart(); }

await setupApi(); initCart(); await loadMenu(); startQueueListener();
