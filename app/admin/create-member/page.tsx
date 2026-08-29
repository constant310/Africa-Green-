'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../../lib/supabase';

export default function CreateMember(){
 const router=useRouter();
 const[allowed,setAllowed]=useState(false);
 const[busy,setBusy]=useState(true);
 const[msg,setMsg]=useState('');
 const[done,setDone]=useState<any>(null);
 useEffect(()=>{void (async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}const r=await supabase.rpc('admin_current_roles_v4');setAllowed(Array.isArray(r.data)&&r.data.includes('SUPER_ADMIN'));setBusy(false)})()},[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMsg('');setDone(null);
  const f=new FormData(e.currentTarget);const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}
  const res=await fetch('/api/admin/create-member',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({first_name:f.get('first_name'),surname:f.get('surname'),email:f.get('email'),phone:f.get('phone'),role:f.get('role'),reason:f.get('reason')})});
  const body=await res.json();setBusy(false);if(!res.ok){setMsg(body.error||'Unable to create member.');return}setDone(body);setMsg('Member created, activated and recorded in the audit log.');e.currentTarget.reset();
 }
 if(busy)return <main className="onboarding"><div className="loadingBar"/></main>;
 if(!allowed)return <main className="onboarding"><div className="container" style={{paddingTop:40}}><div className="alert">Super Admin access is required.</div><Link className="btn" href="/admin">Back to administration</Link></div></main>;
 return <main className="onboarding"><div className="onboardTop"><div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Super Admin member creation</small></span></Link><Link className="btn" href="/admin">Back to administration</Link></div></div><div className="container" style={{paddingTop:28,paddingBottom:48,maxWidth:820}}><section className="card"><div className="cardHeader"><h3>Add a member directly</h3></div><p className="muted">This bypasses normal onboarding and approval. The member receives an email invitation, is activated immediately, and the Super Admin who performed the action is permanently recorded in the audit log.</p>{msg&&<div className={done?'alert success':'alert'}>{msg}</div>}<form className="formGrid" onSubmit={submit}><div className="two"><label className="label">First name<input className="field" name="first_name" required/></label><label className="label">Surname<input className="field" name="surname" required/></label></div><div className="two"><label className="label">Email<input className="field" name="email" type="email" required/></label><label className="label">Phone<input className="field" name="phone" inputMode="tel"/></label></div><label className="label">Role<select className="field" name="role" defaultValue="MEMBER"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super Admin</option></select></label><label className="label">Reason for bypass / role assignment<textarea className="field" name="reason" required placeholder="Example: Founding member approved directly by the board"/></label><button className="btn primary" disabled={busy}>Create, invite & activate</button></form>{done&&<div className="reviewBox" style={{marginTop:18}}>Account: {done.email}<br/>Status: {done.membership_status}<br/>Role: {done.role}<br/>Audit record: created</div>}</section></div></main>;
}
