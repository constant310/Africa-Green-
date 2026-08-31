create or replace function public.request_withdrawal(p_amount_kobo bigint, p_pin text, p_beneficiary jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_policy public.policy_versions%rowtype;
  v_fee bigint;
  v_total bigint;
  v_available bigint;
  v_wallet uuid;
  v_reserved uuid;
  v_id uuid;
  v_tier jsonb;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if not public.verify_transaction_pin(p_pin) then raise exception 'INVALID_TRANSACTION_PIN'; end if;
  if not exists(select 1 from public.profiles where id=v_user and membership_status='ACTIVE') then raise exception 'MEMBERSHIP_NOT_ACTIVE'; end if;

  select * into v_policy from public.policy_versions where policy_type='TRANSFER_FEE' and is_active;
  select tier into v_tier
  from jsonb_array_elements(v_policy.configuration->'tiers') tier
  where (tier->>'up_to_kobo') is null or p_amount_kobo<=(tier->>'up_to_kobo')::bigint
  order by coalesce((tier->>'up_to_kobo')::bigint,9223372036854775807)
  limit 1;

  v_fee:=(v_tier->>'fixed_kobo')::bigint;
  v_total:=p_amount_kobo+v_fee;
  v_available:=private.member_balance(v_user,'WALLET_AVAILABLE');
  if p_amount_kobo<=0 or v_total>v_available then raise exception 'INSUFFICIENT_AVAILABLE_WALLET'; end if;

  perform private.ensure_member_accounts(v_user);
  select id into v_wallet from public.ledger_accounts where owner_user_id=v_user and bucket='WALLET_AVAILABLE';
  select id into v_reserved from public.ledger_accounts where owner_user_id=v_user and bucket='WITHDRAWAL_RESERVED';

  insert into public.withdrawal_requests(
    user_id,amount_kobo,fee_kobo,total_debit_kobo,beneficiary_snapshot,policy_snapshot
  ) values(
    v_user,p_amount_kobo,v_fee,v_total,p_beneficiary,to_jsonb(v_policy)
  ) returning id into v_id;

  perform public.post_journal(
    'WITHDRAWAL-RESERVE-'||v_id,
    'WITHDRAWAL_RESERVE',
    'Reserve funds pending two approvals',
    jsonb_build_array(
      jsonb_build_object('account_id',v_wallet,'debit_kobo',v_total,'credit_kobo',0),
      jsonb_build_object('account_id',v_reserved,'debit_kobo',0,'credit_kobo',v_total)
    ),
    null,
    to_jsonb(v_policy),
    jsonb_build_object('withdrawal_id',v_id)
  );

  return jsonb_build_object(
    'id',v_id,
    'status','PENDING',
    'amount_kobo',p_amount_kobo,
    'fee_kobo',v_fee,
    'total_debit_kobo',v_total
  );
end;
$$;

revoke all on function public.request_withdrawal(bigint,text,jsonb) from public,anon;
grant execute on function public.request_withdrawal(bigint,text,jsonb) to authenticated,service_role;
