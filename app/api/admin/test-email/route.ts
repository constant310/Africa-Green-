import {NextRequest,NextResponse} from 'next/server';
import {cooperativeEmailTemplate,sendTransactionalEmail} from '../../../../lib/email';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';

async function currentRoles(token:string){
 if(!publishable)return [] as string[];
 const r=await fetch(`${supabaseUrl}/rest/v1/rpc/admin_current_roles_v4`,{method:'POST',headers:{apikey:publishable,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
 if(!r.ok)return [] as string[];
 const data=await r.json().catch(()=>[]);
 return Array.isArray(data)?data.map(String):[];
}

export async function POST(req:NextRequest){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
 const roles=await currentRoles(token);
 if(!roles.includes('SUPER_ADMIN')&&!roles.includes('ADMIN'))return NextResponse.json({error:'Admin access required'},{status:403});
 const body=await req.json().catch(()=>({}));
 const to=String(body.to||'').trim().toLowerCase();
 if(!to||!to.includes('@'))return NextResponse.json({error:'Valid recipient email required'},{status:400});
 const result=await sendTransactionalEmail({
  to,
  subject:'Acres of Diamond — email delivery test',
  html:cooperativeEmailTemplate('Email delivery is working','<p>This is a test email from the Acres of Diamond cooperative platform.</p><p>If you received this message, the Resend integration is connected successfully.</p>')
 });
 if(!result.ok)return NextResponse.json({error:result.error,skipped:result.skipped},{status:502});
 return NextResponse.json({ok:true,id:result.id,to});
}
