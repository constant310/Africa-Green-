import {NextRequest,NextResponse} from 'next/server';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
const serviceKey=()=>process.env.V4_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const paystackKey=()=>process.env.V4_PAYSTACK_SECRET_KEY||process.env.PAYSTACK_SECRET_KEY||'';

type Any=Record<string,any>;

async function adminContext(req:NextRequest){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
 if(!token||!publishable)return null;
 const u=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:publishable,Authorization:`Bearer ${token}`},cache:'no-store'});
 const user=await u.json().catch(()=>null);
 if(!u.ok||!user?.id)return null;
 const rr=await fetch(`${supabaseUrl}/rest/v1/rpc/admin_current_roles_v4`,{method:'POST',headers:{apikey:publishable,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
 const roles=await rr.json().catch(()=>[]);
 if(!rr.ok||!Array.isArray(roles)||(!roles.includes('ADMIN')&&!roles.includes('SUPER_ADMIN')))return null;
 return {user,token,roles};
}

async function serviceJson(path:string,init?:RequestInit){
 const key=serviceKey();
 if(!key)throw new Error('Supabase server access is not configured.');
 const r=await fetch(`${supabaseUrl}${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'});
 const x=await r.json().catch(()=>null);
 if(!r.ok)throw new Error(x?.message||x?.error||`Supabase request failed (${r.status})`);
 return x;
}

async function serviceRpc(name:string,args:Any){return serviceJson(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(args)});}
async function getWithdrawal(id:string){
 const rows=await serviceJson(`/rest/v1/withdrawal_requests?id=eq.${encodeURIComponent(id)}&select=*`);
 return Array.isArray(rows)?rows[0]||null:null;
}
async function paystack(path:string,init?:RequestInit){
 const secret=paystackKey();
 if(!secret)throw new Error('Paystack is not configured.');
 const r=await fetch(`https://api.paystack.co${path}`,{...init,headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'});
 const x=await r.json().catch(()=>null);
 return {ok:r.ok&&Boolean(x?.status),status:r.status,body:x};
}

async function verifyTransfer(reference:string){
 const v=await paystack(`/transfer/verify/${encodeURIComponent(reference)}`);
 return v.ok?v.body?.data:null;
}

async function settleImmediate(reference:string,data:Any){
 const status=String(data?.status||'').toLowerCase();
 if(status==='success')return serviceRpc('finalize_paystack_transfer',{p_reference:reference,p_outcome:'transfer.success',p_provider_payload:{event:'transfer.success',data}});
 if(status==='failed')return serviceRpc('finalize_paystack_transfer',{p_reference:reference,p_outcome:'transfer.failed',p_provider_payload:{event:'transfer.failed',data}});
 if(status==='reversed')return serviceRpc('finalize_paystack_transfer',{p_reference:reference,p_outcome:'transfer.reversed',p_provider_payload:{event:'transfer.reversed',data}});
 return null;
}

export async function POST(req:NextRequest){
 try{
  if(!(await adminContext(req)))return NextResponse.json({error:'Administrative authorization is required.'},{status:403});
  if(!serviceKey()||!paystackKey())return NextResponse.json({error:'Server payment configuration is incomplete.'},{status:503});
  const body=await req.json().catch(()=>({}));
  const id=String(body.withdrawal_id||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'A valid withdrawal is required.'},{status:400});
  let w=await getWithdrawal(id);
  if(!w)return NextResponse.json({error:'Withdrawal not found.'},{status:404});

  if(body.otp){
   if(w.status!=='PROCESSING'||!w.provider_transfer_code)return NextResponse.json({error:'This withdrawal is not awaiting transfer authorization.'},{status:409});
   const f=await paystack('/transfer/finalize_transfer',{method:'POST',body:JSON.stringify({transfer_code:w.provider_transfer_code,otp:String(body.otp).trim()})});
   if(!f.ok)return NextResponse.json({error:f.body?.message||'Transfer OTP could not be finalized.'},{status:422});
   const data=f.body?.data||{};
   await settleImmediate(String(w.provider_reference||data.reference||''),data);
   return NextResponse.json({ok:true,status:data.status||'pending',reference:w.provider_reference,needs_otp:false});
  }

  if(['COMPLETED','FAILED','REVERSED'].includes(String(w.status)))return NextResponse.json({ok:true,status:w.status,reference:w.provider_reference,already_final:true});

  const reference=String(w.provider_reference||`aodwd-${id}`).toLowerCase();
  if(w.status==='PROCESSING'){
   const existing=await verifyTransfer(reference);
   if(existing){
    await settleImmediate(reference,existing);
    return NextResponse.json({ok:true,status:existing.status||'processing',reference,needs_otp:String(existing.status||'').toLowerCase()==='otp',transfer_code:existing.transfer_code||w.provider_transfer_code});
   }
   return NextResponse.json({ok:true,status:'processing',reference,needs_otp:false,message:'Transfer is already being processed.'});
  }

  if(w.status!=='APPROVED')return NextResponse.json({error:'Two independent approvals are required before payout.'},{status:409});
  const b=w.beneficiary_snapshot||{};
  const bankCode=String(b.bank_code||'').trim();
  const accountNumber=String(b.account_number||'').replace(/\D/g,'');
  const accountName=String(b.account_name||'').trim();
  if(!bankCode||accountNumber.length!==10||!accountName)return NextResponse.json({error:'The saved beneficiary is not Paystack-verified. The member must save a verified bank beneficiary before payout.'},{status:422});

  const recipient=await paystack('/transferrecipient',{method:'POST',body:JSON.stringify({type:'nuban',name:accountName,account_number:accountNumber,bank_code:bankCode,currency:'NGN'})});
  if(!recipient.ok||!recipient.body?.data?.recipient_code)return NextResponse.json({error:recipient.body?.message||'Unable to create Paystack transfer recipient.'},{status:422});

  let transfer=await paystack('/transfer',{method:'POST',body:JSON.stringify({source:'balance',amount:Number(w.amount_kobo),recipient:recipient.body.data.recipient_code,reference,reason:`Acres of Diamond withdrawal ${id.slice(0,8)}`,currency:'NGN'})});
  let data=transfer.body?.data||null;
  if(!transfer.ok){
   data=await verifyTransfer(reference);
   if(!data)return NextResponse.json({error:transfer.body?.message||'Paystack could not initiate the withdrawal transfer.'},{status:422});
  }

  try{
   await serviceRpc('mark_withdrawal_processing',{p_withdrawal_id:id,p_transfer_code:String(data.transfer_code||''),p_reference:reference});
  }catch(e){
   w=await getWithdrawal(id);
   if(!['PROCESSING','COMPLETED','FAILED','REVERSED'].includes(String(w?.status||'')))throw e;
  }
  await settleImmediate(reference,data);
  return NextResponse.json({ok:true,status:data.status||'pending',reference,transfer_code:data.transfer_code||null,needs_otp:String(data.status||'').toLowerCase()==='otp'});
 }catch(e){
  console.error('withdrawal_transfer_error',e);
  return NextResponse.json({error:e instanceof Error?e.message:'Unable to process withdrawal payout.'},{status:500});
 }
}
