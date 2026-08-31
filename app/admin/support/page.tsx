'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../../lib/supabase';

type Any=Record<string,any>;
const pretty=(v:any)=>String(v||'').replaceAll('_',' ');
function Status({v}:{v:any}){return <span className="status">{pretty(v||'pending')}</span>}

export default function AdminSupport(){
 const router=useRouter();
 const[tickets,setTickets]=useState<any[]>([]);
 const[responses,setResponses]=useState<Record<string,string>>({});
 const[statuses,setStatuses]=useState<Record<string,string>>({});
 const[priorities,setPriorities]=useState<Record<string,string>>({});
 const[busy,setBusy]=useState(false);
 const[msg,setMsg]=useState('');

 async function load(){setBusy(true);setMsg('');const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login?next=/admin/support');return;}const r=await supabase.rpc('admin_control_center_v4');setBusy(false);if(r.error){setMsg(friendlyError(r.error.message));return;}const rows=r.data?.tickets||[];setTickets(rows);setStatuses(Object.fromEntries(rows.map((t:any)=>[t.id,t.status||'OPEN'])));setPriorities(Object.fromEntries(rows.map((t:any)=>[t.id,t.priority||'NORMAL'])));setResponses(Object.fromEntries(rows.map((t:any)=>[t.id,t.admin_response||''])))}
 useEffect(()=>{void load()},[]);
 async function save(t:Any){
  const response=String(responses[t.id]||'').trim();const status=statuses[t.id]||t.status||'OPEN';const priority=priorities[t.id]||t.priority||'NORMAL';
  setBusy(true);setMsg('');const r=await supabase.rpc('admin_update_support_ticket_v4',{p_ticket_id:t.id,p_status:status,p_response:response||null,p_priority:priority});setBusy(false);if(r.error){setMsg(friendlyError(r.error.message));return;}setMsg('Support ticket updated successfully and added to the audit trail.');await load();
 }

 return <main className="section">{busy&&<div className="loadingBar"/>}<div className="container stack">
  <div className="actions"><Link className="btn" href="/admin">← Admin control center</Link><Link className="btn" href="/admin/withdrawals">Withdrawal operations</Link></div>
  <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Member service operations</p><h1>Support queue</h1><p>Assign priority, respond to the member, move tickets through the support lifecycle and keep every administrative action auditable.</p></div></section>
  {msg&&<div className="alert">{msg}</div>}
  <section className="card"><div className="cardHeader"><h3>Open and in-progress tickets</h3><b>{tickets.length}</b></div>{tickets.map((t:any)=><div className="card" style={{boxShadow:'none',marginBottom:14}} key={t.id}><div className="cardHeader"><div><b>{t.first_name} {t.surname} · {t.subject}</b><small className="muted" style={{display:'block'}}>{t.member_number||'member'} · {t.category} · {t.created_at?new Date(t.created_at).toLocaleString():'—'}</small></div><Status v={t.status}/></div><div className="reviewBox">{t.message}</div><div className="two" style={{marginTop:14}}><label className="label">Status<select className="field" value={statuses[t.id]||'OPEN'} onChange={e=>setStatuses(x=>({...x,[t.id]:e.target.value}))}><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select></label><label className="label">Priority<select className="field" value={priorities[t.id]||'NORMAL'} onChange={e=>setPriorities(x=>({...x,[t.id]:e.target.value}))}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></label></div><label className="label" style={{marginTop:12}}>Response to member<textarea className="field" value={responses[t.id]||''} onChange={e=>setResponses(x=>({...x,[t.id]:e.target.value}))} placeholder="Write the response that the member should see in their support history."/></label><div className="actions"><button className="btn primary" disabled={busy} onClick={()=>void save(t)}>Save response & status</button></div></div>)}{!tickets.length&&<div className="empty">No support tickets currently need attention.</div>}</section>
 </div></main>;
}
