import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';

export async function GET(){
 const supabaseUrl=process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ynlmhpwytpegleafdpwb.supabase.co';
 const supabaseKey=process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_B6dHJGvHPWrJfO-jsEHdog_cSaaL0VP';
 const appUrl=process.env.NEXT_PUBLIC_APP_URL||process.env.NEXT_PUBLIC_SITE_URL||process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL||'';
 const integrations={
  supabase_public:Boolean(supabaseUrl&&supabaseKey),
  supabase_server:Boolean(process.env.V4_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY),
  paystack_public:Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY),
  paystack_server:Boolean(process.env.V4_PAYSTACK_SECRET_KEY||process.env.PAYSTACK_SECRET_KEY),
  resend:Boolean(process.env.V4_RESEND_API_KEY||process.env.RESEND_API_KEY),
  resend_sender:Boolean(process.env.RESEND_FROM_EMAIL||process.env.V4_RESEND_FROM_EMAIL),
  smile_partner:Boolean(process.env.SMILE_ID_PARTNER_ID),
  smile_api_key:Boolean(process.env.SMILE_ID_API_KEY),
  smile_environment:process.env.SMILE_ID_ENVIRONMENT==='live'?'live':process.env.SMILE_ID_ENVIRONMENT?'sandbox':'not_configured',
  dojah_app:Boolean(process.env.DOJAH_APP_ID),
  dojah_secret:Boolean(process.env.DOJAH_SECRET_KEY),
  dojah_environment:process.env.DOJAH_ENVIRONMENT==='live'?'live':process.env.DOJAH_ENVIRONMENT?'sandbox':'not_configured',
  app_url:Boolean(appUrl),
 };
 return NextResponse.json({
  ok:true,
  app:'Acres of Diamond V4',
  integrations,
  note:'This endpoint reports effective configuration presence only. It never returns secret values. OAuth and KYC credentials are intentionally not exposed here.'
 },{headers:{'Cache-Control':'no-store'}});
}
