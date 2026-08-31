import {NextRequest,NextResponse} from 'next/server';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_B6dHJGvHPWrJfO-jsEHdog_cSaaL0VP';

const csv=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;

export async function GET(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const query=req.nextUrl.searchParams.get('q')||null;
  const r=await fetch(`${supabaseUrl}/rest/v1/rpc/admin_audit_log_v4`,{
   method:'POST',
   headers:{apikey:publishable,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
   body:JSON.stringify({p_limit:500,p_query:query,p_actor:null,p_subject:null}),
   cache:'no-store',
  });
  const rows=await r.json().catch(()=>[]);
  if(!r.ok)return NextResponse.json({error:rows?.message||'Unable to export audit log.'},{status:r.status});
  const header=['time','performed_by','actor_email','actor_role','action','affected_member','affected_email','record_type','record_id','reason','operation'];
  const lines=[header.join(',')];
  for(const a of Array.isArray(rows)?rows:[]){
   lines.push([
    a.created_at,
    [a.actor_first_name,a.actor_surname].filter(Boolean).join(' ')||a.actor_type||'SYSTEM',
    a.actor_email,
    a.actor_role||a.actor_type,
    a.action,
    [a.subject_first_name,a.subject_surname].filter(Boolean).join(' '),
    a.subject_email,
    a.entity_type,
    a.entity_id,
    a.reason,
    a.operation,
   ].map(csv).join(','));
  }
  return new NextResponse(lines.join('\n'),{status:200,headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="cooperative-audit-${new Date().toISOString().slice(0,10)}.csv"`,'Cache-Control':'no-store'}});
 }catch(e){
  console.error('audit_export_error',e);
  return NextResponse.json({error:'Unable to export audit log.'},{status:500});
 }
}
