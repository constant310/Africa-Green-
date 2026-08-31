-- Full-system hardening: preserve permission checks while honoring the V4 no-MFA policy,
-- make the documented Super Admin direct-activation exception real and auditable,
-- and add covering indexes identified by the database advisor.

create index if not exists idx_bylaw_acceptances_bylaw_version_id
  on public.bylaw_acceptances(bylaw_version_id);
create index if not exists idx_guarantor_requests_guarantor_id
  on public.guarantor_requests(guarantor_id);
create index if not exists idx_journal_lines_journal_id
  on public.journal_lines(journal_id);
create index if not exists idx_loan_approvals_reviewer_id
  on public.loan_approvals(reviewer_id);
create index if not exists idx_member_savings_enrollments_plan_id
  on public.member_savings_enrollments(plan_id);
create index if not exists idx_membership_approvals_reviewer_id
  on public.membership_approvals(reviewer_id);
create index if not exists idx_role_permissions_permission_code
  on public.role_permissions(permission_code);
create index if not exists idx_withdrawal_approvals_reviewer_id
  on public.withdrawal_approvals(reviewer_id);

create or replace function public.publish_policy_version(
  p_policy_type public.policy_type,
  p_configuration jsonb,
  p_effective_from timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_version int;
  v_id uuid;
begin
  if v_user is null or not private.has_permission(v_user,'policies.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(p_configuration)<>'object' then
    raise exception 'POLICY_CONFIGURATION_MUST_BE_OBJECT';
  end if;

  select coalesce(max(version_number),0)+1 into v_version
  from public.policy_versions
  where policy_type=p_policy_type;

  update public.policy_versions
  set is_active=false,effective_until=p_effective_from
  where policy_type=p_policy_type and is_active;

  insert into public.policy_versions(
    policy_type,version_number,configuration,effective_from,is_active,approved_by
  ) values(
    p_policy_type,v_version,p_configuration,p_effective_from,true,v_user
  ) returning id into v_id;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,after_data)
  values(
    v_user,'POLICY_PUBLISHED','policy_version',v_id::text,
    jsonb_build_object('policy_type',p_policy_type,'version',v_version,'configuration',p_configuration)
  );

  return jsonb_build_object('id',v_id,'version_number',v_version,'policy_type',p_policy_type);
end;
$$;

create or replace function public.super_admin_activate_member_v4(
  p_user uuid,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_profile public.profiles%rowtype;
  v_app_id uuid;
  v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
  v_member_number text;
begin
  if v_actor is null or not exists(
    select 1 from public.user_roles
    where user_id=v_actor and role='SUPER_ADMIN' and revoked_at is null
  ) then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode='42501';
  end if;
  if not private.has_permission(v_actor,'roles.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_reason is null then
    raise exception 'DIRECT_ACTIVATION_REASON_REQUIRED';
  end if;

  select * into v_profile
  from public.profiles
  where id=p_user
  for update;
  if v_profile.id is null then raise exception 'USER_NOT_FOUND'; end if;

  if v_profile.membership_status='ACTIVE' then
    perform private.ensure_member_accounts(p_user);
    return jsonb_build_object(
      'user_id',p_user,'status','ACTIVE','already_active',true,
      'bypassed',false,'activation_granted',false,'registration_required',false
    );
  end if;

  v_member_number:=coalesce(
    v_profile.member_number,
    'ADMCS-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(p_user::text,'-',''),1,8))
  );

  perform private.ensure_member_accounts(p_user);

  select id into v_app_id
  from public.member_applications
  where user_id=p_user
  for update;

  if v_app_id is null then
    insert into public.member_applications(
      user_id,status,current_step,application_data,activated_at
    ) values(
      p_user,'ACTIVE','admin_override',
      jsonb_build_object(
        'super_admin_override',jsonb_build_object(
          'activated_by',v_actor,
          'activated_at',now(),
          'reason',v_reason,
          'registration_payment_bypassed',true,
          'normal_approval_bypassed',true
        )
      ),
      now()
    ) returning id into v_app_id;
  else
    update public.member_applications
    set status='ACTIVE',
        activated_at=coalesce(activated_at,now()),
        updated_at=now(),
        application_data=coalesce(application_data,'{}'::jsonb)||jsonb_build_object(
          'super_admin_override',jsonb_build_object(
            'activated_by',v_actor,
            'activated_at',now(),
            'reason',v_reason,
            'registration_payment_bypassed',true,
            'normal_approval_bypassed',true
          )
        )
    where id=v_app_id;
  end if;

  update public.profiles
  set membership_status='ACTIVE',
      activated_at=coalesce(activated_at,now()),
      member_number=v_member_number,
      application_role=case when application_role='APPLICANT' then 'MEMBER' else application_role end,
      updated_at=now()
  where id=p_user;

  insert into public.user_roles(user_id,role,granted_by)
  values(p_user,'MEMBER',v_actor)
  on conflict(user_id,role) do update
    set revoked_at=null,granted_by=excluded.granted_by,granted_at=now();

  insert into public.audit_events(
    actor_id,subject_user_id,action,entity_type,entity_id,after_data,reason
  ) values(
    v_actor,p_user,'SUPER_ADMIN_MEMBER_ACTIVATED_DIRECTLY','profile',p_user::text,
    jsonb_build_object(
      'membership_status','ACTIVE',
      'member_number',v_member_number,
      'normal_registration_bypassed',true,
      'normal_approval_bypassed',true
    ),
    v_reason
  );

  insert into public.notifications(user_id,title,body,kind,link)
  values(
    p_user,
    'Membership activated',
    'Your cooperative membership has been activated by authorized administration. You can now use the member portal.',
    'MEMBERSHIP',
    '/portal'
  );

  return jsonb_build_object(
    'user_id',p_user,
    'status','ACTIVE',
    'member_number',v_member_number,
    'already_active',false,
    'bypassed',true,
    'activation_granted',true,
    'registration_required',false
  );
end;
$$;