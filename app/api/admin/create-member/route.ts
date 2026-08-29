import {NextRequest,NextResponse} from 'next/server';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_B6dHJGvHPWrJfO-jsEHdog_cSaaL0VP';
const serviceKey=()=>process.env.V4_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'';

async function rpc(token:string,name:string,body:Record<string,unknown>){
 const r=await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:publishable,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const data=await r.json().catch(()=>null);
 return {ok:r.ok,status:r.status,data};
}

export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const secret=serviceKey();
  if(!secret)return NextResponse.json({error:'Server administration key is not configured.'},{status:503});

  const roles=await rpc(token,'admin_current_roles_v4',{});
  if(!roles.ok||!Array.isArray(roles.data)||!roles.data.includes('SUPER_ADMIN'))return NextResponse.json({error:'Super Admin access is required.'},{status:403});

  const body=await req.json();
  const email=String(body.email||'').trim().toLowerCase();
  const firstName=String(body.first_name||'').trim();
  const surname=String(body.surname||'').trim();
  const phone=String(body.phone||'').trim();
  const reason=String(body.reason||'').trim();
  const requestedRole=String(body.role||'MEMBER').toUpperCase();
  if(!email||!email.includes('@')||!firstName||!surname||!reason)return NextResponse.json({error:'Email, first name, surname and an audit reason are required.'},{status:400});
  if(!['MEMBER','ADMIN','SUPER_ADMIN'].includes(requestedRole))return NextResponse.json({error:'Invalid role.'},{status:400});

  const invite=await fetch(`${supabaseUrl}/auth/v1/invite`,{method:'POST',headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({email,data:{first_name:firstName,surname,phone,full_name:`${firstName} ${surname}`}}),cache:'no-store'});
  const invited=await invite.json().catch(()=>null);
  if(!invite.ok)return NextResponse.json({error:invited?.msg||invited?.message||invited?.error_description||'Unable to create or invite the member.'},{status:invite.status===422?409:invite.status});
  const userId=invited?.id||invited?.user?.id;
  if(!userId)return NextResponse.json({error:'The member invitation was created but no user ID was returned.'},{status:502});

  const activation=await rpc(token,'super_admin_activate_member_v4',{p_user:userId,p_reason:reason});
  if(!activation.ok)return NextResponse.json({error:activation.data?.message||'Member was invited but activation failed.',user_id:userId},{status:400});

  if(requestedRole!=='MEMBER'){
   const assigned=await rpc(token,'super_admin_assign_role_v4',{p_user:userId,p_role:requestedRole,p_reason:reason});
   if(!assigned.ok)return NextResponse.json({error:assigned.data?.message||'Member was activated but role assignment failed.',user_id:userId},{status:400});
  }

  return NextResponse.json({ok:true,user_id:userId,email,membership_status:'ACTIVE',role:requestedRole,invited:true,audited:true});
 }catch{
  return NextResponse.json({error:'Unable to create the member account.'},{status:500});
 }
}
