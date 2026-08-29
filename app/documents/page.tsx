'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../lib/supabase';

type Any=Record<string,any>;
const money=(k:any)=>`₦${(Number(k||0)/100).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const pretty=(v:any)=>String(v||'').replaceAll('_',' ');

export default function DocumentsPage(){
 const router=useRouter();
 const[snap,setSnap]=useState<Any|null>(null);
 const[busy,setBusy]=useState(true);
 const[msg,setMsg]=useState('');
 const[now]=useState(()=>new Date());
 const[start,setStart]=useState(()=>{const d=new Date();d.setDate(1);return d.toISOString().slice(0,10)});
 const[end,setEnd]=useState(()=>new Date().toISOString().slice(0,10));
 async function load(){
  setBusy(true);setMsg('');const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return;}
  const r=await supabase.rpc('member_portal_snapshot_v4');setBusy(false);if(r.error){setMsg(friendlyError(r.error.message));return;}setSnap(r.data||{});
 }
 useEffect(()=>{void load()},[]);
 const profile=snap?.profile||{};const balances=snap?.balances||{};const tx:any[]=snap?.transactions||[];
 const filtered=useMemo(()=>tx.filter(t=>{const d=new Date(t.created_at||t.posted_at||0);if(Number.isNaN(d.getTime()))return true;const a=start?new Date(`${start}T00:00:00`):null;const b=end?new Date(`${end}T23:59:59.999`):null;return (!a||d>=a)&&(!b||d<=b)}),[tx,start,end]);
 const total=filtered.reduce((s,t)=>s+Number(t.amount_kobo||0),0);
 return <main className="section">{busy&&<div className="loadingBar"/>}<div className="container stack">
  <div className="actions printHide" style={{justifyContent:'space-between'}}><div className="actions"><Link className="btn" href="/portal">← Member portal</Link><Link className="btn" href="/activity">Activity</Link><Link className="btn" href="/notifications">Notifications</Link></div><button className="btn primary" onClick={()=>window.print()}>Print / Save as PDF</button></div>
  <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Member documents</p><h1>Statements & receipts</h1><p>Generate a member statement from your recorded cooperative transactions and print individual transaction records for your files.</p></div><span className="status">Generated {now.toLocaleDateString()}</span></section>
  {msg&&<div className="alert">{msg}</div>}
  <section className="card printHide"><div className="cardHeader"><h3>Statement period</h3></div><div className="two"><label className="label">From<input className="field" type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label className="label">To<input className="field" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label></div></section>
  {snap&&<>
   <section className="card"><div className="cardHeader"><div><p className="eyebrow">Acres of Diamond Multipurpose Cooperative Society</p><h3>Member statement</h3></div><span className="status">{start||'Beginning'} — {end||'Today'}</span></div><div className="factGrid"><div className="fact"><small>Member</small><b>{profile.first_name} {profile.surname}</b></div><div className="fact"><small>Member number</small><b>{profile.member_number||'Pending'}</b></div><div className="fact"><small>Email</small><b>{profile.email||'—'}</b></div><div className="fact"><small>Status</small><b>{pretty(profile.membership_status)}</b></div></div><div className="factGrid" style={{marginTop:16}}><div className="fact"><small>Available wallet</small><b>{money(balances.wallet_available_kobo)}</b></div><div className="fact"><small>Total savings</small><b>{money(balances.savings_kobo)}</b></div><div className="fact"><small>Share capital</small><b>{money(balances.share_capital_kobo)}</b></div><div className="fact"><small>Loan balance</small><b>{money(balances.loan_receivable_kobo)}</b></div></div></section>
   <section className="card"><div className="cardHeader"><h3>Transactions in period</h3><b>{filtered.length} records</b></div><div className="tableWrap"><table className="table"><thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Type</th><th>Amount</th></tr></thead><tbody>{filtered.map((t:any)=><tr key={t.id||t.reference}><td>{t.created_at?new Date(t.created_at).toLocaleString():'—'}</td><td><b>{t.description||pretty(t.source)||'Transaction'}</b></td><td>{t.reference||'—'}</td><td>{pretty(t.source||t.type||t.direction)}</td><td><b>{money(t.amount_kobo)}</b></td></tr>)}</tbody></table>{!filtered.length&&!busy&&<div className="empty">No transactions were recorded in this period.</div>}</div><div className="factGrid" style={{marginTop:16}}><div className="fact"><small>Transaction total shown</small><b>{money(total)}</b></div><div className="fact"><small>Generated</small><b>{now.toLocaleString()}</b></div></div><p className="muted" style={{marginTop:16}}>This statement is generated from the cooperative platform records. For formal audited accounts or dispute resolution, contact the cooperative administration.</p></section>
   <section className="card printHide"><div className="cardHeader"><h3>Transaction receipts</h3></div><p className="muted">Each row below can be printed as part of this document. Use your browser print dialog to save a PDF copy for your records.</p>{filtered.slice(0,50).map((t:any)=><div className="list" key={`r-${t.id||t.reference}`}><div><b>{t.description||pretty(t.source)||'Transaction'}</b><small>{t.reference||'No reference'} · {t.created_at?new Date(t.created_at).toLocaleString():'Date unavailable'}</small></div><strong>{money(t.amount_kobo)}</strong></div>)}</section>
  </>}
 </div></main>;
}
