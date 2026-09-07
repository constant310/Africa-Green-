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
  const m = String(message || 'Something went wrong. Please try again.').trim();
  const map: Record<string,string> = {
    UNAUTHENTICATED: 'Your session has expired. Please sign in again.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    MEMBERSHIP_NOT_ACTIVE: 'Your membership must be active before you can use this feature.',
    INVALID_TRANSACTION_PIN: 'The transaction PIN is incorrect. Check it and try again.',
    PIN_NOT_CONFIGURED: 'Set your transaction PIN in Security before making wallet transactions.',
    PIN_MUST_BE_4_TO_6_DIGITS: 'Your transaction PIN must contain 4 to 6 digits.',
    TRANSACTIONS_TEMPORARILY_LOCKED: 'Transactions are temporarily locked after repeated incorrect PIN attempts. Please try again later.',
    INSUFFICIENT_AVAILABLE_WALLET: 'Your available wallet balance is not enough for this transaction.',
    INVALID_AMOUNT: 'Enter a valid amount and try again.',
    INVALID_DESTINATION: 'That wallet destination is not available.',
    BELOW_PLAN_INSTALLMENT: 'The contribution is below the minimum amount required for this savings plan.',
    ENROLLMENT_NOT_ACTIVE: 'This savings plan enrollment is not active.',
    PLAN_NOT_FOUND: 'That savings plan is no longer available.',
    THREE_MONTH_SAVINGS_HISTORY_REQUIRED: 'Loans become available after at least three months of qualifying savings history.',
    SECURITY_INSUFFICIENT_FOR_CONTRACTUAL_EXPOSURE: 'Your available security and guarantor pledges do not cover the full loan exposure.',
    ACTIVE_GUARANTOR_CANNOT_BORROW: 'You currently guarantee an active loan and cannot apply for another loan until that guarantee is released.',
    INVALID_LOAN_TERMS: 'Enter a valid loan amount and tenure.',
    MAXIMUM_TWO_GUARANTORS: 'A loan can have a maximum of two guarantors.',
    INVALID_GUARANTOR: 'Select an active member other than yourself as guarantor.',
    DUPLICATE_GUARANTOR: 'Select two different guarantors. The same member cannot be added twice.',
    GUARANTOR_SECURITY_INSUFFICIENT: 'The selected guarantor does not have enough eligible security for that pledge.',
    GUARANTOR_SECURITY_NO_LONGER_AVAILABLE: 'The guarantor no longer has enough available security for this pledge.',
    GUARANTEE_REQUEST_NOT_AVAILABLE: 'This guarantee request is no longer available for action.',
    GUARANTOR_ACCEPTANCE_INCOMPLETE: 'All requested guarantors must accept before the loan can receive final approval.',
    BORROWER_SECURITY_NO_LONGER_AVAILABLE: 'Your eligible savings and shares no longer provide enough security for this loan.',
    ACTIVE_LOAN_NOT_FOUND: 'This loan is not currently available for repayment.',
    PAYMENT_EXCEEDS_OUTSTANDING: 'The repayment amount is higher than the outstanding loan balance.',
    LOAN_NOT_FOUND: 'The loan could not be found.',
    SEARCH_QUERY_TOO_SHORT: 'Enter at least 3 characters of the member name or membership number.',
    SELF_APPROVAL_FORBIDDEN: 'You cannot approve your own request.',
    REGISTRATION_PAYMENT_NOT_VERIFIED: 'Your registration and minimum share payment has not been verified yet.',
    REGISTRATION_MUST_BE_COMPLETED_BEFORE_APPROVAL: 'The member must complete registration before approval.',
    BYLAWS_MUST_BE_ACCEPTED: 'Please read and accept the current bye-laws before submitting.',
    KYC_NOT_COMPLETE: 'Complete the required identity verification before submitting.',
    WITHDRAWAL_NOT_FOUND: 'The withdrawal request could not be found.',
    WITHDRAWAL_NOT_APPROVED: 'This withdrawal has not completed the required approvals.',
  };

  for (const [code,text] of Object.entries(map)) if (m.includes(code)) return text;
  if (/guarantor_requests_loan_id_guarantor_id_key/i.test(m) || /duplicate key.*guarantor/i.test(m)) return map.DUPLICATE_GUARANTOR;
  if (/jwt.*expired|invalid.*jwt|refresh token/i.test(m)) return map.UNAUTHENTICATED;
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(m)) return 'We could not reach the server. Check your internet connection and try again.';
  if (/timeout|timed out/i.test(m)) return 'The request took too long. Please try again.';
  if (/5\d\d|internal server error|service unavailable/i.test(m)) return 'The service is temporarily unavailable. Please try again shortly.';

  if (/^[A-Z0-9_]+$/.test(m)) return m.replaceAll('_',' ').toLowerCase().replace(/^./, c => c.toUpperCase()) + '.';
  return m.length>180 ? 'Something went wrong while processing your request. Please try again.' : m;
}
