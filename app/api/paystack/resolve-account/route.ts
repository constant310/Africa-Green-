import {NextRequest,NextResponse} from 'next/server';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';

async function userFromRequest(req:NextRequest){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
 if(!token||!publishable)return null;
 const r=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:publishable,Authorization:`Bearer ${token}`},cache:'no-store'});
 if(!r.ok)return null;
 const user=await r.json().catch(()=>null);
 return user?.id?user:null;
}

export async function POST(req:NextRequest){
 try{
  if(!(await userFromRequest(req)))return NextResponse.json({error:'Unauthorized'},{status:401});
  const secret=process.env.V4_PAYSTACK_SECRET_KEY||process.env.PAYSTACK_SECRET_KEY;
  if(!secret)return NextResponse.json({error:'Paystack is not configured.'},{status:503});
  const body=await req.json().catch(()=>({}));
  const bankCode=String(body.bank_code||'').trim();
  const accountNumber=String(body.account_number||'').replace(/\D/g,'');
  if(!bankCode||accountNumber.length!==10)return NextResponse.json({error:'Select a bank and enter a valid 10-digit account number.'},{status:400});
  const url=new URL('https://api.paystack.co/bank/resolve');
  url.searchParams.set('account_number',accountNumber);
  url.searchParams.set('bank_code',bankCode);
  const r=await fetch(url,{headers:{Authorization:`Bearer ${secret}`},cache:'no-store'});
  const x=await r.json().catch(()=>null);
  if(!r.ok||!x?.status||!x?.data?.account_name)return NextResponse.json({error:x?.message||'The bank account could not be verified.'},{status:422});
  return NextResponse.json({ok:true,account_number:String(x.data.account_number||accountNumber),account_name:String(x.data.account_name),bank_code:bankCode});
 }catch(e){
  console.error('paystack_resolve_account_error',e);
  return NextResponse.json({error:'Unable to verify bank account.'},{status:500});
 }
}
