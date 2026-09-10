-- The core schema already has reviewer uniqueness constraints for loan and withdrawal
-- approvals and an existing partial unique index for membership approvals.
-- Keep those canonical indexes and remove redundant QA-created copies.

drop index if exists public.uq_membership_approval_reviewer_approve;
drop index if exists public.uq_loan_approval_reviewer_approve;
drop index if exists public.uq_withdrawal_approval_reviewer_approve;
