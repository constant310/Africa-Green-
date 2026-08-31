import {NextRequest,NextResponse} from 'next/server';

const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
const publishable=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_B6dHJGvHPWrJfO-jsEHdog_cSaaL0VP';

async function authenticated(token:string){
 const r=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:publishable,Authorization:`Bearer ${token}`},cache:'no-store'});
 return r.ok;
}

export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token||!(await authenticated(token)))return NextResponse.json({error:'Unauthorized'},{status:401});

  const appId=process.env.DOJAH_APP_ID;
  const secret=process.env.DOJAH_SECRET_KEY;
  const environment=(process.env.DOJAH_ENVIRONMENT||'sandbox').toLowerCase();
  if(!appId||!secret)return NextResponse.json({error:'Dojah is not configured on this deployment.'},{status:503});

  const body=await req.json().catch(()=>({}));
  const nin=String(body.nin||'').replace(/\D/g,'');
  const consent=body.consent===true||String(body.consent||'').toLowerCase()==='yes';
  if(!consent)return NextResponse.json({error:'Identity verification consent is required.'},{status:400});
  if(!/^\d{11}$/.test(nin))return NextResponse.json({error:'Enter a valid 11-digit NIN.'},{status:400});

  const baseUrl=environment==='live'?'https://api.dojah.io':'https://sandbox.dojah.io';
  const url=new URL('/api/v1/kyc/nin',baseUrl);
  url.searchParams.set('nin',nin);
  const r=await fetch(url,{headers:{AppId:appId,Authorization:secret,Accept:'application/json'},cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
   const message=data?.error||data?.message||'Identity verification could not be completed.';
   return NextResponse.json({error:String(message),provider:'dojah',environment},{status:r.status===401?502:400});
  }

  const entity=data?.entity||{};
  return NextResponse.json({
   ok:true,
   provider:'dojah',
   environment,
   verified:true,
   identity:{
    first_name:entity.first_name||entity.firstname||null,
    middle_name:entity.middle_name||entity.middlename||null,
    last_name:entity.last_name||entity.surname||null,
    date_of_birth:entity.date_of_birth||entity.dob||null,
    gender:entity.gender||null,
   }
  },{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('dojah_kyc_error',e);
  return NextResponse.json({error:'Unable to complete identity verification.'},{status:500});
 }
}
