import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';

export async function POST(req:Request){
 const url=process.env.NEXT_PUBLIC_V4_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY;
 const auth=req.headers.get('authorization')||'';
 if(!url||!key)return NextResponse.json({error:'Supabase is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});
 if(!auth.toLowerCase().startsWith('bearer '))return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});

 let body:any;
 try{body=await req.json()}catch{return NextResponse.json({error:'Invalid request body.'},{status:400,headers:{'Cache-Control':'no-store'}})}
 const userId=String(body?.user_id||'').trim();
 const reason=String(body?.reason||'').trim();
 const mode=String(body?.mode||'preapprove').toLowerCase();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId))return NextResponse.json({error:'A valid user_id is required.'},{status:400,headers:{'Cache-Control':'no-store'}});
 if(reason.length<4)return NextResponse.json({error:'A reason is required for the audit record.'},{status:400,headers:{'Cache-Control':'no-store'}});
 if(!['preapprove','activate'].includes(mode))return NextResponse.json({error:'Invalid membership action.'},{status:400,headers:{'Cache-Control':'no-store'}});

 const rpc=mode==='activate'?'super_admin_activate_member_v4':'admin_preapprove_signed_up_user_v4';
 const upstream=await fetch(`${url}/rest/v1/rpc/${rpc}`,{
  method:'POST',
  headers:{apikey:key,Authorization:auth,'Content-Type':'application/json'},
  body:JSON.stringify({p_user:userId,p_reason:reason}),
  cache:'no-store'
 });
 const payload=await upstream.json().catch(()=>({error:'Membership action failed.'}));
 if(!upstream.ok){
  const message=String(payload?.message||payload?.error||'Membership action failed.');
  const status=upstream.status===401?401:upstream.status===403?403:400;
  return NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
 }
 return NextResponse.json({ok:true,mode,result:payload},{headers:{'Cache-Control':'no-store'}});
}
