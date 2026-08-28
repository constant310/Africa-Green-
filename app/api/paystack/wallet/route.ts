import {NextRequest,NextResponse} from 'next/server';
import crypto from 'node:crypto';
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_B6dHJGvHPWrJfO-jsEHdog_cSaaL0VP';
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const secret=process.env.PAYSTACK_SECRET_KEY;if(!secret)return NextResponse.json({error:'Paystack production key is not configured on this deployment.'},{status:503});
  const body=await req.json();const naira=Number(body.amount_naira);if(!Number.isFinite(naira)||naira<100)return NextResponse.json({error:'Enter a wallet funding amount of at least ₦100.'},{status:400});
  const u=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:publishable,Authorization:`Bearer ${token}`}});const user=await u.json();if(!u.ok||!user.id)return NextResponse.json({error:'Your session has expired. Please log in again.'},{status:401});
  const reference=`AOD-WALLET-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;const amount=Math.round(naira*100);
  const p=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({email:body.email||user.email,amount,reference,callback_url:body.callback_url,metadata:{purpose:'WALLET',user_id:user.id}})});const x=await p.json();if(!p.ok||!x.status)return NextResponse.json({error:x.message||'Paystack could not initialize the transaction.'},{status:502});
  return NextResponse.json({authorization_url:x.data.authorization_url,reference,amount_kobo:amount});
 }catch{return NextResponse.json({error:'Unable to initialize wallet funding.'},{status:500})}
}
