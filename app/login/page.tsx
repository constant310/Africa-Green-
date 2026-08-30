'use client';
import Link from 'next/link';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../lib/supabase';

export default function Login(){
 const router=useRouter(); const[email,setEmail]=useState(''); const[password,setPassword]=useState(''); const[busy,setBusy]=useState(false); const[msg,setMsg]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMsg('');const {error}=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error)return setMsg(friendlyError(error.message));router.replace('/portal');}
 async function google(){
  setBusy(true);setMsg('');
  const redirectTo=`${window.location.origin}/auth/callback`;
  const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo,queryParams:{access_type:'offline',prompt:'select_account'}}});
  if(error){setBusy(false);setMsg(friendlyError(error.message));}
 }
 return <main className="authPage"><section className="authVisual"><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small style={{color:'#bdd6ca'}}>Multipurpose Cooperative Society</small></span></Link><p className="eyebrow" style={{color:'#a5dfbf',marginTop:45}}>Secure member access</p><h1>Welcome back to your cooperative.</h1><p>See your wallet, savings, Property Thrift, share capital, loans, guarantees, withdrawals, statements and membership activity in one place.</p></section><section className="authPanel"><form className="card authCard" onSubmit={submit}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Multipurpose Cooperative Society</small></span></Link><h1>Log in</h1><p className="muted">Continue to your secure member or administration portal.</p>{msg&&<div className="alert error">{msg}</div>}<div className="formGrid"><button type="button" className="btn" onClick={google} disabled={busy}>Continue with Google</button><div className="divider">or use your email</div><label className="label">Email address<input className="field" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="label">Password<input className="field" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn primary" disabled={busy}>{busy?'Please wait…':'Log in securely'}</button></div><p className="muted" style={{textAlign:'center',fontSize:13}}>New to Acres of Diamond? <Link href="/register" style={{color:'var(--green)',fontWeight:850}}>Create an account</Link></p></form></section></main>
}
