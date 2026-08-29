import {NextRequest,NextResponse} from 'next/server';
import crypto from 'node:crypto';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||'';

async function serviceRpc(name:string,args:Record<string,unknown>){
 const key=process.env.V4_SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw new Error('Server wallet sync is not configured.');
 const r=await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`,{
  method:'POST',
  headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify(args),
 });
 const x=await r.json().catch(()=>null);
 if(!r.ok)throw new Error(x?.message||`RPC ${name} failed`);
 return x;
}

export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const secret=process.env.V4_PAYSTACK_SECRET_KEY||process.env.PAYSTACK_SECRET_KEY;
  if(!secret)return NextResponse.json({error:'Paystack is not configured.'},{status:503});
  const body=await req.json();
  const reference=String(body.reference||'').trim();
  if(!reference.startsWith('AOD-WALLET-'))return NextResponse.json({error:'Invalid wallet payment reference.'},{status:400});

  const u=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:publishable,Authorization:`Bearer ${token}`}});
  const user=await u.json();
  if(!u.ok||!user.id)return NextResponse.json({error:'Your session has expired. Please log in again.'},{status:401});

  const p=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{
   headers:{Authorization:`Bearer ${secret}`},cache:'no-store'
  });
  const verified=await p.json();
  if(!p.ok||!verified.status)return NextResponse.json({error:verified.message||'Unable to verify payment.'},{status:502});
  const d=verified.data||{};
  if(d.status!=='success')return NextResponse.json({synced:false,status:d.status||'pending'},{status:202});
  if(String(d.metadata?.purpose||'').toUpperCase()!=='WALLET')return NextResponse.json({error:'Payment is not a wallet funding transaction.'},{status:400});
  if(String(d.metadata?.user_id||'')!==String(user.id))return NextResponse.json({error:'Payment does not belong to this account.'},{status:403});

  const payloadHash=crypto.createHash('sha256').update(JSON.stringify(d)).digest('hex');
  const result=await serviceRpc('credit_member_wallet_v4',{
   p_user:user.id,
   p_reference:reference,
   p_amount_kobo:Number(d.amount||0),
   p_provider_payload_hash:payloadHash,
  });
  return NextResponse.json({synced:true,already_processed:Boolean(result?.already_processed),amount_kobo:Number(d.amount||0)});
 }catch(e){
  console.error('wallet_verify_error',e);
  return NextResponse.json({error:e instanceof Error?e.message:'Unable to sync wallet payment.'},{status:500});
 }
}
