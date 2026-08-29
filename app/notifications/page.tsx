'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../lib/supabase';

type Row={id:number;title:string;body:string;category:string;action?:string;entity_type?:string;entity_id?:string;read_at?:string|null;created_at:string};
const pretty=(v:any)=>String(v||'').replaceAll('_',' ').toLowerCase();

export default function NotificationsPage(){
 const router=useRouter();
 const[rows,setRows]=useState<Row[]>([]);
 const[busy,setBusy]=useState(true);
 const[msg,setMsg]=useState('');
 async function load(){
  setBusy(true);setMsg('');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){router.replace('/login');return;}
  const r=await supabase.rpc('member_notifications_v4',{p_limit:200});
  setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setRows((r.data||[]) as Row[]);
 }
 useEffect(()=>{void load()},[]);
 async function read(id:number){
  const r=await supabase.rpc('mark_notification_read_v4',{p_notification_id:id});
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setRows(x=>x.map(n=>n.id===id?{...n,read_at:n.read_at||new Date().toISOString()}:n));
 }
 async function readAll(){
  const r=await supabase.rpc('mark_all_notifications_read_v4');
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  const now=new Date().toISOString();setRows(x=>x.map(n=>({...n,read_at:n.read_at||now})));setMsg('All notifications marked as read.');
 }
 const unread=rows.filter(x=>!x.read_at).length;
 return <main className="onboarding">{busy&&<div className="loadingBar"/>}
  <div className="onboardTop"><div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Notifications</small></span></Link><div className="actions"><Link className="btn" href="/portal">Member portal</Link><Link className="btn" href="/activity">Activity</Link></div></div></div>
  <div className="container stack" style={{paddingTop:28,paddingBottom:48}}>
   <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Member inbox</p><h2>Notifications</h2><p>Important membership, wallet, loan, withdrawal and account changes appear here automatically from the cooperative audit trail.</p></div><span className="status">{unread} unread</span></section>
   {msg&&<div className="alert">{msg}</div>}
   <div className="actions" style={{justifyContent:'space-between'}}><button className="btn" onClick={()=>void load()} disabled={busy}>{busy?'Refreshing…':'Refresh'}</button><button className="btn primary" onClick={()=>void readAll()} disabled={!unread}>Mark all as read</button></div>
   <section className="card"><div className="cardHeader"><h3>Recent notices</h3></div>
    {rows.map(n=><button key={n.id} onClick={()=>!n.read_at&&void read(n.id)} className="list" style={{width:'100%',textAlign:'left',background:n.read_at?'transparent':'rgba(23,107,67,.06)',cursor:n.read_at?'default':'pointer'}}>
     <div><b>{n.title}</b><small>{n.body}</small><small>{new Date(n.created_at).toLocaleString()} · {pretty(n.category)}{n.entity_type?` · ${pretty(n.entity_type)}`:''}</small></div><span className="status">{n.read_at?'Read':'New'}</span>
    </button>)}
    {!rows.length&&!busy&&<div className="empty">You have no notifications yet. Important account decisions will appear here.</div>}
   </section>
  </div>
 </main>;
}
