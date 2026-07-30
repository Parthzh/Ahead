import { createOrder } from './queue-engine.js';
import { supabase } from './supabase-config.js';

const dummyItems = [
  { menuId: 'itm-01', name: 'Vada Pav', qty: 2, price: 20 },
  { menuId: 'itm-02', name: 'Samosa', qty: 1, price: 15 }
];

async function test() {
  try {
    console.log('creating order...');
    const order = await createOrder(dummyItems);
    console.log('success!', order);
  } catch (err) {
    console.error('error!', err);
  }
}
test();
