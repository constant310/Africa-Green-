'use client';

import Link from 'next/link';
import {useEffect,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../lib/supabase';

type Any=Record<string,any>;
const money=(k:any)=>`₦${(Number(k||0)/100).toLocaleString('en-NG',{maximumFractionDigits:2})}`;
const pretty=(v:any)=>String(v||'').replaceAll('_',' ');
function Status({v}:{v:any}){return <span className="status">{pretty(v||'pending')}</span>}
function Card({title,children}:{title:string,children:ReactNode}){return <section className="card"><div className="cardHeader"><h3>{title}</h3></div>{children}</section>}
function Empty({text='No items currently need attention.'}:{text?:string}){return <div className="empty">{text}</div>}

export default function Admin(){
 const router=useRouter();
 const[data,setData]=useState<Any|null>(null);
 const[member,setMember]=useState<Any|null>(null);
 const[results,setResults]=useState<any[]>([]);
 const[audit,setAudit]=useState<any[]>([]);
 const[currentRoles,setCurrentRoles]=useState<string[]>([]);
 const[q,setQ]=useState('');
 const[auditQuery,setAuditQuery]=useState('');
 const[view,setView]=useState('overview');
 const[menu,setMenu]=useState(false);
 const[busy,setBusy]=useState(false);
 const[msg,setMsg]=useState('');
 const[reason,setReason]=useState('');

 const isSuper=currentRoles.includes('SUPER_ADMIN');
 const m=data?.metrics||{};const apps=data?.applications||[];const loans=data?.loans||[];const wd=data?.withdrawals||[];const tickets=data?.tickets||[];
 const nav=[['overview','Overview'],['membership','Membership'],['lending','Loans'],['withdrawals','Withdrawals'],['members','Member 360'],...(isSuper?[['governance','Governance']]:[]),['support','Support'],['audit','Audit log']];

 async function load(){
  setBusy(true);setMsg('');
  const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}
  const [center,roles,logs]=await Promise.all([
   supabase.rpc('admin_control_center_v4'),
   supabase.rpc('admin_current_roles_v4'),
   supabase.rpc('admin_audit_log_v4',{p_limit:200,p_query:null,p_actor:null,p_subject:null}),
  ]);
  setBusy(false);
  if(center.error){setMsg(friendlyError(center.error.message));return}
  setData(center.data);setCurrentRoles((roles.data||[]) as string[]);setAudit((logs.data||[]) as any[]);
 }
 useEffect(()=>{void load()},[]);

 async function rpc(name:string,args:Any={}){
  setBusy(true);setMsg('');const r=await supabase.rpc(name,args);setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return null}
  setMsg('Administrative action completed and recorded in the audit log.');await load();return r.data
 }
 async function search(){const r=await supabase.rpc('admin_search_members_v4',{p_query:q,p_limit:50});if(r.error)return setMsg(friendlyError(r.error.message));setResults(r.data||[])}
 async function open(id:string){setBusy(true);const r=await supabase.rpc('admin_member_360_v4',{p_user:id});setBusy(false);if(r.error)return setMsg(friendlyError(r.error.message));setMember(r.data)}
 async function searchAudit(){setBusy(true);const r=await supabase.rpc('admin_audit_log_v4',{p_limit:300,p_query:auditQuery||null,p_actor:null,p_subject:null});setBusy(false);if(r.error)return setMsg(friendlyError(r.error.message));setAudit(r.data||[])}
 async function governance(action:'activate'|'admin'|'super'|'member'){
  if(!member?.profile?.id)return;
  const why=reason.trim()||'Super Admin governance action';
  let out:any=null;
  if(action==='activate')out=await rpc('super_admin_activate_member_v4',{p_user:member.profile.id,p_reason:why});
  else out=await rpc('super_admin_assign_role_v4',{p_user:member.profile.id,p_role:action==='super'?'SUPER_ADMIN':action==='admin'?'ADMIN':'MEMBER',p_reason:why});
  if(out)await open(member.profile.id);
 }

 return <div className="appShell">{busy&&<div className="loadingBar"/>}
  <aside className={`sidebar ${menu?'open':''}`}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Administration</small></span></Link><nav className="sidebarNav">{nav.map(([k,l])=><button className={`navButton ${view===k?'active':''}`} key={k} onClick={()=>{setView(k);setMenu(false)}}>{l}</button>)}<Link className="navButton" href="/portal">Member view</Link></nav><div className="sidebarBottom"><button className="navButton" onClick={()=>void load()}>Refresh data</button><button className="navButton" onClick={async()=>{await supabase.auth.signOut();router.replace('/login')}}>Sign out</button></div></aside>
  {menu&&<button className="scrim" onClick={()=>setMenu(false)} aria-label="close menu"/>}
  <div className="workspace"><header className="topbar"><div style={{display:'flex',alignItems:'center',gap:12}}><button className="menuBtn" onClick={()=>setMenu(!menu)}>☰</button><div><p className="eyebrow" style={{margin:0}}>Control center</p><h1>{nav.find(x=>x[0]===view)?.[1]||'Administration'}</h1></div></div><div className="userChip"><b>{isSuper?'Super Admin':'Authorized administration'}</b><small>Every material action is auditable</small></div></header>
  <main className="appPage">{msg&&<div className="alert" style={{marginBottom:16}}>{msg}</div>}

  {view==='overview'&&<div className="stack"><section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Operations snapshot</p><h2>Run the cooperative from one accountable workspace.</h2><p>Member, admin and system actions are recorded with who performed them, what changed and when.</p></div><button className="btn" onClick={()=>void load()}>Refresh</button></section><div className="metrics"><div className="card metric"><small>Active members</small><strong>{m.members||0}</strong></div><div className="card metric"><small>Application queue</small><strong>{m.applicants||0}</strong></div><div className="card metric"><small>Active loan book</small><strong>{money(m.loan_book_kobo)}</strong></div><div className="card metric"><small>Pending withdrawals</small><strong>{m.pending_withdrawals||0}</strong></div></div><div className="grid2"><Card title="Work queues"><div className="factGrid"><div className="fact"><small>Membership reviews</small><b>{apps.length}</b></div><div className="fact"><small>Loan reviews</small><b>{loans.length}</b></div><div className="fact"><small>Withdrawals</small><b>{wd.length}</b></div><div className="fact"><small>Support tickets</small><b>{tickets.length}</b></div></div></Card><Card title="Accountability controls"><p className="muted">Membership approvals, Super Admin bypass activations, role grants, withdrawals, loans, wallet-linked journal events, policy changes and other core records now generate audit events. Sensitive credential fields are redacted from the audit payload.</p></Card></div></div>}

  {view==='membership'&&<Card title="Membership review queue">{apps.map((a:any)=><div className="list" key={a.id}><div><b>{a.first_name} {a.surname}</b><small>{a.email} · {a.phone||'no phone'} · approvals {a.approvals||0}/2</small></div><div className="actions"><Status v={a.status}/><button className="btn danger" onClick={()=>void rpc('approve_membership_application',{p_application_id:a.id,p_decision:'REJECT',p_comments:'Rejected through V4 admin review',p_corrections:null})}>Reject</button><button className="btn" onClick={()=>void rpc('approve_membership_application',{p_application_id:a.id,p_decision:'CORRECTION_REQUIRED',p_comments:'Please review the application information and resubmit.',p_corrections:{general:true}})}>Correction</button><button className="btn primary" onClick={()=>void rpc('approve_membership_application',{p_application_id:a.id,p_decision:'APPROVE',p_comments:'Approved through V4 admin review',p_corrections:null})}>Approve</button></div></div>)}{!apps.length&&<Empty/>}</Card>}

  {view==='lending'&&<Card title="Loan review queue">{loans.map((l:any)=><div className="list" key={l.id}><div><b>{l.first_name} {l.surname} · {money(l.principal_kobo)}</b><small>{l.tenure_months} months · approvals {l.approvals||0}/2 · member {l.member_number||'pending'}</small></div><div className="actions"><Status v={l.status}/><button className="btn danger" onClick={()=>void rpc('approve_loan',{p_loan_id:l.id,p_decision:'REJECT',p_comments:'Rejected through V4 credit review'})}>Reject</button><button className="btn primary" onClick={()=>void rpc('approve_loan',{p_loan_id:l.id,p_decision:'APPROVE',p_comments:'Approved through V4 credit review'})}>Approve</button></div></div>)}{!loans.length&&<Empty/>}</Card>}

  {view==='withdrawals'&&<Card title="Withdrawal review queue">{wd.map((w:any)=><div className="list" key={w.id}><div><b>{w.first_name} {w.surname} · {money(w.amount_kobo)}</b><small>Fee {money(w.fee_kobo)} · approvals {w.approvals||0}/2 · {w.member_number||'member'}</small></div><div className="actions"><Status v={w.status}/><button className="btn danger" onClick={()=>void rpc('approve_withdrawal',{p_withdrawal_id:w.id,p_decision:'REJECT',p_comments:'Rejected through V4 withdrawal review'})}>Reject</button><button className="btn primary" onClick={()=>void rpc('approve_withdrawal',{p_withdrawal_id:w.id,p_decision:'APPROVE',p_comments:'Approved through V4 withdrawal review'})}>Approve</button></div></div>)}{!wd.length&&<Empty/>}</Card>}

  {view==='members'&&<div className="stack"><Card title="Search members and applicants"><div className="inline"><input className="field" placeholder="Name, email, phone or member number" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void search()}/><button className="btn primary" onClick={()=>void search()}>Search</button></div>{results.map((r:any)=><button className="list" style={{width:'100%',background:'transparent',borderLeft:0,borderRight:0,borderBottom:0}} key={r.id} onClick={()=>void open(r.id)}><div style={{textAlign:'left'}}><b>{r.first_name} {r.surname}</b><small>{r.member_number||r.email}</small></div><Status v={r.membership_status}/></button>)}</Card>{member&&<><div className="metrics"><div className="card metric"><small>Wallet</small><strong>{money(member.balances?.wallet_available_kobo)}</strong></div><div className="card metric"><small>Savings</small><strong>{money(member.balances?.savings_kobo)}</strong></div><div className="card metric"><small>Shares</small><strong>{money(member.balances?.share_capital_kobo)}</strong></div><div className="card metric"><small>Loan exposure</small><strong>{money(member.balances?.loan_receivable_kobo)}</strong></div></div><Card title="Member profile"><div className="factGrid"><div className="fact"><small>Name</small><b>{member.profile?.first_name} {member.profile?.surname}</b></div><div className="fact"><small>Member number</small><b>{member.profile?.member_number||'Pending'}</b></div><div className="fact"><small>Email</small><b>{member.profile?.email}</b></div><div className="fact"><small>Status</small><Status v={member.profile?.membership_status}/></div></div><form className="inline" style={{marginTop:18}} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await rpc('admin_add_note_v4',{p_member:member.profile.id,p_note:f.get('note')});await open(member.profile.id)}}><input className="field" name="note" required placeholder="Internal administration note"/><button className="btn">Add note</button></form></Card><Card title="Member account activity">{(member.audit||[]).map((a:any)=><div className="list" key={a.id}><div><b>{pretty(a.action)}</b><small>{new Date(a.created_at).toLocaleString()} · by {a.actor_first_name||a.actor_email||a.actor_type||'System'} {a.actor_surname||''} ({pretty(a.actor_role||a.actor_type)})</small><small>{a.reason||`${a.operation||'ACTION'} on ${pretty(a.entity_type)}`}</small></div></div>)}{!(member.audit||[]).length&&<Empty text="No recorded activity yet."/>}</Card></>}</div>}

  {view==='governance'&&isSuper&&<div className="stack"><Card title="Super Admin governance"><p className="muted">Search for an existing account, select it, then activate the member directly or assign an administrative role. Every action requires a reason and is permanently attributed to the Super Admin who performed it.</p><div className="inline"><input className="field" placeholder="Search account by name, email, phone or member number" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void search()}/><button className="btn primary" onClick={()=>void search()}>Search</button></div>{results.map((r:any)=><button className="list" style={{width:'100%',background:'transparent'}} key={r.id} onClick={()=>void open(r.id)}><div style={{textAlign:'left'}}><b>{r.first_name} {r.surname}</b><small>{r.email} · {pretty(r.application_role)}</small></div><Status v={r.membership_status}/></button>)}</Card>{member&&<Card title={`Governance actions — ${member.profile?.first_name||''} ${member.profile?.surname||''}`}><div className="factGrid"><div className="fact"><small>Email</small><b>{member.profile?.email}</b></div><div className="fact"><small>Membership</small><b>{pretty(member.profile?.membership_status)}</b></div><div className="fact"><small>Primary role</small><b>{pretty(member.profile?.application_role)}</b></div><div className="fact"><small>Active roles</small><b>{(member.roles||[]).map((r:any)=>pretty(r.role)).join(', ')||'None'}</b></div></div><label className="label" style={{marginTop:16}}>Reason for action<input className="field" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required for the record, e.g. Founding member approved by board"/></label><div className="actions"><button className="btn primary" disabled={!reason.trim()} onClick={()=>void governance('activate')}>Bypass process & activate member</button><button className="btn" disabled={!reason.trim()} onClick={()=>void governance('admin')}>Make Admin</button><button className="btn" disabled={!reason.trim()} onClick={()=>void governance('super')}>Make Super Admin</button><button className="btn" disabled={!reason.trim()} onClick={()=>void governance('member')}>Assign Member role</button></div><p className="muted">The normal two-reviewer process remains the default. “Bypass process” is a deliberate Super Admin exception and is visibly labelled as such in the audit log.</p></Card>}</div>}

  {view==='support'&&<Card title="Member support queue">{tickets.map((t:any)=><div className="list" key={t.id}><div><b>{t.first_name} {t.surname} · {t.subject}</b><small>{t.category} · {t.message}</small></div><Status v={t.status}/></div>)}{!tickets.length&&<Empty/>}</Card>}

  {view==='audit'&&<div className="stack"><Card title="Cooperative-wide audit log"><div className="inline"><input className="field" placeholder="Search action, person, email, reason or record type" value={auditQuery} onChange={e=>setAuditQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void searchAudit()}/><button className="btn primary" onClick={()=>void searchAudit()}>Search audit</button><button className="btn" onClick={async()=>{setAuditQuery('');await load()}}>Reset</button></div><p className="muted">This record identifies the actor, their role at the time of the action, the affected member where applicable, the record changed and the timestamp.</p><div className="tableWrap"><table className="table"><thead><tr><th>Time</th><th>Performed by</th><th>Action</th><th>Affected member</th><th>Record</th><th>Reason</th></tr></thead><tbody>{audit.map((a:any)=><tr key={a.id}><td>{new Date(a.created_at).toLocaleString()}</td><td><b>{a.actor_first_name||a.actor_email||a.actor_type||'System'} {a.actor_surname||''}</b><br/><small>{pretty(a.actor_role||a.actor_type)}</small></td><td>{pretty(a.action)}</td><td>{a.subject_email?<><b>{a.subject_first_name} {a.subject_surname}</b><br/><small>{a.subject_email}</small></>:'—'}</td><td>{pretty(a.entity_type)} {a.entity_id||''}</td><td>{a.reason||pretty(a.operation)||'—'}</td></tr>)}</tbody></table>{!audit.length&&<Empty text="No matching audit events."/>}</div></Card></div>}

  </main></div>{msg&&<div className="toast">{msg}</div>}</div>
}
