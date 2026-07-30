const SUPABASE_URL = "https://jmecjwctgqimuwvlnhld.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-3Bd4gW4zBVGeggj-E38yQ_mLbpLeyt";

if (!window.supabase) {
  throw new Error("Supabase failed to load. Check the CDN script tag and internet connection.");
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
