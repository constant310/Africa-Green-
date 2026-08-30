import {NextRequest,NextResponse} from 'next/server';
import {cooperativeEmailTemplate,sendTransactionalEmail} from '../../../../lib/email';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
const serviceRole=process.env.V4_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'';

async function currentRoles(token:string){
 const apiKey=publishable||serviceRole;
 if(!apiKey)return [] as string[];
 const r=await fetch(`${supabaseUrl}/rest/v1/rpc/admin_current_roles_v4`,{method:'POST',headers:{apikey:apiKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
 if(!r.ok)return [] as string[];
 const data=await r.json().catch(()=>[]);
 return Array.isArray(data)?data.map(String):[];
}

async function allRegisteredEmails(){
 if(!serviceRole)return [] as string[];
 const r=await fetch(`${supabaseUrl}/rest/v1/profiles?select=email&email=not.is.null&order=created_at.asc`,{
  headers:{apikey:serviceRole,Authorization:`Bearer ${serviceRole}`},cache:'no-store'
 });
 if(!r.ok)return [] as string[];
 const rows=await r.json().catch(()=>[]);
 const values=Array.isArray(rows)?rows.map((x:any)=>String(x?.email||'').trim().toLowerCase()).filter((x:string)=>x.includes('@')):[];
 return [...new Set(values)];
}

const subject='Acres of Diamond — email delivery test';
const html=cooperativeEmailTemplate('Email delivery is working','<p>This is a test email from the Acres of Diamond cooperative platform.</p><p>If you received this message, the Resend integration is connected successfully.</p>');

export async function POST(req:NextRequest){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
 const roles=await currentRoles(token);
 if(!roles.includes('SUPER_ADMIN')&&!roles.includes('ADMIN'))return NextResponse.json({error:'Admin access required'},{status:403});
 const body=await req.json().catch(()=>({}));

 if(body?.all===true){
  const recipients=await allRegisteredEmails();
  if(!recipients.length)return NextResponse.json({error:'No registered user emails found.'},{status:404});
  const sent:string[]=[];const failed:{email:string;error:string}[]=[];
  for(const to of recipients){
   const result=await sendTransactionalEmail({to,subject,html});
   if(result.ok)sent.push(to);else failed.push({email:to,error:result.error});
  }
  return NextResponse.json({ok:failed.length===0,total:recipients.length,sent:sent.length,failed:failed.length,failures:failed.map(x=>({email:x.email,error:x.error}))},{status:failed.length===recipients.length?502:200});
 }

 const to=String(body.to||'').trim().toLowerCase();
 if(!to||!to.includes('@'))return NextResponse.json({error:'Valid recipient email required'},{status:400});
 const result=await sendTransactionalEmail({to,subject,html});
 if(!result.ok)return NextResponse.json({error:result.error,skipped:result.skipped},{status:502});
 return NextResponse.json({ok:true,id:result.id,to});
}
