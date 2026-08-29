'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../lib/supabase';

type Any=Record<string,any>;
const pretty=(v:any)=>String(v||'').replaceAll('_',' ');

export default function ActivityPage(){
 const router=useRouter();
 const[rows,setRows]=useState<Any[]>([]);
 const[busy,setBusy]=useState(true);
 const[msg,setMsg]=useState('');
 async function load(){
  setBusy(true);setMsg('');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){router.replace('/login');return;}
  const r=await supabase.rpc('member_activity_log_v4',{p_limit:200});
  setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setRows(r.data||[]);
 }
 useEffect(()=>{void load()},[]);
 return <main className="onboarding">
  {busy&&<div className="loadingBar"/>}
  <div className="onboardTop"><div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Account activity</small></span></Link><Link className="btn" href="/portal">Back to member portal</Link></div></div>
  <div className="container" style={{paddingTop:28,paddingBottom:48}}>
   <section className="welcome" style={{marginBottom:20}}><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Account record</p><h2>Your activity log</h2><p>See actions carried out on your cooperative account by you, an administrator, a Super Admin or the system.</p></div><button className="btn" onClick={()=>void load()}>Refresh</button></section>
   {msg&&<div className="alert" style={{marginBottom:16}}>{msg}</div>}
   <section className="card"><div className="cardHeader"><h3>Recorded account activity</h3></div><div className="tableWrap"><table className="table"><thead><tr><th>Time</th><th>Action</th><th>Performed by</th><th>Record</th><th>Reason / details</th></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td>{new Date(a.created_at).toLocaleString()}</td><td><b>{pretty(a.action)}</b></td><td>{a.performed_by==='YOU'?<b>You</b>:<><b>{a.actor_email||pretty(a.actor_type)||'System'}</b><br/><small>{pretty(a.actor_role||a.actor_type)}</small></>}</td><td>{pretty(a.entity_type)} {a.entity_id||''}</td><td>{a.reason||pretty(a.operation)||'—'}</td></tr>)}</tbody></table>{!rows.length&&!busy&&<div className="empty">No activity has been recorded on this account yet.</div>}</div></section>
  </div>
 </main>;
}
