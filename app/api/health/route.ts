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
   app_url:Boolean(process.env.NEXT_PUBLIC_APP_URL||process.env.NEXT_PUBLIC_SITE_URL),
  },
  note:'This endpoint reports configuration presence only. It never returns secret values.'
 },{headers:{'Cache-Control':'no-store'}});
}
