'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {supabase,friendlyError} from '../../../lib/supabase';

type Summary=Record<string,number|string>;
const money=(k:any)=>`₦${(Number(k||0)/100).toLocaleString('en-NG',{maximumFractionDigits:2})}`;

export default function Reports(){
 const[data,setData]=useState<Summary|null>(null);
 const[msg,setMsg]=useState('');
 const[busy,setBusy]=useState(false);
 async function load(){setBusy(true);setMsg('');const r=await supabase.rpc('admin_financial_summary_v4');setBusy(false);if(r.error){setMsg(friendlyError(r.error.message));return}setData(r.data||{})}
 useEffect(()=>{void load()},[]);
 function downloadCsv(){
  if(!data)return;
  const rows=[['Metric','Value'],...Object.entries(data).map(([k,v])=>[k,String(v??'')])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=`financial-snapshot-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(href);
 }
 return <main className="section"><div className="container stack">
  <div className="actions" style={{justifyContent:'space-between'}}><Link href="/admin" className="btn">← Administration</Link><div className="actions"><button className="btn" onClick={()=>void load()} disabled={busy}>{busy?'Refreshing…':'Refresh'}</button><button className="btn primary" onClick={downloadCsv} disabled={!data}>Download CSV</button></div></div>
  <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Management reporting</p><h1>Financial snapshot</h1><p>Read-only cooperative totals calculated from the live member balance, registration, loan and withdrawal records.</p></div><span className="status">Live data</span></section>
  {msg&&<div className="alert error">{msg}</div>}
  {data&&<>
   <div className="metrics">
    <div className="card metric"><small>Active members</small><strong>{Number(data.members||0).toLocaleString()}</strong></div>
    <div className="card metric"><small>Wallet liability</small><strong>{money(data.wallet_kobo)}</strong></div>
    <div className="card metric"><small>Savings liability</small><strong>{money(data.participative_savings_kobo)}</strong></div>
    <div className="card metric"><small>Share capital</small><strong>{money(data.share_capital_kobo)}</strong></div>
   </div>
   <div className="grid2">
    <section className="card"><div className="cardHeader"><h3>Credit exposure</h3></div><div className="factGrid"><div className="fact"><small>Outstanding loans</small><b>{money(data.loan_outstanding_kobo)}</b></div><div className="fact"><small>Active loans</small><b>{Number(data.active_loans||0).toLocaleString()}</b></div><div className="fact"><small>Pledged security</small><b>{money(data.pledged_security_kobo)}</b></div><div className="fact"><small>Fees due</small><b>{money(data.fees_due_kobo)}</b></div></div></section>
    <section className="card"><div className="cardHeader"><h3>Cash-flow obligations</h3></div><div className="factGrid"><div className="fact"><small>Pending withdrawals</small><b>{money(data.pending_withdrawals_kobo)}</b></div><div className="fact"><small>Pending withdrawal fees</small><b>{money(data.pending_withdrawal_fees_kobo)}</b></div><div className="fact"><small>Verified registration fees</small><b>{money(data.verified_registration_fees_kobo)}</b></div></div></section>
   </div>
   <p className="muted">Generated {data.generated_at?new Date(String(data.generated_at)).toLocaleString():'now'}. These figures are management summaries and do not replace formal audited financial statements.</p>
  </>}
 </div></main>
}
