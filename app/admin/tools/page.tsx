import Link from 'next/link';

export default function AdminTools(){
 const tools=[
  {href:'/admin/create-member',title:'Create member',body:'Super Admin direct member invitation and activation with a mandatory audit reason.'},
  {href:'/admin/reports',title:'Financial reports',body:'Live read-only totals for wallet liabilities, savings, shares, loans, security, fees and withdrawals.'},
  {href:'/admin/readiness',title:'Production readiness',body:'Check whether Google OAuth, Paystack, Resend, Smile ID, Supabase and app URL configuration is present.'},
  {href:'/activity',title:'Member activity view',body:'Open the member-facing activity log to verify transparent account history.'},
  {href:'/loan-calculator',title:'Loan calculator',body:'Test the reducing-balance repayment calculator using the current cooperative policy.'},
 ];
 return <main className="section"><div className="container stack"><div className="actions"><Link className="btn" href="/admin">← Administration</Link></div><section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Operations tools</p><h1>Administration utilities</h1><p>Quick access to governance, reporting, production readiness and member transparency tools.</p></div></section><div className="featureGrid">{tools.map(t=><Link href={t.href} className="card featureCard" key={t.href} style={{textDecoration:'none',color:'inherit'}}><h3>{t.title}</h3><p>{t.body}</p><b>Open →</b></Link>)}</div></div></main>;
}
