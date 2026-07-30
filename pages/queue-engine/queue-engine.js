import { supabase } from './supabase-config.js';
import { estimateWaitTime } from '../wait-time/wait-time.js';

const ACTIVE_STATUSES = ['queued', 'preparing'];
const VALID_STATUSES = ['queued', 'preparing', 'ready', 'picked_up', 'cancelled'];
const VALID_PRIORITIES = ['normal', 'urgent', 'vip'];
const CONFIG_ROW_ID = 1;
const RETRY_DELAYS_MS = [400, 1_000, 2_000];
const POLL_INTERVAL_MS = 4_000;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function withRetry(operation, description) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_DELAYS_MS.length) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  console.error(`${description} failed after retries:`, lastError);
  throw lastError;
}

async function getConfig() {
  const { data, error } = await supabase.from('config').select('*').eq('id', CONFIG_ROW_ID).single();
  if (error) throw error;
  return data;
}

function itemCount(orders) {
  return orders.reduce((total, order) => total + (order.items || []).reduce((sum, item) => sum + (item.qty || 1), 0), 0);
}

export async function generateToken() {
  const { data, error } = await supabase.rpc('next_order_token');
  if (error) throw new Error(`Could not generate token: ${error.message}`);
  return data;
}

export async function createOrder(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('createOrder requires a non-empty items array');

  return withRetry(async () => {
    const [token, config, activeResult] = await Promise.all([
      generateToken(), getConfig(), supabase.from('orders').select('items').in('status', ACTIVE_STATUSES),
    ]);
    if (activeResult.error) throw activeResult.error;

    const waitMinutes = estimateWaitTime({ items }, activeResult.data, config);
    const placedAt = new Date();
    const { data, error } = await supabase.from('orders').insert({
      token, items, status: 'queued', priority: 'normal', placed_at: placedAt.toISOString(),
      estimated_ready_at: new Date(placedAt.getTime() + waitMinutes * 60_000).toISOString(),
    }).select().single();
    if (error) throw error;
    return data;
  }, 'createOrder');
}

export async function updateOrderStatus(orderId, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);
  const data = await withRetry(async () => {
    const { data: updatedOrder, error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId).select().single();
    if (error) throw error;
    return updatedOrder;
  }, 'updateOrderStatus');
  await recalculateWaitTimes();
  return data;
}

export async function updateOrderPriority(orderId, priority) {
  if (!VALID_PRIORITIES.includes(priority)) throw new Error(`Invalid priority: ${priority}`);
  return withRetry(async () => {
    const { data, error } = await supabase.from('orders').update({ priority }).eq('id', orderId).select().single();
    if (error) throw error;
    return data;
  }, 'updateOrderPriority');
}

export async function updateMenuAvailability(itemId, available) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('menu').update({ available }).eq('id', itemId).select().single();
    if (error) throw error;
    return data;
  }, 'updateMenuAvailability');
}

export function listenToMenu(callback, { onError = () => { } } = {}) {
  let stopped = false;
  let pollTimer;
  async function fetchAndEmit() {
    const { data, error } = await supabase.from('menu').select('id, name, price, prep_time_min, popularity_count, available').order('name');
    if (error) { onError(error); return; }
    if (!stopped) callback(data);
  }
  fetchAndEmit();
  // Fallback for networks where Supabase WebSockets are blocked.
  pollTimer = setInterval(fetchAndEmit, POLL_INTERVAL_MS);
  const channel = supabase.channel('menu-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, fetchAndEmit)
    .subscribe();
  return () => { stopped = true; clearInterval(pollTimer); supabase.removeChannel(channel); };
}

export async function recalculateWaitTimes() {
  const [{ data: activeOrders, error }, config] = await Promise.all([
    supabase.from('orders').select('id, items, placed_at').in('status', ACTIVE_STATUSES).order('placed_at'), getConfig(),
  ]);
  if (error) throw error;

  const now = Date.now();
  const updates = activeOrders.map((order, index) => {
    const ordersAhead = activeOrders.slice(0, index);
    const minutes = estimateWaitTime(order, ordersAhead, config);
    return supabase.from('orders').update({ estimated_ready_at: new Date(now + minutes * 60_000).toISOString() }).eq('id', order.id);
  });
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}

export function listenToOrders(callback, { onConnectionState = () => { }, onError = () => { } } = {}) {
  let stopped = false;
  let retryTimer;
  let pollTimer;
  let retryAttempt = 0;

  async function fetchAndEmit() {
    try {
      const { data, error } = await supabase.from('orders').select('*').not('status', 'in', '(picked_up,cancelled)').order('placed_at');
      if (error) throw error;
      if (!stopped) { callback(data); onConnectionState('live'); retryAttempt = 0; }
    } catch (error) {
      if (!stopped) { onConnectionState('disconnected'); onError(error); scheduleRetry(); }
    }
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    const delay = Math.min(30_000, 1_000 * (2 ** retryAttempt));
    retryAttempt += 1;
    retryTimer = setTimeout(fetchAndEmit, delay);
  }

  onConnectionState('connecting');
  fetchAndEmit();
  // Keep refreshing even when a network blocks Supabase WebSockets.
  pollTimer = setInterval(fetchAndEmit, POLL_INTERVAL_MS);
  const channel = supabase.channel('orders-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAndEmit)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onConnectionState('live');
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') scheduleRetry();
    });

  const unsubscribe = () => { stopped = true; clearTimeout(retryTimer); clearInterval(pollTimer); supabase.removeChannel(channel); };
  unsubscribe.refresh = fetchAndEmit;
  return unsubscribe;
}
