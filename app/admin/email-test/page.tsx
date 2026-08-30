'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../../lib/supabase';

export default function EmailTest(){
 const router=useRouter();
 const[busy,setBusy]=useState(true);
 const[msg,setMsg]=useState('');
 const[ok,setOk]=useState(false);
 useEffect(()=>{void (async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login?next=%2Fadmin%2Femail-test');return}setBusy(false)})()},[router]);

 async function authSession(){const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login?next=%2Fadmin%2Femail-test');return null}return session}

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMsg('');setOk(false);
  const f=new FormData(e.currentTarget);const session=await authSession();if(!session)return;
  const res=await fetch('/api/admin/test-email',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({to:f.get('to')})});
  const body=await res.json().catch(()=>({}));setBusy(false);if(!res.ok){setMsg(body.error||'Email test failed.');return}setOk(true);setMsg(`Email accepted by Resend${body.id?` · Message ID: ${body.id}`:''}`);
 }

 async function sendAll(){
  if(!window.confirm('Send the Resend test email to every account that currently has an email address?'))return;
  setBusy(true);setMsg('');setOk(false);const session=await authSession();if(!session)return;
  const res=await fetch('/api/admin/test-email',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({all:true})});
  const body=await res.json().catch(()=>({}));setBusy(false);
  if(!res.ok){setMsg(body.error||'Bulk email test failed.');return}
  setOk(body.failed===0);setMsg(`Resend test completed: ${body.sent||0} sent, ${body.failed||0} failed, ${body.total||0} total recipients.`);
 }

 if(busy)return <main className="onboarding"><div className="loadingBar"/></main>;
 return <main className="onboarding"><div className="onboardTop"><div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Email delivery test</small></span></Link><Link className="btn" href="/admin/tools">Back to admin tools</Link></div></div><div className="container" style={{paddingTop:28,paddingBottom:48,maxWidth:760}}><section className="card"><div className="cardHeader"><h3>Send a Resend test email</h3></div><p className="muted">This page uses your signed-in session. The protected API performs the actual Admin/Super Admin authorization before sending through Resend.</p>{msg&&<div className={ok?'alert success':'alert'}>{msg}</div>}<form className="formGrid" onSubmit={submit}><label className="label">Recipient email<input className="field" name="to" type="email" defaultValue="ogbogorotopgrade2018@gmail.com" required/></label><button className="btn primary" disabled={busy}>{busy?'Sending…':'Send test email'}</button></form><hr style={{margin:'28px 0',border:0,borderTop:'1px solid var(--line)'}}/><div><h3 style={{marginBottom:8}}>Test all registered accounts</h3><p className="muted">Sends the same Resend delivery test to every account with an email address. Duplicate addresses are removed before sending.</p><button className="btn" onClick={()=>void sendAll()} disabled={busy}>{busy?'Sending…':'Send test to all users'}</button></div></section></div></main>;
}
