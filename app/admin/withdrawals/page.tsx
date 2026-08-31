'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../../lib/supabase';

type Any=Record<string,any>;
const money=(k:any)=>`₦${(Number(k||0)/100).toLocaleString('en-NG',{maximumFractionDigits:2})}`;
const pretty=(v:any)=>String(v||'').replaceAll('_',' ');
function Status({v}:{v:any}){return <span className="status">{pretty(v||'pending')}</span>}

export default function AdminWithdrawals(){
 const router=useRouter();
 const[rows,setRows]=useState<any[]>([]);
 const[busy,setBusy]=useState(false);
 const[msg,setMsg]=useState('');

 async function session(){const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login?next=/admin/withdrawals');return null;}return session;}
 async function load(){setBusy(true);setMsg('');const s=await session();if(!s)return;const r=await supabase.rpc('admin_control_center_v4');setBusy(false);if(r.error){setMsg(friendlyError(r.error.message));return;}setRows(r.data?.withdrawals||[])}
 useEffect(()=>{void load()},[]);
 async function review(id:string,decision:'APPROVE'|'REJECT'){
  setBusy(true);setMsg('');const r=await supabase.rpc('approve_withdrawal',{p_withdrawal_id:id,p_decision:decision,p_comments:`${decision==='APPROVE'?'Approved':'Rejected'} through withdrawal operations`});setBusy(false);if(r.error){setMsg(friendlyError(r.error.message));return;}setMsg(`Withdrawal ${decision.toLowerCase()} action recorded.`);await load();
 }
 async function payout(id:string,otp?:string){
  const s=await session();if(!s)return;setBusy(true);setMsg('');
  const r=await fetch('/api/paystack/withdrawal-transfer',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.access_token}`},body:JSON.stringify({withdrawal_id:id,...(otp?{otp}: {})})});
  const body=await r.json().catch(()=>({}));setBusy(false);
  if(!r.ok){setMsg(body.error||'Unable to initiate bank payout.');return;}
  if(body.needs_otp){const value=window.prompt('Paystack requires a transfer OTP. Enter the OTP sent to the business owner:');if(value){await payout(id,value.trim());return;}setMsg('Transfer is waiting for Paystack OTP authorization.');await load();return;}
  setMsg(`Payout status: ${pretty(body.status||'processing')}. Reference: ${body.reference||'pending'}.`);await load();
 }

 return <main className="section">{busy&&<div className="loadingBar"/>}<div className="container stack">
  <div className="actions"><Link className="btn" href="/admin">← Admin control center</Link><Link className="btn" href="/admin/support">Support operations</Link></div>
  <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Maker-checker payout control</p><h1>Withdrawal operations</h1><p>Two different authorized reviewers must approve each request before a Paystack bank transfer can be initiated. Transfer success, failure and reversal are settled through signed Paystack events.</p></div></section>
  {msg&&<div className="alert">{msg}</div>}
  <section className="card"><div className="cardHeader"><h3>Withdrawal queue</h3><b>{rows.length} open items</b></div>{rows.map((w:any)=><div className="card" style={{boxShadow:'none',marginBottom:14}} key={w.id}><div className="cardHeader"><div><b>{w.first_name} {w.surname} · {money(w.amount_kobo)}</b><small className="muted" style={{display:'block'}}>{w.member_number||'member'} · fee {money(w.fee_kobo)} · approvals {w.approvals||0}/2</small></div><Status v={w.status}/></div><div className="factGrid"><div className="fact"><small>Beneficiary</small><b>{w.beneficiary_snapshot?.account_name||'—'}</b></div><div className="fact"><small>Bank</small><b>{w.beneficiary_snapshot?.bank_name||'—'}</b></div><div className="fact"><small>Account</small><b>{w.beneficiary_snapshot?.account_number||'—'}</b></div><div className="fact"><small>Bank verified</small><b>{w.beneficiary_snapshot?.bank_code?'Yes':'No'}</b></div></div><div className="actions" style={{marginTop:14}}>{['PENDING','FIRST_APPROVAL'].includes(String(w.status))&&<><button className="btn danger" disabled={busy} onClick={()=>void review(w.id,'REJECT')}>Reject</button><button className="btn primary" disabled={busy} onClick={()=>void review(w.id,'APPROVE')}>Approve</button></>}{w.status==='APPROVED'&&<button className="btn primary" disabled={busy||!w.beneficiary_snapshot?.bank_code} onClick={()=>void payout(w.id)}>Send Paystack bank payout</button>}{w.status==='PROCESSING'&&<button className="btn" disabled={busy} onClick={()=>void payout(w.id)}>Check / continue payout</button>}</div>{w.provider_reference&&<p className="muted">Provider reference: {w.provider_reference}</p>}</div>)}{!rows.length&&<div className="empty">No withdrawals currently require action.</div>}</section>
 </div></main>;
}
