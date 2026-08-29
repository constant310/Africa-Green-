'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../../lib/supabase';

export default function EmailTest(){
 const router=useRouter();
 const[allowed,setAllowed]=useState(false);
 const[busy,setBusy]=useState(true);
 const[msg,setMsg]=useState('');
 const[ok,setOk]=useState(false);
 useEffect(()=>{void (async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}const r=await supabase.rpc('admin_current_roles_v4');setAllowed(Array.isArray(r.data)&&(r.data.includes('SUPER_ADMIN')||r.data.includes('ADMIN')));setBusy(false)})()},[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMsg('');setOk(false);
  const f=new FormData(e.currentTarget);const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}
  const res=await fetch('/api/admin/test-email',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({to:f.get('to')})});
  const body=await res.json().catch(()=>({}));setBusy(false);if(!res.ok){setMsg(body.error||'Email test failed.');return}setOk(true);setMsg(`Email accepted by Resend${body.id?` · Message ID: ${body.id}`:''}`);
 }
 if(busy)return <main className="onboarding"><div className="loadingBar"/></main>;
 if(!allowed)return <main className="onboarding"><div className="container" style={{paddingTop:40}}><div className="alert">Admin access is required.</div><Link className="btn" href="/admin/tools">Back to admin tools</Link></div></main>;
 return <main className="onboarding"><div className="onboardTop"><div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Email delivery test</small></span></Link><Link className="btn" href="/admin/tools">Back to admin tools</Link></div></div><div className="container" style={{paddingTop:28,paddingBottom:48,maxWidth:760}}><section className="card"><div className="cardHeader"><h3>Send a Resend test email</h3></div><p className="muted">Use this to confirm that the production app can send transactional email through Resend. This page never displays your API key.</p>{msg&&<div className={ok?'alert success':'alert'}>{msg}</div>}<form className="formGrid" onSubmit={submit}><label className="label">Recipient email<input className="field" name="to" type="email" defaultValue="ogbogorotopgrade2018@gmail.com" required/></label><button className="btn primary" disabled={busy}>{busy?'Sending…':'Send test email'}</button></form></section></div></main>;
}
