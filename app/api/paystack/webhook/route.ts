import {NextRequest,NextResponse} from 'next/server';
import crypto from 'node:crypto';
import {cooperativeEmailTemplate,sendTransactionalEmail} from '../../../../lib/email';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
async function serviceRpc(name:string,args:Record<string,unknown>){const key=process.env.V4_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('Supabase service role is not configured');const r=await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store'});const x=await r.json().catch(()=>null);if(!r.ok)throw new Error(x?.message||`RPC ${name} failed`);return x}
async function notify(to:string|undefined,subject:string,title:string,body:string){if(!to)return;try{await sendTransactionalEmail({to,subject,html:cooperativeEmailTemplate(title,body,{label:'Open member portal',url:process.env.NEXT_PUBLIC_APP_URL||'https://cooperative-production-v2.vercel.app/portal'})})}catch(e){console.error('transactional_email_error',e)}}

export async function POST(req:NextRequest){
 const secret=process.env.V4_PAYSTACK_SECRET_KEY||process.env.PAYSTACK_SECRET_KEY;if(!secret)return NextResponse.json({error:'Payment webhook is not configured.'},{status:503});
 const raw=await req.text();const expected=crypto.createHmac('sha512',secret).update(raw).digest('hex');const signature=req.headers.get('x-paystack-signature')||'';if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return NextResponse.json({error:'Invalid signature'},{status:401});
 try{
  const event=JSON.parse(raw);const eventType=String(event.event||'');const d=event.data||{};const reference=String(d.reference||'');const hash=crypto.createHash('sha256').update(raw).digest('hex');

  if(['transfer.success','transfer.failed','transfer.reversed'].includes(eventType)){
   if(!reference)return NextResponse.json({ok:true,ignored:'missing transfer reference'});
   const eventId=`${eventType}:${String(d.id||reference)}`;
   const fresh=await serviceRpc('record_paystack_event',{p_event_id:eventId,p_event_type:eventType,p_payload_hash:hash,p_payload:event});
   if(fresh===false)return NextResponse.json({ok:true,duplicate:true});
   await serviceRpc('finalize_paystack_transfer',{p_reference:reference,p_outcome:eventType,p_provider_payload:event});
   return NextResponse.json({ok:true});
  }

  if(eventType!=='charge.success')return NextResponse.json({ok:true});
  const amount=Number(d.amount||0);const purpose=String(d.metadata?.purpose||'').toUpperCase();
  if(purpose==='REGISTRATION'){
   const result=await serviceRpc('verify_registration_payment',{p_reference:reference,p_amount_kobo:amount,p_provider_payload_hash:hash});
   if(!result?.already_processed)await notify(result?.email,'Registration payment received','Registration fee received',`<p>Your ₦${(amount/100).toLocaleString('en-NG')} registration fee has been verified successfully.</p><p>Reference: <strong>${reference}</strong></p><p>You can continue your membership application from the cooperative portal. Share capital and thrift contributions can be funded after activation.</p>`);
  }
  else if(purpose==='WALLET'){
   const result=await serviceRpc('credit_member_wallet_v4',{p_user:d.metadata?.user_id,p_reference:reference,p_amount_kobo:amount,p_provider_payload_hash:hash});
   if(!result?.already_processed)await notify(result?.email,'Wallet funded successfully','Wallet funded',`<p>Your cooperative wallet has been credited with <strong>₦${(amount/100).toLocaleString('en-NG')}</strong>.</p><p>Reference: <strong>${reference}</strong></p>`);
  }
  return NextResponse.json({ok:true});
 }catch(e){console.error('paystack_webhook_error',e);return NextResponse.json({error:'Webhook processing failed'},{status:500})}
}
