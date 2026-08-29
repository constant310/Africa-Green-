import {NextRequest,NextResponse} from 'next/server';
import crypto from 'node:crypto';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_B6dHJGvHPWrJfO-jsEHdog_cSaaL0VP';
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const secret=process.env.V4_PAYSTACK_SECRET_KEY;if(!secret)return NextResponse.json({error:'V4 Paystack key is not configured on this deployment.'},{status:503});
  const body=await req.json();const reference=`AOD-REG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const rpc=await fetch(`${supabaseUrl}/rest/v1/rpc/initialize_registration_payment_v4`,{method:'POST',headers:{apikey:publishable,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({p_reference:reference})});
  const payment=await rpc.json();if(!rpc.ok)return NextResponse.json({error:payment?.message||'Unable to prepare registration payment.'},{status:400});
  const p=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({email:body.email,amount:payment.amount_kobo,reference,callback_url:body.callback_url,metadata:{purpose:'REGISTRATION',reference}})});
  const x=await p.json();if(!p.ok||!x.status)return NextResponse.json({error:x.message||'Paystack could not initialize the transaction.'},{status:502});
  return NextResponse.json({authorization_url:x.data.authorization_url,reference,amount_kobo:payment.amount_kobo});
 }catch{return NextResponse.json({error:'Unable to initialize registration payment.'},{status:500})}
}
