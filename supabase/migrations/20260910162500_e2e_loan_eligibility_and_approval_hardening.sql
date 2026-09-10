-- Production E2E hardening discovered during 2026-09-10 QA.
-- Keeps the loan eligibility policy-driven, fixes guarantor search ambiguity,
-- and ensures two-person approvals are actually from distinct reviewers.

create or replace function public.member_search_guarantors_v4(p_query text, p_limit integer default 10)
returns table(id uuid, member_number text, first_name text, surname text)
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user uuid:=auth.uid();
  v_q text:=trim(coalesce(p_query,''));
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists(
    select 1 from public.profiles p0
    where p0.id=v_user and p0.membership_status='ACTIVE'
  ) then raise exception 'MEMBERSHIP_NOT_ACTIVE'; end if;
  if length(v_q)<3 then raise exception 'SEARCH_QUERY_TOO_SHORT'; end if;

  return query
  select p.id,p.member_number,p.first_name,p.surname
  from public.profiles p
  where p.id<>v_user
    and p.membership_status='ACTIVE'
    and p.member_number is not null
    and (
      p.member_number ilike '%'||v_q||'%'
      or coalesce(p.first_name,'') ilike '%'||v_q||'%'
      or coalesce(p.surname,'') ilike '%'||v_q||'%'
      or trim(coalesce(p.first_name,'')||' '||coalesce(p.surname,'')) ilike '%'||v_q||'%'
    )
  order by case when p.member_number=v_q then 0 else 1 end,p.first_name,p.surname
  limit least(greatest(coalesce(p_limit,10),1),20);
end;
$function$;

create or replace function public.create_loan_application(p_principal_kobo bigint, p_tenure_months integer, p_guarantors jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user uuid:=auth.uid();
  v_policy public.policy_versions%rowtype;
  v_eligibility_months integer:=3;
  v_rate numeric;
  v_factor numeric;
  v_payment bigint;
  v_exposure bigint;
  v_available bigint;
  v_capacity bigint;
  v_requested bigint:=0;
  v_loan uuid;
  v_item jsonb;
  v_guarantor uuid;
  v_pledge bigint;
  v_guarantors jsonb:=coalesce(p_guarantors,'[]'::jsonb);
begin
  if not exists(select 1 from public.profiles p where p.id=v_user and p.membership_status='ACTIVE') then
    raise exception 'MEMBERSHIP_NOT_ACTIVE';
  end if;

  if exists(
    select 1
    from public.guarantor_requests g
    join public.loans l on l.id=g.loan_id
    where g.guarantor_id=v_user
      and g.status='ACCEPTED'
      and l.status in ('APPROVED','DISBURSEMENT_PENDING','ACTIVE','PAST_DUE','DEFAULTED')
  ) then
    raise exception 'ACTIVE_GUARANTOR_CANNOT_BORROW';
  end if;

  select * into v_policy
  from public.policy_versions
  where policy_type='LOAN' and is_active
  order by effective_from desc
  limit 1;

  if v_policy.id is null then raise exception 'LOAN_POLICY_NOT_CONFIGURED'; end if;

  v_eligibility_months:=greatest(0,coalesce((v_policy.configuration->>'eligibility_months')::integer,3));

  if v_eligibility_months>0 and not exists(
    select 1
    from public.journal_lines jl
    join public.ledger_accounts a on a.id=jl.account_id
    join public.journal_transactions j on j.id=jl.journal_id
    where a.owner_user_id=v_user
      and a.bucket='PARTICIPATIVE_SAVINGS'
      and jl.credit_kobo>0
      and j.status='POSTED'
      and j.source='PARTICIPATIVE_SAVINGS'
      and j.posted_at<=now()-make_interval(months=>v_eligibility_months)
      and not exists(
        select 1 from public.journal_transactions r
        where r.reversal_of=j.id and r.status='POSTED'
      )
  ) then
    raise exception 'THREE_MONTH_SAVINGS_HISTORY_REQUIRED';
  end if;

  if p_principal_kobo<=0 or p_tenure_months not between 1 and 120 then raise exception 'INVALID_LOAN_TERMS'; end if;
  if jsonb_typeof(v_guarantors)<>'array' then raise exception 'INVALID_GUARANTOR'; end if;
  if jsonb_array_length(v_guarantors)>2 then raise exception 'MAXIMUM_TWO_GUARANTORS'; end if;
  if exists(
    select 1
    from jsonb_array_elements(v_guarantors) x
    group by upper(trim(x->>'member_number'))
    having count(*)>1
  ) then raise exception 'DUPLICATE_GUARANTOR'; end if;

  v_rate:=((v_policy.configuration->>'monthly_interest_bps')::numeric/10000);
  v_factor:=power(1+v_rate,p_tenure_months);
  v_payment:=case when v_rate=0 then ceil(p_principal_kobo::numeric/p_tenure_months)::bigint else ceil((p_principal_kobo*v_rate*v_factor)/(v_factor-1))::bigint end;
  v_exposure:=v_payment*p_tenure_months;
  v_available:=greatest(0,private.member_balance(v_user,'PARTICIPATIVE_SAVINGS')+private.member_balance(v_user,'SHARE_CAPITAL'));
  v_capacity:=floor(v_available*((v_policy.configuration->>'security_percentage_bps')::numeric/10000));

  for v_item in select * from jsonb_array_elements(v_guarantors) loop
    select p.id into v_guarantor
    from public.profiles p
    where p.member_number=v_item->>'member_number' and p.membership_status='ACTIVE';
    if v_guarantor is null or v_guarantor=v_user then raise exception 'INVALID_GUARANTOR'; end if;
    v_pledge:=(v_item->>'pledged_amount_kobo')::bigint;
    if v_pledge<=0 or v_pledge>floor(greatest(0,private.member_balance(v_guarantor,'PARTICIPATIVE_SAVINGS')+private.member_balance(v_guarantor,'SHARE_CAPITAL'))*((v_policy.configuration->>'security_percentage_bps')::numeric/10000)) then
      raise exception 'GUARANTOR_SECURITY_INSUFFICIENT';
    end if;
    v_requested:=v_requested+v_pledge;
  end loop;

  if v_exposure>v_capacity+v_requested then raise exception 'SECURITY_INSUFFICIENT_FOR_CONTRACTUAL_EXPOSURE'; end if;

  insert into public.loans(borrower_id,principal_kobo,tenure_months,monthly_interest_bps,status,total_contractual_exposure_kobo,submitted_at)
  values(v_user,p_principal_kobo,p_tenure_months,(v_policy.configuration->>'monthly_interest_bps')::integer,'SUBMITTED',v_exposure,now()) returning id into v_loan;

  for v_item in select * from jsonb_array_elements(v_guarantors) loop
    select p.id into v_guarantor from public.profiles p where p.member_number=v_item->>'member_number';
    insert into public.guarantor_requests(loan_id,guarantor_id,pledged_amount_kobo,terms_snapshot)
    values(v_loan,v_guarantor,(v_item->>'pledged_amount_kobo')::bigint,jsonb_build_object('borrower_member_number',(select p.member_number from public.profiles p where p.id=v_user),'principal_kobo',p_principal_kobo,'tenure_months',p_tenure_months,'monthly_interest_bps',v_policy.configuration->>'monthly_interest_bps','total_contractual_exposure_kobo',v_exposure,'implication','Pledged security remains locked until the guaranteed loan is fully settled or formally resolved.','policy',v_policy.configuration));
  end loop;

  return jsonb_build_object('loan_id',v_loan,'status','SUBMITTED','monthly_payment_kobo',v_payment,'total_contractual_exposure_kobo',v_exposure,'borrower_capacity_kobo',v_capacity,'eligibility_months',v_eligibility_months);
end;
$function$;

create unique index if not exists uq_membership_approval_reviewer_approve
  on public.membership_approvals(application_id,reviewer_id)
  where decision='APPROVE';

create unique index if not exists uq_loan_approval_reviewer_approve
  on public.loan_approvals(loan_id,reviewer_id)
  where decision='APPROVE';

create unique index if not exists uq_withdrawal_approval_reviewer_approve
  on public.withdrawal_approvals(withdrawal_id,reviewer_id)
  where decision='APPROVE';

create or replace function public.approve_withdrawal(p_withdrawal_id uuid, p_decision approval_decision, p_comments text default null::text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_admin uuid:=auth.uid();
  v_request public.withdrawal_requests%rowtype;
  v_count int;
  v_status public.withdrawal_status;
begin
  if not private.has_permission(v_admin,'withdrawals.approve') then raise exception 'FORBIDDEN'; end if;
  select * into v_request from public.withdrawal_requests where id=p_withdrawal_id for update;
  if v_request.id is null then raise exception 'WITHDRAWAL_NOT_FOUND'; end if;
  if v_request.user_id=v_admin then raise exception 'SELF_APPROVAL_FORBIDDEN'; end if;

  if p_decision='APPROVE' and exists(
    select 1 from public.withdrawal_approvals wa
    where wa.withdrawal_id=v_request.id and wa.reviewer_id=v_admin and wa.decision='APPROVE'
  ) then raise exception 'REVIEWER_ALREADY_APPROVED'; end if;

  insert into public.withdrawal_approvals(withdrawal_id,reviewer_id,decision,comments)
  values(v_request.id,v_admin,p_decision,p_comments);

  if p_decision='APPROVE' then
    select count(distinct reviewer_id) into v_count
    from public.withdrawal_approvals
    where withdrawal_id=v_request.id and decision='APPROVE';
    v_status:=case when v_count>=2 then 'APPROVED'::public.withdrawal_status else 'FIRST_APPROVAL'::public.withdrawal_status end;
  else
    v_status:='REJECTED';
  end if;

  update public.withdrawal_requests set status=v_status where id=v_request.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,after_data,reason)
  values(v_admin,'WITHDRAWAL_REVIEW','withdrawal',v_request.id::text,jsonb_build_object('decision',p_decision,'status',v_status),p_comments);
  return jsonb_build_object('status',v_status,'distinct_approvals',coalesce(v_count,0));
end;
$function$;

create or replace function public.approve_loan(p_loan_id uuid, p_decision approval_decision, p_comments text default null::text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
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

  if p_decision='APPROVE' and exists(
    select 1 from public.loan_approvals la
    where la.loan_id=v_loan.id and la.reviewer_id=v_admin and la.decision='APPROVE'
  ) then raise exception 'REVIEWER_ALREADY_APPROVED'; end if;

  insert into public.loan_approvals(loan_id,reviewer_id,decision,comments)
  values(v_loan.id,v_admin,p_decision,p_comments);

  if p_decision<>'APPROVE' then
    update public.loans set status='REJECTED' where id=v_loan.id;
    return jsonb_build_object('status','REJECTED');
  end if;

  select count(distinct reviewer_id) into v_count
  from public.loan_approvals
  where loan_id=v_loan.id and decision='APPROVE';

  if v_count<2 then
    update public.loans set status='UNDER_REVIEW' where id=v_loan.id;
    return jsonb_build_object('status','UNDER_REVIEW','distinct_approvals',v_count);
  end if;

  if exists(select 1 from public.guarantor_requests where loan_id=v_loan.id and status<>'ACCEPTED') then raise exception 'GUARANTOR_ACCEPTANCE_INCOMPLETE'; end if;
  if exists(
    select 1 from public.guarantor_requests g
    join public.profiles p on p.id=g.guarantor_id
    where g.loan_id=v_loan.id and g.status='ACCEPTED' and p.membership_status<>'ACTIVE'
  ) then raise exception 'GUARANTOR_NO_LONGER_ACTIVE'; end if;

  select * into v_policy from public.policy_versions where policy_type='LOAN' and is_active order by effective_from desc limit 1;
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

  return jsonb_build_object('status','ACTIVE','distinct_approvals',v_count);
end;
$function$;
