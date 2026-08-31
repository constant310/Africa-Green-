-- Keep existing production ACTIVE members consistent with the normal activation contract.
-- This does not alter their primary ADMIN/SUPER_ADMIN application role; it adds the
-- underlying MEMBER entitlement, member number and any missing ledger accounts.

do $$
declare
  r record;
  v_number text;
  v_changed boolean;
begin
  for r in
    select id,member_number
    from public.profiles
    where membership_status='ACTIVE'
  loop
    v_changed:=false;
    perform private.ensure_member_accounts(r.id);

    if r.member_number is null then
      v_number:='ADMCS-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(r.id::text,'-',''),1,8));
      update public.profiles
      set member_number=v_number,updated_at=now()
      where id=r.id and member_number is null;
      v_changed:=true;
    else
      v_number:=r.member_number;
    end if;

    if not exists(
      select 1 from public.user_roles
      where user_id=r.id and role='MEMBER' and revoked_at is null
    ) then
      insert into public.user_roles(user_id,role,granted_by)
      values(r.id,'MEMBER',null)
      on conflict(user_id,role) do update
        set revoked_at=null,granted_by=null,granted_at=now();
      v_changed:=true;
    end if;

    if v_changed then
      insert into public.audit_events(
        actor_id,subject_user_id,action,entity_type,entity_id,after_data,reason
      ) values(
        null,r.id,'SYSTEM_ACTIVE_MEMBER_CONSISTENCY_BACKFILL','profile',r.id::text,
        jsonb_build_object(
          'membership_status','ACTIVE',
          'member_number',v_number,
          'member_role_active',true
        ),
        'Production consistency hardening: active members must have a member number, Member role and complete ledger account set.'
      );
    end if;
  end loop;
end $$;
