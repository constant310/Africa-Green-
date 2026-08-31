'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../lib/supabase';

export default function ResetPassword(){
 const router=useRouter();
 const[started,setStarted]=useState(false);
 const[ready,setReady]=useState(false);
 const[busy,setBusy]=useState(false);
 const[password,setPassword]=useState('');
 const[confirm,setConfirm]=useState('');
 const[msg,setMsg]=useState('Preparing secure password reset…');
 const once=useRef(false);

 useEffect(()=>{
  if(once.current)return;once.current=true;
  void (async()=>{
   const params=new URLSearchParams(window.location.search);
   const error=params.get('error_description')||params.get('error');
   if(error){setMsg('This recovery link is invalid or has expired. Request a new one.');setStarted(true);return;}
   let session=(await supabase.auth.getSession()).data.session;
   const code=params.get('code');
   if(code&&!session){
    const exchanged=await supabase.auth.exchangeCodeForSession(code);
    if(exchanged.error){setMsg('This recovery link is invalid or has expired. Request a new one.');setStarted(true);return;}
    session=exchanged.data.session;
   }
   setStarted(true);
   if(!session){setMsg('This recovery link is invalid or has expired. Request a new one.');return;}
   setReady(true);setMsg('Choose a new password for your account.');
  })().catch(()=>{setStarted(true);setMsg('We could not validate this recovery link. Request a new one.');});
 },[]);

 async function submit(e:FormEvent){
  e.preventDefault();
  if(password.length<10){setMsg('Use at least 10 characters for the new password.');return;}
  if(password!==confirm){setMsg('The two passwords do not match.');return;}
  setBusy(true);setMsg('Updating your password…');
  const {error}=await supabase.auth.updateUser({password});
  setBusy(false);
  if(error){setMsg('We could not update your password. Request a new recovery link and try again.');return;}
  await supabase.auth.signOut();
  router.replace('/login?password_reset=1');
 }

 return <main className="authPage"><section className="authVisual"><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small style={{color:'#bdd6ca'}}>Multipurpose Cooperative Society</small></span></Link><p className="eyebrow" style={{color:'#a5dfbf',marginTop:45}}>Secure recovery</p><h1>Set a new account password.</h1><p>This changes your login password only. Financial transaction authorization continues to use your separate transaction PIN.</p></section><section className="authPanel"><form className="card authCard" onSubmit={submit}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Password reset</small></span></Link><h1>Reset password</h1><div className={ready?'alert success':'alert'}>{msg}</div>{ready&&<div className="formGrid"><label className="label">New password<input className="field" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="label">Confirm new password<input className="field" type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="btn primary" disabled={busy}>{busy?'Updating…':'Update password'}</button></div>}{started&&!ready&&<div className="actions"><Link className="btn primary" href="/forgot-password">Request another recovery link</Link><Link className="btn" href="/login">Back to login</Link></div>}</form></section></main>;
}
