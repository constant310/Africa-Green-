import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_V4_SUPABASE_URL || 'https://ynlmhpwytpegleafdpwb.supabase.co';
const key = process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_B6dHJGvHPWrJfO-jsEHdog_cSaaL0VP';

export const supabase = createBrowserClient(url, key, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    flowType: 'pkce',
  },
});

export function friendlyError(message?: string) {
  const m = String(message || 'Something went wrong. Please try again.');
  const map: Record<string,string> = {
    MEMBERSHIP_NOT_ACTIVE: 'Your membership must be active before you can use this feature.',
    INVALID_TRANSACTION_PIN: 'The transaction PIN is incorrect.',
    TRANSACTIONS_TEMPORARILY_LOCKED: 'Transactions are temporarily locked after repeated PIN attempts.',
    INSUFFICIENT_AVAILABLE_WALLET: 'Your available wallet balance is not enough for this transaction.',
    THREE_MONTH_SAVINGS_HISTORY_REQUIRED: 'Loans become available after at least three months of qualifying savings history.',
    SECURITY_INSUFFICIENT_FOR_CONTRACTUAL_EXPOSURE: 'Your available security and guarantor pledges do not cover this loan.',
    REGISTRATION_PAYMENT_NOT_VERIFIED: 'Your registration and minimum share payment has not been verified yet.',
    BYLAWS_MUST_BE_ACCEPTED: 'Please read and accept the current bye-laws before submitting.',
  };
  return map[m] || m.replaceAll('_',' ').toLowerCase().replace(/^./, c => c.toUpperCase());
}
