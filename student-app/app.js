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

const BOLLYWOOD_QUOTES = [
  { text: "Bread pakode ki kasam, order jaldi aayega!", movie: "Band Baaja Baaraat" },
  { text: "Ye dhai kilo ka haath jab khane pe padta hai na, toh plate saaf ho jati hai.", movie: "Damini" },
  { text: "Tension lene ka nahi, sirf khana khane ka!", movie: "Munna Bhai M.B.B.S." },
  { text: "Bade bade shehron mein aisi choti choti bhook lagti rehti hai, Senorita.", movie: "Dilwale Dulhania Le Jayenge" },
  { text: "Ek chutki namak ki keemat tum kya jano Ramesh babu!", movie: "Om Shanti Om" },
  { text: "Mere Karan Arjun aayenge... aur mera khana bhi layenge!", movie: "Karan Arjun" },
  { text: "Khana khane ka ek style hota hai, aur ye mera style hai!", movie: "Hera Pheri" }
];
let quoteInterval = null;

function startQuotes() {
  const container = $('#bollywood-quote-container');
  const textEl = $('#bollywood-quote-text');
  const movieEl = $('#bollywood-quote-movie');
  if (!container) return;
  
  clearInterval(quoteInterval);
  
  const showRandomQuote = () => {
    const q = BOLLYWOOD_QUOTES[Math.floor(Math.random() * BOLLYWOOD_QUOTES.length)];
    container.style.opacity = 0;
    setTimeout(() => {
      textEl.textContent = `"${q.text}"`;
      movieEl.textContent = `— Inspired by ${q.movie}`;
      container.style.opacity = 1;
    }, 400);
  };
  
  showRandomQuote();
  quoteInterval = setInterval(showRandomQuote, 6000);
}

function stopQuotes() {
  clearInterval(quoteInterval);
}

const MENU_PHOTOS = {
  'itm-01': '../assets/vada-pav.webp', 'itm-02': '../assets/samosa.jpg', 'itm-03': '../assets/veg-sandwich.jpg', 'itm-04': '../assets/masala-chai.jpg',
  'itm-05': '../assets/veg-cutlet.jpg', 'itm-06': '../assets/poha.jpg', 'itm-07': '../assets/cold-coffee.jpg', 'itm-08': '../assets/veg-thali.jpg',
};
const savedPrev = localStorage.getItem('previousOrders');
const state = { menu: [], cart: new Map(), order: null, previousOrders: savedPrev ? JSON.parse(savedPrev) : [], orderSubscriptions: new Map(), unsubscribe: null, queueUnsubscribe: null, menuUnsubscribe: null, api: null, demoMode: true, activeOrders: [], noticeTimer: null };
const $ = (selector) => document.querySelector(selector);
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
const normaliseMenu = (item) => ({ ...item, prepTimeMin: item.prepTimeMin ?? item.prep_time_min, popularityCount: item.popularityCount ?? item.popularity_count ?? 0 });

async function setupApi() {
  try {
    // This exact relative path works after moving both team folders into one parent folder.
    const [{ createOrder, listenToOrders, listenToMenu }, { supabase }] = await Promise.all([
      import('../pages/queue-engine/queue-engine.js'),
      import('../pages/queue-engine/supabase-config.js'),
    ]);
    state.api = {
      createOrder,
      // Unlike the queue list, this includes cancelled orders so a student sees a rejection immediately.
      listenToOrder: (orderId, onChange) => {
        let stopped = false;
        let lastDataString = '';
        const emitLatest = async () => {
          const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
          if (!stopped && !error && data) {
            const newDataString = JSON.stringify(data);
            if (newDataString !== lastDataString) {
              lastDataString = newDataString;
              onChange(data);
            }
          }
        };
        emitLatest();
        const channel = supabase.channel(`student-order-${orderId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, emitLatest)
          .subscribe();
        const pollTimer = setInterval(emitLatest, 4_000);
        return () => { stopped = true; clearInterval(pollTimer); supabase.removeChannel(channel); };
      },
      listenToQueue: listenToOrders,
      listenToMenu,
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
      listenToOrder: (_id, _onChange) => () => { },
      listenToQueue: (onChange) => { onChange([]); return () => { }; },
      listenToMenu: (onChange) => { onChange(DEMO_MENU); return () => { }; },
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

function startMenuListener() {
  state.menuUnsubscribe?.();
  state.menuUnsubscribe = state.api.listenToMenu((items) => {
    const newMenu = items.map(normaliseMenu);
    if (JSON.stringify(newMenu) === JSON.stringify(state.menu)) return;
    state.menu = newMenu;
    const unavailableIds = new Set(state.menu.filter((item) => item.available === false).map((item) => item.id));
    const removedFromCart = [...state.cart.keys()].some((id) => unavailableIds.has(id));
    unavailableIds.forEach((id) => state.cart.delete(id));
    const availableCount = state.menu.filter((item) => item.available !== false).length;
    if (!availableCount) $('#menu-state').textContent = 'No items available right now';
    else $('#menu-state').textContent = state.demoMode ? 'Demo menu' : `${availableCount} items available`;
    renderMenu(); renderCombos(); renderCart();
    if (removedFromCart) showStudentNotice('A canteen item became unavailable and was removed from your cart.');
  });
}

function renderMenu() {
  const grid = $('#menu-grid'); const template = $('#menu-item-template'); grid.replaceChildren();
  state.menu.forEach((item) => {
    const node = template.content.cloneNode(true);
    const photo = node.querySelector('.menu-photo');
    let imgSrc = MENU_PHOTOS[item.id];
    if (!imgSrc) {
      const lowerName = item.name.toLowerCase();
      if (lowerName.includes('chole') || lowerName.includes('bhature')) imgSrc = '../assets/chole-bhature.png';
      else if (lowerName.includes('chaap') || lowerName.includes('chapp')) imgSrc = '../assets/soya-chaap.png';
      else imgSrc = '../assets/veg-thali.jpg';
    }
    photo.src = imgSrc;
    photo.alt = item.name;
    const isAvailable = item.available !== false;
    const card = node.querySelector('.menu-item'); card.classList.toggle('is-unavailable', !isAvailable);
    card.dataset.id = item.id;
    node.querySelector('.prep-time').textContent = `${item.prepTimeMin} min prep`;
    node.querySelector('h3').textContent = item.name;
    node.querySelector('.item-price').textContent = money(item.price);
    if (item.popularityCount >= 20 && isAvailable) node.querySelector('.popular-badge').hidden = false;
    node.querySelector('.unavailable-badge').hidden = isAvailable;
    const control = node.querySelector('.item-control');
    const qty = state.cart.get(item.id)?.qty ?? 0;
    control.append(isAvailable ? (qty ? createStepper(item, qty) : createAddButton(item)) : createUnavailableButton()); grid.append(node);
  });
}
function createAddButton(item) { const button = document.createElement('button'); button.className = 'add-button'; button.textContent = 'Add'; button.onclick = () => changeQty(item, 1); return button; }
function createUnavailableButton() { const button = document.createElement('button'); button.type = 'button'; button.className = 'unavailable-button'; button.textContent = 'Unavailable'; button.disabled = true; return button; }
function createStepper(item, qty) {
  const wrapper = document.createElement('div'); wrapper.className = 'stepper';
  const remove = document.createElement('button'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove one ${item.name}`); remove.textContent = '−'; remove.onclick = () => changeQty(item, -1);
  const count = document.createElement('span'); count.textContent = qty; count.setAttribute('aria-label', `${qty} ${item.name}`);
  const add = document.createElement('button'); add.type = 'button'; add.setAttribute('aria-label', `Add one ${item.name}`); add.textContent = '+'; add.onclick = () => changeQty(item, 1);
  wrapper.append(remove, count, add); return wrapper;
}
function changeQty(item, delta) { 
  const current = state.cart.get(item.id)?.qty ?? 0; 
  const qty = Math.max(0, current + delta); 
  if (qty) state.cart.set(item.id, { ...item, qty }); 
  else state.cart.delete(item.id); 
  
  const card = document.querySelector(`.menu-item[data-id="${item.id}"]`);
  if (card) {
    const control = card.querySelector('.item-control');
    control.replaceChildren();
    control.append(item.available !== false ? (qty ? createStepper(item, qty) : createAddButton(item)) : createUnavailableButton());
  }
  
  renderCart(); 
}

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
  pairs.forEach((pair) => {
    const items = pair.map((name) => state.menu.find((item) => item.name === name && item.available !== false)).filter(Boolean);
    if (items.length !== 2) return;
    const button = document.createElement('button'); button.className = 'combo-button';
    const photos = document.createElement('span'); photos.className = 'combo-photos';
    items.forEach((item) => { const image = document.createElement('img'); image.src = MENU_PHOTOS[item.id] ?? 'assets/veg-thali.jpg'; image.alt = ''; photos.append(image); });
    const copy = document.createElement('span'); copy.className = 'combo-copy';
    const title = document.createElement('strong'); title.textContent = pair.join(' + ');
    const price = document.createElement('small'); price.textContent = `${money(items.reduce((sum, item) => sum + Number(item.price), 0))} together`;
    copy.append(title, price);
    const action = document.createElement('span'); action.className = 'combo-action'; action.textContent = 'Add both';
    button.append(photos, copy, action); button.onclick = () => items.forEach((item) => changeQty(item, 1)); list.append(button);
  });
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
  const button = $('#place-order-button'); 
  const items = [...state.cart.values()].map(({ id, name, qty }) => ({ menuId: id, name, qty })); 
  if (!items.length) return;
  
  const originalTotal = $('#place-order-total').textContent;
  button.disabled = true; 
  // Preserve the span so renderCart doesn't crash when it tries to update it!
  button.innerHTML = `Placing order… <span id="place-order-total">${originalTotal}</span>`; 
  $('#order-error').textContent = '';
  
  try {
    const totalAmount = [...state.cart.values()].reduce((sum, item) => sum + item.qty * item.price, 0);
    const order = await state.api.createOrder(items); 
    state.cart.clear(); 
    
    sessionStorage.setItem('awaitingOrder', JSON.stringify(order));
    
    const token = encodeURIComponent(order.token || '');
    const pickup = encodeURIComponent(order.estimated_ready_at || order.estimatedReadyAt || '');
    window.location.href = `../pages/PAyment placeholder/payment.html?subtotal=${totalAmount}&pickup=${pickup}&token=${token}`;
  } catch (error) { 
    console.error('Order placement failed:', error); 
    $('#order-error').textContent = friendlyOrderError(error); 
    button.disabled = false; 
    button.innerHTML = `Place order <span id="place-order-total">${originalTotal}</span>`; 
  }
}
function friendlyOrderError(error) {
  const detail = String(error?.message || '');
  if (/next_order_token|function|rpc/i.test(detail)) return 'Setup needed: run queue-engine/database-migration.sql in Supabase, then refresh this page.';
  if (/priority|available|column/i.test(detail)) return 'Database update needed: run queue-engine/database-migration.sql in Supabase, then refresh this page.';
  return 'We could not place that order. Check your internet connection and try again.';
}
function showConfirmation(order) {
  state.order = normaliseOrder(order); $('#browse-view').hidden = true; $('#cart').hidden = true; $('#confirmation-view').hidden = false; updateOrderUI(state.order);
  
  startQuotes();

  if (Notification.permission === 'default') Notification.requestPermission();
  
  updatePreviousOrderInState(state.order);
  subscribeToActivePreviousOrders();
}

function subscribeToActivePreviousOrders() {
  if (!state.orderSubscriptions) state.orderSubscriptions = new Map();
  state.previousOrders.forEach(order => {
    if (['ready', 'picked_up', 'cancelled'].includes(order.status)) return;
    if (state.orderSubscriptions.has(order.id)) return;
    
    const unsub = state.api.listenToOrder(order.id, (latest) => {
      const normLatest = normaliseOrder(latest);
      
      if (state.order && state.order.id === order.id) {
        const wasCancelled = state.order.status === 'cancelled'; 
        const wasReady = state.order.status === 'ready';
        state.order = normLatest; 
        updateOrderUI(state.order);
        
        if (state.order.status === 'cancelled' && !wasCancelled) showStudentNotice('Order rejected — the canteen could not accept this order. Please choose another available item.');
        if (state.order.status === 'ready' && !wasReady) showReadyNotification(state.order);
        
        if (['ready', 'picked_up', 'cancelled'].includes(state.order.status)) {
          stopQuotes();
        }
      }
      
      updatePreviousOrderInState(normLatest);
      
      if (['ready', 'picked_up', 'cancelled'].includes(normLatest.status)) {
        unsub();
        state.orderSubscriptions.delete(order.id);
      }
    });
    state.orderSubscriptions.set(order.id, unsub);
  });
}
function showReadyNotification(order) {
  const title = 'Order Ready!';
  const options = {
    body: `Your token ${order.token} is ready for pickup at the counter.`,
    icon: 'https://cdn-icons-png.flaticon.com/512/3280/3280041.png'
  };
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  } else {
    showStudentNotice(`Your token ${order.token} is ready for pickup!`);
  }
}
function normaliseOrder(order) { return { ...order, placedAt: order.placedAt ?? order.placed_at, estimatedReadyAt: order.estimatedReadyAt ?? order.estimated_ready_at }; }
function updateOrderUI(order) {
  $('#order-token').textContent = order.token; const ready = new Date(order.estimatedReadyAt); const now = Date.now(); const minutes = Math.max(0, Math.ceil((ready.getTime() - now) / 60000));
  $('#ready-time').textContent = order.status === 'cancelled' ? 'Not confirmed' : ready.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); $('#wait-time').textContent = order.status === 'ready' ? 'Ready now' : order.status === 'cancelled' ? 'Cancelled' : `${minutes} min`;
  const stage = { queued: 0, preparing: 1, ready: 2, picked_up: 2 }[order.status] ?? 0; 
  const rocket = $('#rocket-icon'); if (rocket) rocket.style.left = `calc(${[0, 50, 100][stage]}% - 18px)`;
  document.querySelectorAll('[data-step]').forEach((step, index) => step.classList.toggle('is-active', index <= stage));
  $('#status-message').textContent = ({ queued: 'Waiting for the canteen to accept your order. Your pickup estimate will stay updated.', preparing: 'Accepted — the kitchen is preparing your order now.', ready: 'Your order is ready for pickup.', picked_up: 'Order collected. Enjoy your meal!', cancelled: 'The canteen could not accept this order. Please place a new order or speak to the counter.' })[order.status] ?? 'Your order is being updated.';
}
function showStudentNotice(message) {
  const notice = $('#student-notice'); clearTimeout(state.noticeTimer); notice.textContent = message; notice.hidden = false;
  state.noticeTimer = setTimeout(() => { notice.hidden = true; }, 7_000);
}

function resetForNewOrder() {
  stopQuotes();
  // We no longer unsubscribe from everything here, just the current confirmation view.
  // orderSubscriptions handle previous orders.
  state.order = null; state.cart.clear();
  $('#order-error').textContent = ''; $('#confirmation-view').hidden = true; $('#browse-view').hidden = false; $('#cart').hidden = false;
  renderMenu(); renderCart(); renderPreviousOrders();
  const button = $('#place-order-button'); button.innerHTML = `Place order <span id="place-order-total">${$('#place-order-total').textContent}</span>`; button.disabled = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.dismissPreviousOrder = function(orderId) {
  state.previousOrders = state.previousOrders.filter(o => o.id !== orderId);
  localStorage.setItem('previousOrders', JSON.stringify(state.previousOrders));
  renderPreviousOrders();
};

function updatePreviousOrderInState(order) {
  const norm = normaliseOrder(order);
  const index = state.previousOrders.findIndex(o => o.id === norm.id);
  if (index !== -1) {
    state.previousOrders[index] = norm;
  } else {
    state.previousOrders.unshift(norm);
  }
  localStorage.setItem('previousOrders', JSON.stringify(state.previousOrders));
  renderPreviousOrders();
}

function renderPreviousOrders() {
  const container = $('#previous-order-container');
  const list = $('#previous-orders-list');
  if (!container || !list) return;
  
  if (!state.previousOrders || state.previousOrders.length === 0) {
    container.hidden = true;
    return;
  }
  
  container.hidden = false;
  list.innerHTML = '';
  
  state.previousOrders.forEach(order => {
    const box = document.createElement('div');
    box.className = 'previous-order-box';
    
    let statusText = '';
    if (order.status === 'cancelled') {
      box.classList.add('is-rejected');
      statusText = '<div class="prev-order-status">Order Rejected</div>';
    } else if (order.status === 'ready' || order.status === 'picked_up') {
      box.classList.add('is-prepared');
      statusText = '<div class="prev-order-status">Order Prepared</div>';
    }
    
    const token = order.token || 'Unknown';
    const items = (order.items || []).map(item => `${item.qty}x ${item.name}`).join(', ');
    
    box.innerHTML = `
      <button class="dismiss-button" aria-label="Dismiss order" onclick="window.dismissPreviousOrder('${order.id}')">&times;</button>
      ${statusText}
      <div class="prev-order-token">Token: <strong>${token}</strong></div>
      <div class="prev-order-items">${items}</div>
    `;
    list.appendChild(box);
  });
}
function initCart() { $('#cart-toggle').onclick = () => { const cart = $('#cart'); cart.classList.toggle('is-open'); $('#cart-toggle').setAttribute('aria-expanded', String(cart.classList.contains('is-open'))); $('#cart-toggle').textContent = cart.classList.contains('is-open') ? 'Close cart' : 'View cart'; }; $('#place-order-button').onclick = placeOrder; $('#new-order-button').onclick = resetForNewOrder; renderCart(); renderPreviousOrders(); }

await setupApi(); initCart(); await loadMenu(); startMenuListener(); startQueueListener(); subscribeToActivePreviousOrders();

const savedOrder = sessionStorage.getItem('awaitingOrder');
if (savedOrder) {
  sessionStorage.removeItem('awaitingOrder');
  showConfirmation(JSON.parse(savedOrder));
}
