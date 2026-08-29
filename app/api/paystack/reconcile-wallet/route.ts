import {NextRequest,NextResponse} from 'next/server';
import crypto from 'node:crypto';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||'';
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

  const u=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:publishable,Authorization:`Bearer ${token}`}});
  const user=await u.json();
  if(!u.ok||!user.id)return NextResponse.json({error:'Your session has expired. Please log in again.'},{status:401});

  const from=new Date(Date.now()-7*24*60*60*1000).toISOString();
  const url=new URL('https://api.paystack.co/transaction');
  url.searchParams.set('status','success');
  url.searchParams.set('perPage','100');
  url.searchParams.set('from',from);

  const p=await fetch(url,{headers:{Authorization:`Bearer ${secret}`},cache:'no-store'});
  const listed=await p.json();
  if(!p.ok||!listed.status)return NextResponse.json({error:listed.message||'Unable to read Paystack transactions.'},{status:502});

  const matches=(Array.isArray(listed.data)?listed.data:[]).filter((d:any)=>
   String(d?.reference||'').startsWith('AOD-WALLET-')&&
   String(d?.status||'')==='success'&&
   String(d?.metadata?.purpose||'').toUpperCase()==='WALLET'&&
   String(d?.metadata?.user_id||'')===String(user.id)
  );

  let credited=0;
  let alreadyProcessed=0;
  const reconciled:string[]=[];

  for(const d of matches){
   const reference=String(d.reference||'');
   const amount=Number(d.amount||0);
   if(!reference||amount<=0)continue;
   const payloadHash=crypto.createHash('sha256').update(JSON.stringify(d)).digest('hex');
   const result=await serviceRpc('credit_member_wallet_v4',{
    p_user:user.id,
    p_reference:reference,
    p_amount_kobo:amount,
    p_provider_payload_hash:payloadHash,
   });
   if(result?.already_processed)alreadyProcessed+=1;
   else credited+=1;
   reconciled.push(reference);
  }

  return NextResponse.json({ok:true,credited_count:credited,already_processed_count:alreadyProcessed,matched_count:matches.length,reconciled});
 }catch(e){
  console.error('wallet_reconcile_error',e);
  return NextResponse.json({error:e instanceof Error?e.message:'Unable to reconcile wallet.'},{status:500});
 }
}
