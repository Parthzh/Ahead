import { listenToMenu, listenToOrders, updateMenuAvailability, updateOrderStatus } from '../queue-engine/queue-engine.js';
import { playAlert } from '../audio/audio.js';
const COMPACT_MENU_LIMIT = 4;
const state = { queuedOrders: [], preparingOrders: [], menu: [], unsubscribeOrders: null };
const dialog = document.getElementById('confirmation-dialog');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const currentOrderEl = document.getElementById('current-order');
const upcomingListEl = document.getElementById('upcoming-list');
const availabilityListEl = document.getElementById('availability-list');
const availabilityDialog = document.getElementById('availability-dialog');
const availabilityDialogListEl = document.getElementById('availability-dialog-list');

function setConnectionState(connectionState) {
  const text = document.getElementById('live-text');
  const dot = document.getElementById('live-dot');
  const banner = document.getElementById('connection-banner');
  dot.className = `live-dot is-${connectionState}`;
  text.textContent = connectionState === 'live' ? 'Live' : connectionState === 'disconnected' ? 'Connection lost' : 'Connecting…';
  banner.hidden = connectionState !== 'disconnected';
  if (connectionState === 'disconnected') document.getElementById('connection-message').textContent = 'Updates are paused. Check your connection, then reconnect.';
}

function setOrders(orders) {
  const newQueued = orders.filter((order) => order.status === 'queued').sort((first, second) => new Date(first.placed_at) - new Date(second.placed_at));
  
  if (newQueued.length > state.queuedOrders.length) {
    playAlert();
  }
  
  state.queuedOrders = newQueued;
  state.preparingOrders = orders.filter((order) => order.status === 'preparing').sort((first, second) => new Date(first.placed_at) - new Date(second.placed_at));
  
  document.getElementById('queued-count').textContent = state.queuedOrders.length;
  document.getElementById('preparing-count').textContent = state.preparingOrders.length;
  renderOrders();
}

function renderOrders() {
  const [currentOrder, ...upcomingOrders] = state.queuedOrders;
  currentOrderEl.replaceChildren(currentOrder ? buildCurrentOrder(currentOrder) : emptyState('No orders waiting for approval.'));
  upcomingListEl.replaceChildren(...(upcomingOrders.length ? upcomingOrders.map(buildUpcomingOrder) : [emptyState('No upcoming orders.')]));
  
  const preparingListEl = document.getElementById('preparing-list');
  if (preparingListEl) {
    preparingListEl.replaceChildren(...(state.preparingOrders.length ? state.preparingOrders.map(buildPreparingOrder) : [emptyState('No orders in preparation.')]));
  }
}

function buildCurrentOrder(order) {
  const card = document.createElement('article');
  card.className = 'decision-card';
  const details = document.createElement('div');
  details.innerHTML = `<span class="token">${escapeHtml(order.token || '—')}</span><p class="order-meta">Placed ${formatAge(order.placed_at)}</p>`;
  details.append(buildItemList(order.items));
  const actions = document.createElement('div');
  actions.className = 'decision-actions';
  actions.append(actionButton('Approve order', 'button-primary', () => decide(order, 'preparing')));
  actions.append(actionButton('Reject order', 'button-danger', () => decide(order, 'cancelled')));
  card.append(details, actions);
  return card;
}

function buildUpcomingOrder(order) {
  const row = document.createElement('article');
  row.className = 'upcoming-row';
  row.innerHTML = `<span class="upcoming-token">${escapeHtml(order.token || '—')}</span><span class="upcoming-items">${escapeHtml(itemSummary(order.items))}</span>`;
  const actions = document.createElement('div');
  actions.className = 'row-actions';
  actions.append(actionButton('Approve', 'button-primary', () => decide(order, 'preparing')));
  actions.append(actionButton('Reject', 'button-danger', () => decide(order, 'cancelled')));
  row.append(actions);
  return row;
}

function buildPreparingOrder(order) {
  const row = document.createElement('article');
  row.className = 'upcoming-row preparing-row';
  row.innerHTML = `<span class="upcoming-token">${escapeHtml(order.token || '—')}</span><span class="upcoming-items">${escapeHtml(itemSummary(order.items))}</span>`;
  const actions = document.createElement('div');
  actions.className = 'row-actions';
  actions.append(actionButton('Mark Ready', 'button-primary', () => decide(order, 'ready')));
  row.append(actions);
  return row;
}

function renderMenu(menu) {
  state.menu = menu;
  const availabilityToggle = document.getElementById('availability-toggle');
  const hasHiddenItems = menu.length > COMPACT_MENU_LIMIT;
  availabilityToggle.hidden = !hasHiddenItems;
  availabilityToggle.setAttribute('aria-expanded', String(availabilityDialog.open));
  availabilityListEl.replaceChildren(...menu.slice(0, COMPACT_MENU_LIMIT).map(buildAvailabilityCard));
  availabilityDialogListEl.replaceChildren(...menu.map(buildAvailabilityCard));
}

function buildAvailabilityCard(item) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = `availability-item${item.available ? ' is-available' : ''}`;
  card.setAttribute('aria-pressed', String(Boolean(item.available)));
  card.setAttribute('aria-label', `${item.name}: ${item.available ? 'available' : 'unavailable'}. Activate to change.`);
  card.innerHTML = `<span class="availability-name">${escapeHtml(item.name)}</span><span class="availability-status">${item.available ? 'Available' : 'Unavailable'}</span>`;
  card.addEventListener('click', async () => {
    card.disabled = true;
    try {
      await updateMenuAvailability(item.id, !item.available);
      renderMenu(state.menu.map((menuItem) => menuItem.id === item.id ? { ...menuItem, available: !item.available } : menuItem));
    } catch (error) { showError(`Could not change ${item.name}: ${error.message}`); }
    finally { card.disabled = false; }
  });
  return card;
}

async function decide(order, status) {
  if (status === 'ready') {
    confirmTitle.textContent = `Mark ${order.token} ready?`;
    confirmMessage.textContent = 'This will notify the student to pick it up and remove it from the active queue.';
  } else {
    const isApproval = status === 'preparing';
    confirmTitle.textContent = `${isApproval ? 'Approve' : 'Reject'} ${order.token}?`;
    confirmMessage.textContent = isApproval ? 'This order will move into preparation.' : 'This order will be cancelled and removed from the active queue.';
  }
  if (await openDialog() !== 'confirm') return;
  try { await updateOrderStatus(order.id, status); }
  catch (error) { showError(`Could not update ${order.token}: ${error.message}`); }
}

function actionButton(label, className, handler) { const button = document.createElement('button'); button.type = 'button'; button.className = className; button.textContent = label; button.addEventListener('click', handler); return button; }
function buildItemList(items = []) { const list = document.createElement('ul'); list.className = 'item-list'; items.forEach((item) => { const entry = document.createElement('li'); entry.textContent = `${item.qty || 1}× ${item.name || item.id || 'Item'}`; list.append(entry); }); return list; }
function emptyState(message) { const paragraph = document.createElement('p'); paragraph.className = 'empty-state'; paragraph.textContent = message; return paragraph; }
function itemSummary(items = []) { return items.map((item) => `${item.qty || 1}× ${item.name || item.id || 'Item'}`).join(' · '); }
function formatAge(value) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 1 ? 'just now' : `${minutes} min ago`; }
function escapeHtml(value) { const element = document.createElement('span'); element.textContent = value; return element.innerHTML; }
function showError(message) { document.getElementById('connection-message').textContent = message; document.getElementById('connection-banner').hidden = false; }
function openDialog() { return new Promise((resolve) => { dialog.addEventListener('close', () => resolve(dialog.returnValue), { once: true }); dialog.showModal(); }); }

document.getElementById('refresh-button').addEventListener('click', () => state.unsubscribeOrders?.refresh());
document.getElementById('reconnect-button').addEventListener('click', () => state.unsubscribeOrders?.refresh());
document.getElementById('availability-toggle').addEventListener('click', () => {
  availabilityDialog.showModal();
  document.getElementById('availability-toggle').setAttribute('aria-expanded', 'true');
});
document.getElementById('availability-dialog-close').addEventListener('click', () => availabilityDialog.close());
availabilityDialog.addEventListener('close', () => document.getElementById('availability-toggle').setAttribute('aria-expanded', 'false'));
document.getElementById('logout-button').addEventListener('click', () => {
  sessionStorage.removeItem('vendor_auth');
  window.location.replace('login.html');
});
state.unsubscribeOrders = listenToOrders(setOrders, { onConnectionState: setConnectionState, onError: (error) => showError(`Connection problem: ${error.message}`) });
const stopMenuListener = listenToMenu(renderMenu, { onError: (error) => showError(`Could not load menu: ${error.message}`) });
window.addEventListener('beforeunload', () => { state.unsubscribeOrders?.(); stopMenuListener(); });
