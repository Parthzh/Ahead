/**
 * wait-time.js
 * 
 * Core logic for estimating canteen queue wait times.
 * This is a pure function designed to be used across the student app, vendor dashboard,
 * and background queue engines without side effects.
 */

/**
 * Calculates the total number of individual items across a list of orders.
 * @param {Array} orders - Array of order objects, each containing an `items` array.
 * @returns {number} The total count of items.
 */
export function countTotalItems(orders) {
  return orders.reduce((total, order) => {
    const orderItems = order.items || [];
    return total + orderItems.reduce((sum, item) => sum + (item.qty || 1), 0);
  }, 0);
}

/**
 * Estimates the wait time for a specific order based on the current queue.
 * 
 * @param {Object} targetOrder - The order to estimate time for (must include its items).
 * @param {Array} activeOrders - Array of all currently active orders (queued or preparing) 
 *                               that were placed BEFORE the target order.
 * @param {Object} config - Configuration object.
 * @param {number} config.avg_prep_time_per_item_min - Average minutes to prepare a single item.
 * @param {number} config.max_concurrent_prep - Max items the vendor can prepare simultaneously.
 * @returns {number} Estimated wait time in minutes.
 */
export function estimateWaitTime(targetOrder, activeOrders, config) {
  // Count all items in orders ahead of this one
  const itemsAhead = countTotalItems(activeOrders);
  
  // Add the items in the target order itself
  const targetOrderItems = countTotalItems([targetOrder]);
  const totalItems = itemsAhead + targetOrderItems;
  
  // Calculate wait time: 
  // We divide total items by concurrent capacity (rounded up to handle batches),
  // then multiply by the prep time per batch.
  const waitMinutes = Math.ceil(totalItems / config.max_concurrent_prep) * config.avg_prep_time_per_item_min;
  
  return waitMinutes;
}

/* 
================================================================================
  USAGE EXAMPLE (for teammates):
================================================================================

import { estimateWaitTime } from './wait-time.js';

// 1. Fetch config from your database
const config = { avg_prep_time_per_item_min: 5, max_concurrent_prep: 3 };

// 2. Fetch the target order and all active orders placed BEFORE it
const activeOrders = [
  { items: [{ name: 'Burger', qty: 2 }] },
  { items: [{ name: 'Fries', qty: 1 }] }
];
const myOrder = { items: [{ name: 'Pizza', qty: 1 }] };

// 3. Calculate wait time
const minutes = estimateWaitTime(myOrder, activeOrders, config);
console.log(`Your order will be ready in approx ${minutes} minutes.`);
*/
