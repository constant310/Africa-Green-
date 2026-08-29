'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';

const naira=(n:number)=>`₦${Math.max(0,n||0).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function LoanCalculator(){
 const[principal,setPrincipal]=useState('500000');
 const[months,setMonths]=useState('6');
 const monthlyRate=0.05;
 const securityRate=0.90;

 const calc=useMemo(()=>{
  const p=Math.max(0,Number(principal)||0);
  const n=Math.min(120,Math.max(1,Math.floor(Number(months)||1)));
  if(!p)return {payment:0,total:0,interest:0,security:0,rows:[] as any[]};
  const factor=Math.pow(1+monthlyRate,n);
  const regular=Math.ceil((p*monthlyRate*factor)/(factor-1));
  let balance=p,total=0;
  const rows=[] as {month:number,opening:number,payment:number,principal:number,interest:number,closing:number}[];
  for(let i=1;i<=n;i++){
   const interest=Math.floor(balance*monthlyRate);
   const payment=i===n?balance+interest:Math.min(regular,balance+interest);
   const principalPaid=payment-interest;
   const closing=Math.max(0,balance-principalPaid);
   rows.push({month:i,opening:balance,payment,principal:principalPaid,interest,closing});
   total+=payment;balance=closing;
  }
  return {payment:rows[0]?.payment||0,total,interest:total-p,security:p*securityRate,rows};
 },[principal,months]);

 return <main className="section">
  <div className="container stack">
   <div className="actions" style={{justifyContent:'space-between'}}><Link href="/" className="btn">← Home</Link><Link href="/login" className="btn">Member login</Link></div>
   <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Acres of Diamond</p><h1>Loan calculator</h1><p>Estimate repayments before you apply. The calculator follows the cooperative&apos;s current reducing-balance loan policy.</p></div><span className="status">Estimate only</span></section>

   <div className="grid2">
    <section className="card">
     <div className="cardHeader"><h3>Loan details</h3></div>
     <div className="formGrid">
      <label className="label">Loan amount (₦)<input className="field" inputMode="decimal" value={principal} onChange={e=>setPrincipal(e.target.value.replace(/[^0-9.]/g,''))} placeholder="500000"/></label>
      <label className="label">Repayment period (months)<input className="field" type="number" min={1} max={120} value={months} onChange={e=>setMonths(e.target.value)}/></label>
     </div>
     <div className="alert" style={{marginTop:16}}>Current policy used for this estimate: <b>5% monthly interest on reducing balance</b>, with security coverage of up to <b>90%</b> of qualifying savings/share security. Final eligibility and approval remain subject to cooperative rules.</div>
    </section>

    <section className="card">
     <div className="cardHeader"><h3>Estimated repayment</h3></div>
     <div className="factGrid">
      <div className="fact"><small>Monthly installment</small><b>{naira(calc.payment)}</b></div>
      <div className="fact"><small>Total repayment</small><b>{naira(calc.total)}</b></div>
      <div className="fact"><small>Total interest</small><b>{naira(calc.interest)}</b></div>
      <div className="fact"><small>Indicative security</small><b>{naira(calc.security)}</b></div>
     </div>
     <div className="actions" style={{marginTop:18}}><Link href="/login" className="btn primary">Sign in to apply</Link></div>
    </section>
   </div>

   <section className="card">
    <div className="cardHeader"><h3>Repayment schedule</h3></div>
    <div className="tableWrap"><table className="table"><thead><tr><th>Month</th><th>Opening balance</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Closing balance</th></tr></thead><tbody>{calc.rows.map(r=><tr key={r.month}><td>{r.month}</td><td>{naira(r.opening)}</td><td><b>{naira(r.payment)}</b></td><td>{naira(r.principal)}</td><td>{naira(r.interest)}</td><td>{naira(r.closing)}</td></tr>)}</tbody></table></div>
    {!calc.rows.length&&<div className="empty">Enter a loan amount to calculate a repayment schedule.</div>}
   </section>
  </div>
 </main>;
}
