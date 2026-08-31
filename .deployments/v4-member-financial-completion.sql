-- Applied to production Supabase on 2026-08-31.
-- This file records the production migration for reproducibility.

insert into public.permissions(code,description)
values('support.manage','Manage member support tickets and responses')
on conflict (code) do nothing;

insert into public.role_permissions(role,permission_code)
values ('ADMIN','support.manage'),('SUPER_ADMIN','support.manage')
on conflict do nothing;

create or replace function public.member_search_guarantors_v4(p_query text, p_limit integer default 10)
returns table(id uuid, member_number text, first_name text, surname text)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_q text:=trim(coalesce(p_query,''));
begin
 if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
 if not exists(select 1 from public.profiles where id=v_user and membership_status='ACTIVE') then raise exception 'MEMBERSHIP_NOT_ACTIVE'; end if;
 if length(v_q)<3 then raise exception 'SEARCH_QUERY_TOO_SHORT'; end if;
 return query select p.id,p.member_number,p.first_name,p.surname from public.profiles p
 where p.id<>v_user and p.membership_status='ACTIVE' and p.member_number is not null
 and (p.member_number ilike '%'||v_q||'%' or coalesce(p.first_name,'') ilike '%'||v_q||'%' or coalesce(p.surname,'') ilike '%'||v_q||'%' or trim(coalesce(p.first_name,'')||' '||coalesce(p.surname,'')) ilike '%'||v_q||'%')
 order by case when p.member_number=v_q then 0 else 1 end,p.first_name,p.surname
 limit least(greatest(coalesce(p_limit,10),1),20);
end;$$;
revoke all on function public.member_search_guarantors_v4(text,integer) from public,anon;
grant execute on function public.member_search_guarantors_v4(text,integer) to authenticated;

create or replace function public.member_loan_details_v4()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
 return jsonb_build_object(
  'installments',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('outstanding_kobo',greatest(0,(i.principal_due_kobo-i.principal_paid_kobo)+(i.interest_due_kobo-i.interest_paid_kobo)+(i.penalty_due_kobo-i.penalty_paid_kobo))) order by i.due_date,i.installment_number),'[]'::jsonb) from public.loan_installments i join public.loans l on l.id=i.loan_id where l.borrower_id=v_user),
  'repayments',(select coalesce(jsonb_agg(to_jsonb(r) order by r.paid_at desc),'[]'::jsonb) from public.loan_repayments r where r.user_id=v_user),
  'guarantors_requested',(select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('member_number',p.member_number,'first_name',p.first_name,'surname',p.surname) order by g.requested_at desc),'[]'::jsonb) from public.guarantor_requests g join public.loans l on l.id=g.loan_id join public.profiles p on p.id=g.guarantor_id where l.borrower_id=v_user)
 );
end;$$;
revoke all on function public.member_loan_details_v4() from public,anon;
grant execute on function public.member_loan_details_v4() to authenticated;

create or replace function public.admin_update_support_ticket_v4(p_ticket_id uuid,p_status text,p_response text default null,p_priority text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_admin uuid:=auth.uid();v_old public.support_tickets%rowtype;v_status text:=upper(trim(coalesce(p_status,'')));v_priority text:=upper(trim(coalesce(p_priority,'')));
begin
 if not private.has_permission(v_admin,'support.manage') then raise exception 'FORBIDDEN'; end if;
 if v_status not in ('OPEN','IN_PROGRESS','RESOLVED','CLOSED') then raise exception 'INVALID_SUPPORT_STATUS'; end if;
 if v_priority<>'' and v_priority not in ('LOW','NORMAL','HIGH','URGENT') then raise exception 'INVALID_SUPPORT_PRIORITY'; end if;
 select * into v_old from public.support_tickets where id=p_ticket_id for update;
 if v_old.id is null then raise exception 'SUPPORT_TICKET_NOT_FOUND'; end if;
 update public.support_tickets set status=v_status,priority=case when v_priority='' then priority else v_priority end,assigned_to=v_admin,admin_response=case when p_response is null then admin_response else nullif(trim(p_response),'') end,updated_at=now() where id=p_ticket_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,before_data,after_data,subject_user_id,reason)
 values(v_admin,'SUPPORT_TICKET_UPDATE','support_ticket',p_ticket_id::text,jsonb_build_object('status',v_old.status,'priority',v_old.priority,'assigned_to',v_old.assigned_to),jsonb_build_object('status',v_status,'priority',case when v_priority='' then v_old.priority else v_priority end,'assigned_to',v_admin,'response_added',p_response is not null),v_old.user_id,nullif(trim(coalesce(p_response,'')),''));
 return (select to_jsonb(t) from public.support_tickets t where t.id=p_ticket_id);
end;$$;
revoke all on function public.admin_update_support_ticket_v4(uuid,text,text,text) from public,anon;
grant execute on function public.admin_update_support_ticket_v4(uuid,text,text,text) to authenticated;
