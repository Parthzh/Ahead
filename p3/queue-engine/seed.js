import { supabase } from './supabase-config.js';

const SAMPLE_MENU = [
  { id: 'itm-01', name: 'Vada Pav', price: 20, prep_time_min: 3, popularity_count: 0, available: true },
  { id: 'itm-02', name: 'Samosa (2 pcs)', price: 25, prep_time_min: 2, popularity_count: 0, available: true },
  { id: 'itm-03', name: 'Veg Sandwich', price: 40, prep_time_min: 5, popularity_count: 0, available: true },
  { id: 'itm-04', name: 'Masala Chai', price: 15, prep_time_min: 4, popularity_count: 0, available: true },
  { id: 'itm-05', name: 'Veg Cutlet', price: 30, prep_time_min: 6, popularity_count: 0, available: true },
  { id: 'itm-06', name: 'Poha', price: 35, prep_time_min: 7, popularity_count: 0, available: true },
  { id: 'itm-07', name: 'Cold Coffee', price: 45, prep_time_min: 3, popularity_count: 0, available: true },
  { id: 'itm-08', name: 'Veg Thali (mini)', price: 80, prep_time_min: 10, popularity_count: 0, available: true },
];

export async function seedMenu() {
  const { data, error } = await supabase.from('menu').upsert(SAMPLE_MENU, { onConflict: 'id' }).select();
  if (error) throw error;
  return data;
}
