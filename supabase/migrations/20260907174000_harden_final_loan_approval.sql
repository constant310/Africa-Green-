create or replace function public.approve_loan(
  p_loan_id uuid,
  p_decision public.approval_decision,
  p_comments text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin uuid:=auth.uid();
  v_loan public.loans%rowtype;
  v_count int;
  v_policy public.policy_versions%rowtype;
  v_guarantor_total bigint;
  v_borrower_pledge bigint;
  v_rate numeric;
  v_factor numeric;
  v_regular bigint;
  v_balance bigint;
  v_interest bigint;
  v_payment bigint;
  v_principal bigint;
  v_wallet uuid;
  v_receivable uuid;
  v_month int;
  v_g record;
begin
  if not private.has_permission(v_admin,'loans.approve') then raise exception 'FORBIDDEN'; end if;
  select * into v_loan from public.loans where id=p_loan_id for update;
  if v_loan.id is null then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.borrower_id=v_admin then raise exception 'SELF_APPROVAL_FORBIDDEN'; end if;

  insert into public.loan_approvals(loan_id,reviewer_id,decision,comments)
  values(v_loan.id,v_admin,p_decision,p_comments);

  if p_decision<>'APPROVE' then
    update public.loans set status='REJECTED' where id=v_loan.id;
    return jsonb_build_object('status','REJECTED');
  end if;

  select count(*) into v_count from public.loan_approvals where loan_id=v_loan.id and decision='APPROVE';
  if v_count<2 then
    update public.loans set status='UNDER_REVIEW' where id=v_loan.id;
    return jsonb_build_object('status','UNDER_REVIEW');
  end if;

  if exists(select 1 from public.guarantor_requests where loan_id=v_loan.id and status<>'ACCEPTED') then
    raise exception 'GUARANTOR_ACCEPTANCE_INCOMPLETE';
  end if;
  if exists(
    select 1
    from public.guarantor_requests g
    join public.profiles p on p.id=g.guarantor_id
    where g.loan_id=v_loan.id and g.status='ACCEPTED' and p.membership_status<>'ACTIVE'
  ) then raise exception 'GUARANTOR_NO_LONGER_ACTIVE'; end if;

  select * into v_policy from public.policy_versions where policy_type='LOAN' and is_active;
  select coalesce(sum(pledged_amount_kobo),0) into v_guarantor_total
  from public.guarantor_requests where loan_id=v_loan.id and status='ACCEPTED';
  v_borrower_pledge:=greatest(0,v_loan.total_contractual_exposure_kobo-v_guarantor_total);

  if v_borrower_pledge>floor(greatest(0,private.member_balance(v_loan.borrower_id,'PARTICIPATIVE_SAVINGS')+private.member_balance(v_loan.borrower_id,'SHARE_CAPITAL'))*((v_policy.configuration->>'security_percentage_bps')::numeric/10000)) then
    raise exception 'BORROWER_SECURITY_NO_LONGER_AVAILABLE';
  end if;

  perform private.lock_member_security(v_loan.borrower_id,v_loan.id,v_borrower_pledge,'BORROWER');
  for v_g in
    select g.guarantor_id,g.pledged_amount_kobo
    from public.guarantor_requests g
    join public.profiles p on p.id=g.guarantor_id
    where g.loan_id=v_loan.id and g.status='ACCEPTED' and p.membership_status='ACTIVE'
  loop
    perform private.lock_member_security(v_g.guarantor_id,v_loan.id,v_g.pledged_amount_kobo,'GUARANTOR');
  end loop;

  v_rate:=v_loan.monthly_interest_bps::numeric/10000;
  v_factor:=power(1+v_rate,v_loan.tenure_months);
  v_regular:=case when v_rate=0 then ceil(v_loan.principal_kobo::numeric/v_loan.tenure_months)::bigint else ceil((v_loan.principal_kobo*v_rate*v_factor)/(v_factor-1))::bigint end;
  v_balance:=v_loan.principal_kobo;

  for v_month in 1..v_loan.tenure_months loop
    v_interest:=floor(v_balance*v_rate);
    v_payment:=case when v_month=v_loan.tenure_months then v_balance+v_interest else least(v_regular,v_balance+v_interest) end;
    v_principal:=v_payment-v_interest;
    insert into public.loan_installments(loan_id,installment_number,due_date,opening_principal_kobo,principal_due_kobo,interest_due_kobo)
    values(v_loan.id,v_month,(current_date+(v_month||' months')::interval)::date,v_balance,v_principal,v_interest);
    v_balance:=greatest(0,v_balance-v_principal);
  end loop;

  select id into v_wallet from public.ledger_accounts where owner_user_id=v_loan.borrower_id and bucket='WALLET_AVAILABLE';
  select id into v_receivable from public.ledger_accounts where owner_user_id=v_loan.borrower_id and bucket='LOAN_RECEIVABLE';
  perform public.post_journal(
    'LOAN-DISBURSEMENT-'||v_loan.id,
    'LOAN_DISBURSEMENT',
    'Approved loan credited to member wallet',
    jsonb_build_array(
      jsonb_build_object('account_id',v_receivable,'debit_kobo',v_loan.principal_kobo,'credit_kobo',0),
      jsonb_build_object('account_id',v_wallet,'debit_kobo',0,'credit_kobo',v_loan.principal_kobo)
    ),
    null,to_jsonb(v_policy),jsonb_build_object('loan_id',v_loan.id)
  );

  update public.loans
  set status='ACTIVE',
      policy_snapshot=jsonb_build_object(
        'policy',v_policy.configuration,
        'guarantors',(select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) from public.guarantor_requests g where g.loan_id=v_loan.id),
        'approved_at',now()
      ),
      approved_security_kobo=v_borrower_pledge+v_guarantor_total,
      approved_at=now(),
      disbursed_at=now()
  where id=v_loan.id;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,after_data,reason)
  values(v_admin,'LOAN_APPROVED_AND_DISBURSED','loan',v_loan.id::text,jsonb_build_object('principal_kobo',v_loan.principal_kobo,'security_kobo',v_borrower_pledge+v_guarantor_total),p_comments);

  return jsonb_build_object('status','ACTIVE');
end;
$$;
