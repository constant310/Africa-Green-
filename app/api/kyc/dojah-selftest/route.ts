import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';

export async function GET(){
 try{
  const appId=process.env.DOJAH_APP_ID;
  const secret=process.env.DOJAH_SECRET_KEY;
  const environment=(process.env.DOJAH_ENVIRONMENT||'sandbox').toLowerCase();
  if(environment!=='sandbox')return NextResponse.json({ok:false,error:'Self-test is only allowed in sandbox.'},{status:400});
  if(!appId||!secret)return NextResponse.json({ok:false,error:'Dojah is not configured.'},{status:503});

  const url=new URL('/api/v1/kyc/nin','https://sandbox.dojah.io');
  url.searchParams.set('nin','70123456789');
  const r=await fetch(url,{headers:{AppId:appId,Authorization:secret,Accept:'application/json'},cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
   return NextResponse.json({ok:false,provider:'dojah',environment:'sandbox',status:r.status,error:data?.error||data?.message||'Sandbox verification failed.'},{status:502,headers:{'Cache-Control':'no-store'}});
  }

  const entity=data?.entity||{};
  return NextResponse.json({
   ok:true,
   provider:'dojah',
   environment:'sandbox',
   verified:true,
   test_identity_received:Boolean(entity&&Object.keys(entity).length),
   fields_received:{
    first_name:Boolean(entity.first_name||entity.firstname),
    last_name:Boolean(entity.last_name||entity.surname),
    date_of_birth:Boolean(entity.date_of_birth||entity.dob),
    gender:Boolean(entity.gender),
   }
  },{headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({ok:false,error:'Unable to run Dojah sandbox self-test.'},{status:500,headers:{'Cache-Control':'no-store'}});
 }
}
