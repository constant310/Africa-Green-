'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';
import {supabase,friendlyError} from '../../lib/supabase';

export default function SupportPage(){
 const [ready,setReady]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 const [subject,setSubject]=useState('');
 const [category,setCategory]=useState('GENERAL');
 const [message,setMessage]=useState('');
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);

 useEffect(()=>{void supabase.auth.getSession().then(({data})=>{setSignedIn(Boolean(data.session));setReady(true);});},[]);

 async function submit(e:FormEvent){
  e.preventDefault();
  setBusy(true);setStatus('');
  const {error}=await supabase.rpc('create_support_ticket_v4',{p_subject:subject.trim(),p_category:category,p_message:message.trim()});
  if(error){setStatus(friendlyError(error.message));setBusy(false);return;}
  setSubject('');setMessage('');setStatus('Support request submitted successfully.');setBusy(false);
 }

 return <main className="pageShell"><section className="card" style={{maxWidth:780,margin:'40px auto'}}><p className="eyebrow">Member support</p><h1>How can we help?</h1><p className="muted">Use this secure form for account, membership, payment, wallet, loan, withdrawal or technical issues. Never include your password, transaction PIN, full identity number or card details in a support message.</p>
 {!ready?<p className="muted">Checking your session…</p>:!signedIn?<div className="formGrid"><p>Please sign in before submitting a support ticket so the request can be attached to your member account.</p><div className="actions"><Link className="btn primary" href="/login">Sign in</Link><Link className="btn" href="/privacy">Privacy notice</Link></div></div>:<form className="formGrid" onSubmit={submit}>
  <label className="label">Subject<input className="field" value={subject} onChange={e=>setSubject(e.target.value)} minLength={4} maxLength={120} required/></label>
  <label className="label">Category<select className="field" value={category} onChange={e=>setCategory(e.target.value)}><option value="GENERAL">General</option><option value="MEMBERSHIP">Membership</option><option value="PAYMENT">Payment</option><option value="WALLET">Wallet</option><option value="LOAN">Loan</option><option value="WITHDRAWAL">Withdrawal</option><option value="KYC">Identity verification</option><option value="TECHNICAL">Technical issue</option></select></label>
  <label className="label">Message<textarea className="field" style={{minHeight:160}} value={message} onChange={e=>setMessage(e.target.value)} minLength={10} maxLength={4000} required/></label>
  {status&&<p className="muted">{status}</p>}
  <button className="btn primary" disabled={busy}>{busy?'Submitting…':'Submit support request'}</button>
 </form>}
 <div className="actions" style={{marginTop:24}}><Link className="btn" href="/portal">Member portal</Link><Link className="btn" href="/terms">Terms</Link></div></section></main>;
}
