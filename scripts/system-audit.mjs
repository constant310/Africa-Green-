import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
 'app/page.tsx','app/login/page.tsx','app/register/page.tsx','app/onboarding/page.tsx','app/portal/page.tsx',
 'app/loans/page.tsx','app/withdrawals/page.tsx','app/activity/page.tsx','app/notifications/page.tsx','app/documents/page.tsx',
 'app/admin/page.tsx','app/admin/create-member/page.tsx','app/admin/withdrawals/page.tsx','app/admin/support/page.tsx',
 'app/admin/readiness/page.tsx','app/admin/reports/page.tsx','app/admin/audit-export/page.tsx','app/admin/tools/page.tsx',
 'app/auth/callback/page.tsx','app/api/health/route.ts','app/api/admin/create-member/route.ts','app/api/admin/audit-export/route.ts',
 'app/api/paystack/registration/route.ts','app/api/paystack/wallet/route.ts','app/api/paystack/verify-wallet/route.ts',
 'app/api/paystack/reconcile-wallet/route.ts','app/api/paystack/banks/route.ts','app/api/paystack/resolve-account/route.ts',
 'app/api/paystack/withdrawal-transfer/route.ts','app/api/paystack/webhook/route.ts','app/api/kyc/dojah/route.ts',
 'supabase/migrations/20260831210000_v4_full_system_hardening.sql'
];

const missing=required.filter(file=>!fs.existsSync(path.join(root,file)));
if(missing.length)throw new Error(`Missing required production files:\n${missing.join('\n')}`);

const ignored=new Set(['.git','.next','node_modules']);
const textExt=new Set(['.ts','.tsx','.js','.mjs','.json','.yml','.yaml','.toml','.sql','.md']);
const secretPatterns=[
 {name:'Supabase server secret',re:/\bsb_secret_[A-Za-z0-9_-]{12,}/g},
 {name:'Paystack secret key',re:/\bsk_(?:test|live)_[A-Za-z0-9]{12,}/g}
];
const violations=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(ignored.has(entry.name))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory()){walk(full);continue;}
  if(!textExt.has(path.extname(entry.name)))continue;
  const rel=path.relative(root,full);
  const text=fs.readFileSync(full,'utf8');
  for(const p of secretPatterns){if(p.re.test(text))violations.push(`${p.name}: ${rel}`);p.re.lastIndex=0;}
  if(/NEXT_PUBLIC_(?:V4_)?(?:SUPABASE_SERVICE_ROLE_KEY|PAYSTACK_SECRET_KEY|RESEND_API_KEY)/.test(text))violations.push(`Server secret exposed through NEXT_PUBLIC_: ${rel}`);
 }
}
walk(root);
if(violations.length)throw new Error(`Release security audit failed:\n${[...new Set(violations)].join('\n')}`);

const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260831210000_v4_full_system_hardening.sql'),'utf8');
for(const marker of ['SUPER_ADMIN_MEMBER_ACTIVATED_DIRECTLY','DIRECT_ACTIVATION_REASON_REQUIRED','idx_journal_lines_journal_id']){
 if(!migration.includes(marker))throw new Error(`Hardening migration is missing ${marker}`);
}

console.log(`V4 system audit passed: ${required.length} required files, secret-surface checks, and governance hardening verified.`);
