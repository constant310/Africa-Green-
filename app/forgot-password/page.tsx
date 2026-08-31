'use client';

import Link from 'next/link';
import {FormEvent,useState} from 'react';
import {supabase} from '../../lib/supabase';

const appUrl=()=>process.env.NEXT_PUBLIC_APP_URL||window.location.origin;

export default function ForgotPassword(){
 const[email,setEmail]=useState('');
 const[busy,setBusy]=useState(false);
 const[sent,setSent]=useState(false);
 const[msg,setMsg]=useState('');

 async function submit(e:FormEvent){
  e.preventDefault();
  setBusy(true);setMsg('');
  const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${appUrl()}/reset-password`});
  setBusy(false);
  if(error){setMsg('We could not start password recovery. Please try again shortly.');return;}
  setSent(true);
 }

 return <main className="authPage"><section className="authVisual"><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small style={{color:'#bdd6ca'}}>Multipurpose Cooperative Society</small></span></Link><p className="eyebrow" style={{color:'#a5dfbf',marginTop:45}}>Account recovery</p><h1>Recover access without weakening account security.</h1><p>A password recovery link is sent through the cooperative authentication provider. Transaction PINs remain separate and are never emailed.</p></section><section className="authPanel"><form className="card authCard" onSubmit={submit}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Secure account recovery</small></span></Link><h1>Forgot password?</h1><p className="muted">Enter the email address used for your cooperative account.</p>{msg&&<div className="alert error">{msg}</div>}{sent?<><div className="alert success">If an account can receive recovery email at that address, a secure reset link has been sent. Check your inbox and spam folder.</div><div className="actions"><Link className="btn primary" href="/login">Return to login</Link></div></>:<div className="formGrid"><label className="label">Email address<input className="field" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="btn primary" disabled={busy}>{busy?'Sending…':'Send recovery link'}</button></div>}<p className="muted" style={{textAlign:'center',fontSize:13}}><Link href="/login" style={{color:'var(--green)',fontWeight:850}}>Back to login</Link></p></form></section></main>;
}
