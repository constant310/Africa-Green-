import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';

export async function GET(){
 return NextResponse.json({
  ok:true,
  app:'Acres of Diamond V4',
  integrations:{
   supabase_public:Boolean((process.env.NEXT_PUBLIC_V4_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)&&(process.env.NEXT_PUBLIC_V4_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
   supabase_server:Boolean(process.env.V4_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY),
   paystack_public:Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY),
   paystack_server:Boolean(process.env.V4_PAYSTACK_SECRET_KEY||process.env.PAYSTACK_SECRET_KEY),
   resend:Boolean(process.env.V4_RESEND_API_KEY||process.env.RESEND_API_KEY),
   resend_sender:Boolean(process.env.RESEND_FROM_EMAIL||process.env.V4_RESEND_FROM_EMAIL),
   smile_partner:Boolean(process.env.SMILE_ID_PARTNER_ID),
   smile_api_key:Boolean(process.env.SMILE_ID_API_KEY),
   smile_environment:process.env.SMILE_ID_ENVIRONMENT==='live'?'live':process.env.SMILE_ID_ENVIRONMENT?'sandbox':'not_configured',
   app_url:Boolean(process.env.NEXT_PUBLIC_APP_URL||process.env.NEXT_PUBLIC_SITE_URL),
  },
  note:'This endpoint reports configuration presence only. It never returns secret values. Google OAuth provider credentials are configured inside Supabase Auth and are intentionally not exposed here.'
 },{headers:{'Cache-Control':'no-store'}});
}
