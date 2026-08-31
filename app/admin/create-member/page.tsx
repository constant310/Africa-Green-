'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../../lib/supabase';

type Any=Record<string,any>;

export default function MembershipOverride(){
 const router=useRouter();
 const[allowed,setAllowed]=useState(false);
 const[isSuper,setIsSuper]=useState(false);
 const[busy,setBusy]=useState(true);
 const[msg,setMsg]=useState('');
 const[q,setQ]=useState('');
 const[rows,setRows]=useState<Any[]>([]);
 const[selected,setSelected]=useState<Any|null>(null);
 const[reason,setReason]=useState('');

 useEffect(()=>{void (async()=>{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){router.replace('/login');return;}
  const roles=await supabase.rpc('admin_current_roles_v4');
  const list=Array.isArray(roles.data)?roles.data as string[]:[];
  setIsSuper(list.includes('SUPER_ADMIN'));
  setAllowed(list.includes('ADMIN')||list.includes('SUPER_ADMIN'));
  setBusy(false);
 })()},[router]);

 async function search(){
  setBusy(true);setMsg('');
  const r=await supabase.rpc('admin_search_members_v4',{p_query:q,p_limit:50});
  setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setRows(r.data||[]);
 }

 async function preapprove(){
  if(!selected?.id||!reason.trim())return;
  setBusy(true);setMsg('');
  const r=await supabase.rpc('admin_preapprove_signed_up_user_v4',{p_user:selected.id,p_reason:reason.trim()});
  setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setMsg('Pre-approval recorded. The normal registration, payment and final approval workflow still applies.');
  await search();
 }

 async function activateDirectly(){
  if(!isSuper||!selected?.id||!reason.trim())return;
  setBusy(true);setMsg('');
  const r=await supabase.rpc('super_admin_activate_member_v4',{p_user:selected.id,p_reason:reason.trim()});
  setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setMsg('Membership activated by Super Admin override. The exception, actor and reason were written to the audit log.');
  await search();
 }

 if(busy&&!allowed)return <main className="onboarding"><div className="loadingBar"/></main>;
 if(!allowed)return <main className="onboarding"><div className="container" style={{paddingTop:40}}><div className="alert">Admin or Super Admin access is required.</div><Link className="btn" href="/admin">Back to administration</Link></div></main>;

 return <main className="onboarding">
  {busy&&<div className="loadingBar"/>}
  <div className="onboardTop"><div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Membership administration</small></span></Link><Link className="btn" href="/admin">Back to administration</Link></div></div>
  <div className="container stack" style={{paddingTop:28,paddingBottom:48,maxWidth:900}}>
   <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Membership control</p><h2>Review signed-up accounts and handle exceptional activation.</h2><p>Admins can record a normal pre-approval. Super Admins can also directly activate an existing account when an authorized exception is necessary. Direct activation requires a reason and is permanently audited.</p></div></section>
   {msg&&<div className="alert">{msg}</div>}
   <section className="card"><div className="cardHeader"><h3>Find an existing account</h3></div><div className="inline"><input className="field" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void search()} placeholder="Name, email, phone or member number"/><button className="btn primary" onClick={()=>void search()}>Search</button></div>{rows.map(r=><button key={r.id} className="list" style={{width:'100%',background:'transparent'}} onClick={()=>setSelected(r)}><div style={{textAlign:'left'}}><b>{r.first_name} {r.surname}</b><small>{r.email} · {String(r.membership_status||'ACCOUNT_CREATED').replaceAll('_',' ')}</small></div><span className="status">Select</span></button>)}</section>
   {selected&&<section className="card"><div className="cardHeader"><h3>Membership action — {selected.first_name} {selected.surname}</h3></div><p className="muted">Account: {selected.email}. Choose the normal pre-approval path unless a Super Admin has a documented reason to use the exceptional direct-activation path.</p><label className="label">Reason for action<textarea className="field" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required for the audit record"/></label><div className="actions"><button className="btn" disabled={busy||!reason.trim()} onClick={()=>void preapprove()}>Record pre-approval</button>{isSuper&&<button className="btn primary" disabled={busy||!reason.trim()||selected.membership_status==='ACTIVE'} onClick={()=>void activateDirectly()}>Bypass process & activate member</button>}</div><p className="muted">Pre-approval keeps registration, KYC, bye-law acceptance, payment and the normal approval workflow intact. Direct activation is a Super Admin-only exception: it creates the member ledger accounts, assigns a member number and Member role, activates portal access, notifies the member and records the bypass in the audit trail.</p></section>}
  </div>
 </main>;
}
