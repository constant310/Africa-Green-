create or replace function public.create_loan_application(
  p_principal_kobo bigint,
  p_tenure_months integer,
  p_guarantors jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_policy public.policy_versions%rowtype;
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
  if not exists(select 1 from public.profiles where id=v_user and membership_status='ACTIVE') then raise exception 'MEMBERSHIP_NOT_ACTIVE'; end if;
  if exists(select 1 from public.guarantor_requests g join public.loans l on l.id=g.loan_id where g.guarantor_id=v_user and g.status='ACCEPTED' and l.status in ('APPROVED','DISBURSEMENT_PENDING','ACTIVE','PAST_DUE','DEFAULTED')) then raise exception 'ACTIVE_GUARANTOR_CANNOT_BORROW'; end if;
  if not exists(select 1 from public.journal_lines jl join public.ledger_accounts a on a.id=jl.account_id join public.journal_transactions j on j.id=jl.journal_id where a.owner_user_id=v_user and a.bucket='PARTICIPATIVE_SAVINGS' and j.status='POSTED' and j.posted_at<=now()-interval '3 months') then raise exception 'THREE_MONTH_SAVINGS_HISTORY_REQUIRED'; end if;
  if p_principal_kobo<=0 or p_tenure_months not between 1 and 120 then raise exception 'INVALID_LOAN_TERMS'; end if;
  if jsonb_typeof(v_guarantors)<>'array' then raise exception 'INVALID_GUARANTOR'; end if;
  if jsonb_array_length(v_guarantors)>2 then raise exception 'MAXIMUM_TWO_GUARANTORS'; end if;
  if exists(
    select 1
    from jsonb_array_elements(v_guarantors) x
    group by upper(trim(x->>'member_number'))
    having count(*)>1
  ) then raise exception 'DUPLICATE_GUARANTOR'; end if;

  select * into v_policy from public.policy_versions where policy_type='LOAN' and is_active;
  v_rate:=((v_policy.configuration->>'monthly_interest_bps')::numeric/10000);
  v_factor:=power(1+v_rate,p_tenure_months);
  v_payment:=case when v_rate=0 then ceil(p_principal_kobo::numeric/p_tenure_months)::bigint else ceil((p_principal_kobo*v_rate*v_factor)/(v_factor-1))::bigint end;
  v_exposure:=v_payment*p_tenure_months;
  v_available:=greatest(0,private.member_balance(v_user,'PARTICIPATIVE_SAVINGS')+private.member_balance(v_user,'SHARE_CAPITAL'));
  v_capacity:=floor(v_available*((v_policy.configuration->>'security_percentage_bps')::numeric/10000));

  for v_item in select * from jsonb_array_elements(v_guarantors) loop
    select id into v_guarantor from public.profiles where member_number=v_item->>'member_number' and membership_status='ACTIVE';
    if v_guarantor is null or v_guarantor=v_user then raise exception 'INVALID_GUARANTOR'; end if;
    v_pledge:=(v_item->>'pledged_amount_kobo')::bigint;
    if v_pledge<=0 or v_pledge>floor(greatest(0,private.member_balance(v_guarantor,'PARTICIPATIVE_SAVINGS')+private.member_balance(v_guarantor,'SHARE_CAPITAL'))*((v_policy.configuration->>'security_percentage_bps')::numeric/10000)) then raise exception 'GUARANTOR_SECURITY_INSUFFICIENT'; end if;
    v_requested:=v_requested+v_pledge;
  end loop;

  if v_exposure>v_capacity+v_requested then raise exception 'SECURITY_INSUFFICIENT_FOR_CONTRACTUAL_EXPOSURE'; end if;

  insert into public.loans(borrower_id,principal_kobo,tenure_months,monthly_interest_bps,status,total_contractual_exposure_kobo,submitted_at)
  values(v_user,p_principal_kobo,p_tenure_months,(v_policy.configuration->>'monthly_interest_bps')::integer,'SUBMITTED',v_exposure,now()) returning id into v_loan;

  for v_item in select * from jsonb_array_elements(v_guarantors) loop
    select id into v_guarantor from public.profiles where member_number=v_item->>'member_number';
    insert into public.guarantor_requests(loan_id,guarantor_id,pledged_amount_kobo,terms_snapshot)
    values(v_loan,v_guarantor,(v_item->>'pledged_amount_kobo')::bigint,jsonb_build_object('borrower_member_number',(select member_number from public.profiles where id=v_user),'principal_kobo',p_principal_kobo,'tenure_months',p_tenure_months,'monthly_interest_bps',v_policy.configuration->>'monthly_interest_bps','total_contractual_exposure_kobo',v_exposure,'implication','Pledged security remains locked until the guaranteed loan is fully settled or formally resolved.','policy',v_policy.configuration));
  end loop;

  return jsonb_build_object('loan_id',v_loan,'status','SUBMITTED','monthly_payment_kobo',v_payment,'total_contractual_exposure_kobo',v_exposure,'borrower_capacity_kobo',v_capacity);
end;
$$;

create or replace function public.respond_to_guarantee(p_request_id uuid,p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_request public.guarantor_requests%rowtype;
  v_available bigint;
  v_bps int;
begin
  select * into v_request from public.guarantor_requests where id=p_request_id and guarantor_id=auth.uid() for update;
  if v_request.id is null or v_request.status<>'PENDING' then raise exception 'GUARANTEE_REQUEST_NOT_AVAILABLE'; end if;
  if p_accept then
    if not exists(select 1 from public.profiles where id=auth.uid() and membership_status='ACTIVE') then raise exception 'MEMBERSHIP_NOT_ACTIVE'; end if;
    select (configuration->>'security_percentage_bps')::int into v_bps from public.policy_versions where policy_type='LOAN' and is_active;
    v_available:=floor(greatest(0,private.member_balance(auth.uid(),'PARTICIPATIVE_SAVINGS')+private.member_balance(auth.uid(),'SHARE_CAPITAL'))*(v_bps::numeric/10000));
    if v_request.pledged_amount_kobo>v_available then raise exception 'GUARANTOR_SECURITY_NO_LONGER_AVAILABLE'; end if;
  end if;
  update public.guarantor_requests set status=case when p_accept then 'ACCEPTED'::public.guarantee_status else 'DECLINED'::public.guarantee_status end,responded_at=now() where id=v_request.id;
  return jsonb_build_object('status',case when p_accept then 'ACCEPTED' else 'DECLINED' end);
end;
$$;
