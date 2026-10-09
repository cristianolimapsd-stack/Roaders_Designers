import { createClient } from '@supabase/supabase-js';

export function database() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Server-side Supabase settings are missing.');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
