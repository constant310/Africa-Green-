import Link from 'next/link';

export default function AdminTools(){
 const tools=[
  {href:'/admin/create-member',title:'Approve signed-up user',body:'Record a pre-approval only for someone who already created an account. Registration and final membership approval are still required.'},
  {href:'/admin/reports',title:'Financial reports',body:'Live read-only totals for wallet liabilities, savings, shares, loans, security, fees and withdrawals, with CSV export.'},
  {href:'/admin/audit-export',title:'Export audit log',body:'Download the accountable cooperative audit trail as CSV for governance and reconciliation.'},
  {href:'/admin/readiness',title:'Production readiness',body:'Check Supabase, Paystack, Resend, Dojah KYC and other launch configuration without exposing secret values.'},
  {href:'/admin/email-test',title:'Send test email',body:'Send a protected Resend delivery test from the live production app and confirm the returned message ID.'},
  {href:'/notifications',title:'Member notification center',body:'Open the member inbox generated from material account and approval events.'},
  {href:'/activity',title:'Member activity view',body:'Open the member-facing activity log to verify transparent account history.'},
  {href:'/loan-calculator',title:'Loan calculator',body:'Test the reducing-balance repayment calculator using the current cooperative policy.'},
 ];
 return <main className="section"><div className="container stack"><div className="actions"><Link className="btn" href="/admin">← Administration</Link></div><section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Operations tools</p><h1>Administration utilities</h1><p>Quick access to governance, reporting, production readiness, notifications and member transparency tools.</p></div></section><div className="featureGrid">{tools.map(t=><Link href={t.href} className="card featureCard" key={t.href} style={{textDecoration:'none',color:'inherit'}}><h3>{t.title}</h3><p>{t.body}</p><b>Open →</b></Link>)}</div></div></main>;
}
