import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://btvnlyhbdmnwkzojqnai.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1Ptd3PPqwDvpjBIMZrQIsw_G3QrNBV-';

export const supabase = createBrowserClient(url, key);
