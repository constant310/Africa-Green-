'use client';

import Link from 'next/link';
import {useState} from 'react';
import {supabase} from '../../../lib/supabase';

export default function AuditExportPage(){
 const[q,setQ]=useState('');
 const[busy,setBusy]=useState(false);
 const[msg,setMsg]=useState('');
 async function download(){
  setBusy(true);setMsg('');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setBusy(false);setMsg('Please sign in again.');return;}
  try{
   const url=`/api/admin/audit-export${q.trim()?`?q=${encodeURIComponent(q.trim())}`:''}`;
   const r=await fetch(url,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
   if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j?.error||'Unable to export audit log');}
   const blob=await r.blob();const href=URL.createObjectURL(blob);const a=document.createElement('a');
   const disposition=r.headers.get('content-disposition')||'';const match=disposition.match(/filename="?([^";]+)"?/i);
   a.href=href;a.download=match?.[1]||`cooperative-audit-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(href);
   setMsg('Audit CSV downloaded successfully.');
  }catch(e:any){setMsg(e?.message||'Unable to export audit log');}finally{setBusy(false)}
 }
 return <main className="section"><div className="container stack">
  <div className="actions"><Link href="/admin" className="btn">← Administration</Link><Link href="/admin/tools" className="btn">Admin tools</Link></div>
  <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Governance export</p><h1>Download audit log</h1><p>Export the accountable cooperative activity trail to CSV for review, reconciliation or board records. Sensitive identity and credential fields remain excluded.</p></div></section>
  {msg&&<div className="alert">{msg}</div>}
  <section className="card"><div className="cardHeader"><h3>Export options</h3></div><label className="label">Optional search filter<input className="field" value={q} onChange={e=>setQ(e.target.value)} placeholder="Actor, member, action, reason or record type"/></label><p className="muted">Leave the filter empty to export the most recent audit records available to the administration API.</p><div className="actions"><button className="btn primary" onClick={()=>void download()} disabled={busy}>{busy?'Preparing CSV…':'Download CSV'}</button></div></section>
 </div></main>;
}
