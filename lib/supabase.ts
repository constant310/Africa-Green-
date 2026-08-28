import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://btvnlyhbdmnwkzojqnai.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1Ptd3PPqwDvpjBIMZrQIsw_G3QrNBV-';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
});
