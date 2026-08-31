'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../lib/supabase';

type Any=Record<string,any>;
const money=(k:any)=>`₦${(Number(k||0)/100).toLocaleString('en-NG',{maximumFractionDigits:2})}`;
const pretty=(v:any)=>String(v||'').replaceAll('_',' ');
function Status({v}:{v:any}){return <span className="status">{pretty(v||'pending')}</span>}

export default function WithdrawalsPage(){
 const router=useRouter();
 const[snap,setSnap]=useState<Any|null>(null);
 const[banks,setBanks]=useState<Array<{name:string,code:string}>>([]);
 const[bankCode,setBankCode]=useState('');
 const[accountNumber,setAccountNumber]=useState('');
 const[resolvedName,setResolvedName]=useState('');
 const[amount,setAmount]=useState('');
 const[pin,setPin]=useState('');
 const[busy,setBusy]=useState(false);
 const[msg,setMsg]=useState('');

 async function auth(){const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login?next=/withdrawals');return null;}return session;}
 async function load(){
  setBusy(true);setMsg('');const session=await auth();if(!session)return;
  const [s,b]=await Promise.all([
   supabase.rpc('member_portal_snapshot_v4'),
   fetch('/api/paystack/banks',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'}).then(async r=>({ok:r.ok,body:await r.json().catch(()=>({}))})),
  ]);
  setBusy(false);
  if(s.error){setMsg(friendlyError(s.error.message));return;}
  setSnap(s.data||{});
  if(b.ok)setBanks(Array.isArray(b.body?.banks)?b.body.banks:[]);
 }
 useEffect(()=>{void load()},[]);

 const active=snap?.profile?.membership_status==='ACTIVE';
 const beneficiaries:any[]=snap?.beneficiaries||[];
 const selected=beneficiaries.find((b:any)=>b.is_default)||beneficiaries[0];
 const withdrawals:any[]=snap?.withdrawals||[];
 const wallet=Number(snap?.balances?.wallet_available_kobo||0);

 async function resolveAccount(){
  const session=await auth();if(!session)return;
  if(!bankCode||accountNumber.replace(/\D/g,'').length!==10){setMsg('Select a bank and enter a valid 10-digit account number.');return;}
  setBusy(true);setMsg('');setResolvedName('');
  const r=await fetch('/api/paystack/resolve-account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({bank_code:bankCode,account_number:accountNumber})});
  const body=await r.json().catch(()=>({}));setBusy(false);
  if(!r.ok){setMsg(body.error||'Account verification failed.');return;}
  setAccountNumber(body.account_number);setResolvedName(body.account_name);setMsg('Bank account verified successfully.');
 }
 async function saveBeneficiary(){
  if(!resolvedName||!bankCode){setMsg('Verify the bank account before saving it.');return;}
  const bank=banks.find(b=>b.code===bankCode);if(!bank){setMsg('Select a valid bank.');return;}
  setBusy(true);setMsg('');
  const r=await supabase.rpc('save_beneficiary_v4',{p_bank_name:bank.name,p_bank_code:bank.code,p_account_number:accountNumber,p_account_name:resolvedName,p_default:true});
  setBusy(false);if(r.error){setMsg(friendlyError(r.error.message));return;}
  setMsg('Verified beneficiary saved successfully.');await load();
 }
 async function requestWithdrawal(){
  if(!selected){setMsg('Save a verified beneficiary first.');return;}
  if(!selected.bank_code){setMsg('Your existing beneficiary was not bank-verified. Verify and save the account again before requesting a payout.');return;}
  const n=Number(amount);if(!Number.isFinite(n)||n<=0||pin.length!==4){setMsg('Enter a withdrawal amount and your 4-digit transaction PIN.');return;}
  setBusy(true);setMsg('');
  const r=await supabase.rpc('request_withdrawal',{p_amount_kobo:Math.round(n*100),p_pin:pin,p_beneficiary:selected});
  setBusy(false);if(r.error){setMsg(friendlyError(r.error.message));return;}
  setAmount('');setPin('');setMsg(`Withdrawal request submitted successfully. Fee: ${money(r.data?.fee_kobo)}. Two independent approvals are required before Paystack payout.`);await load();
 }

 return <main className="section">{busy&&<div className="loadingBar"/>}<div className="container stack">
  <div className="actions"><Link className="btn" href="/portal">← Member portal</Link></div>
  <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Secure payout workspace</p><h1>Bank beneficiaries & withdrawals</h1><p>Verify account details with Paystack before saving them, then request a withdrawal protected by your transaction PIN and two-person approval.</p></div><Status v={snap?.profile?.membership_status}/></section>
  {msg&&<div className={msg.toLowerCase().includes('success')?'alert success':'alert'}>{msg}</div>}
  <div className="metrics"><div className="card metric"><small>Available wallet</small><strong>{money(wallet)}</strong></div><div className="card metric"><small>Pending/processing</small><strong>{withdrawals.filter(w=>['PENDING','FIRST_APPROVAL','APPROVED','PROCESSING'].includes(String(w.status))).length}</strong></div><div className="card metric"><small>Completed</small><strong>{withdrawals.filter(w=>w.status==='COMPLETED').length}</strong></div><div className="card metric"><small>Membership</small><strong style={{fontSize:'1.2rem'}}>{pretty(snap?.profile?.membership_status)}</strong></div></div>

  <div className="grid2"><section className="card"><div className="cardHeader"><h3>Default beneficiary</h3></div>{selected?<><div className="balance" style={{fontSize:30}}>{selected.account_number}</div><p><b>{selected.account_name}</b><br/>{selected.bank_name}</p>{selected.bank_code?<div className="alert success">Paystack bank code saved: {selected.bank_code}</div>:<div className="alert">This older beneficiary has not been Paystack-verified. Verify the account again before payout.</div>}</>:<div className="empty">No beneficiary saved yet.</div>}</section>
  <section className="card"><div className="cardHeader"><h3>Verify and save bank account</h3></div><div className="formGrid"><label className="label">Bank<select className="field" value={bankCode} onChange={e=>{setBankCode(e.target.value);setResolvedName('')}}><option value="">Select bank</option>{banks.map(b=><option key={b.code} value={b.code}>{b.name}</option>)}</select></label><label className="label">10-digit account number<input className="field" inputMode="numeric" maxLength={10} value={accountNumber} onChange={e=>{setAccountNumber(e.target.value.replace(/\D/g,'').slice(0,10));setResolvedName('')}}/></label><div className="actions"><button className="btn" onClick={()=>void resolveAccount()} disabled={busy}>Verify account</button></div>{resolvedName&&<div className="alert success"><b>{resolvedName}</b><br/>{accountNumber}</div>}<button className="btn primary" disabled={!resolvedName||busy} onClick={()=>void saveBeneficiary()}>Save verified beneficiary</button></div></section></div>

  <section className="card"><div className="cardHeader"><h3>Request withdrawal</h3></div><p className="muted">The requested amount plus the configured transfer fee is reserved immediately. It cannot be spent while the withdrawal is awaiting review. After two independent approvals, an authorized administrator can initiate the Paystack bank transfer.</p>{selected?<div className="two"><label className="label">Amount (₦)<input className="field" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="label">Transaction PIN<input className="field" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,4))}/></label><button className="btn primary" disabled={!active||busy||!selected.bank_code} onClick={()=>void requestWithdrawal()}>Submit withdrawal request</button></div>:<div className="empty">Save a verified beneficiary before requesting a withdrawal.</div>}</section>

  <section className="card"><div className="cardHeader"><h3>Withdrawal history</h3></div><div className="tableWrap"><table className="table"><thead><tr><th>Date</th><th>Amount</th><th>Fee</th><th>Beneficiary</th><th>Status</th><th>Provider reference</th></tr></thead><tbody>{withdrawals.map((w:any)=><tr key={w.id}><td>{w.requested_at?new Date(w.requested_at).toLocaleString():'—'}</td><td><b>{money(w.amount_kobo)}</b></td><td>{money(w.fee_kobo)}</td><td>{w.beneficiary_snapshot?.account_name||'—'}<br/><small>{w.beneficiary_snapshot?.bank_name||''} {w.beneficiary_snapshot?.account_number||''}</small></td><td><Status v={w.status}/>{w.failure_reason&&<small style={{display:'block'}}>{w.failure_reason}</small>}</td><td>{w.provider_reference||'—'}</td></tr>)}</tbody></table>{!withdrawals.length&&<div className="empty">No withdrawal requests yet.</div>}</div></section>
 </div></main>;
}
