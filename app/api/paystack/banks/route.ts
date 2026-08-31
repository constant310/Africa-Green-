import {NextRequest,NextResponse} from 'next/server';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';

async function authenticated(req:NextRequest){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
 if(!token||!publishable)return false;
 const r=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:publishable,Authorization:`Bearer ${token}`},cache:'no-store'});
 return r.ok;
}

export async function GET(req:NextRequest){
 try{
  if(!(await authenticated(req)))return NextResponse.json({error:'Unauthorized'},{status:401});
  const secret=process.env.V4_PAYSTACK_SECRET_KEY||process.env.PAYSTACK_SECRET_KEY;
  if(!secret)return NextResponse.json({error:'Paystack is not configured.'},{status:503});
  const url=new URL('https://api.paystack.co/bank');
  url.searchParams.set('country','nigeria');
  url.searchParams.set('currency','NGN');
  url.searchParams.set('perPage','100');
  const r=await fetch(url,{headers:{Authorization:`Bearer ${secret}`},cache:'no-store'});
  const body=await r.json().catch(()=>null);
  if(!r.ok||!body?.status)return NextResponse.json({error:body?.message||'Unable to load banks.'},{status:502});
  const banks=(Array.isArray(body.data)?body.data:[])
   .filter((b:any)=>b?.code&&b?.name&&b?.active!==false)
   .map((b:any)=>({name:String(b.name),code:String(b.code),slug:String(b.slug||'')}))
   .sort((a:any,b:any)=>a.name.localeCompare(b.name));
  return NextResponse.json({ok:true,banks},{headers:{'Cache-Control':'private, max-age=3600'}});
 }catch(e){
  console.error('paystack_banks_error',e);
  return NextResponse.json({error:'Unable to load banks.'},{status:500});
 }
}
