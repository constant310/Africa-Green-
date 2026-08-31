'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../lib/supabase';

type Any=Record<string,any>;
const money=(k:any)=>`₦${(Number(k||0)/100).toLocaleString('en-NG',{maximumFractionDigits:2})}`;
const pretty=(v:any)=>String(v||'').replaceAll('_',' ');
function Status({v}:{v:any}){return <span className="status">{pretty(v||'pending')}</span>}

export default function LoansPage(){
 const router=useRouter();
 const[snap,setSnap]=useState<Any|null>(null);
 const[details,setDetails]=useState<Any>({installments:[],repayments:[],guarantors_requested:[]});
 const[busy,setBusy]=useState(false);
 const[msg,setMsg]=useState('');
 const[principal,setPrincipal]=useState('');
 const[tenure,setTenure]=useState('6');
 const[guarantors,setGuarantors]=useState<Array<{query:string,member_number:string,name:string,pledge:string,results:any[]}>>([
  {query:'',member_number:'',name:'',pledge:'',results:[]},
  {query:'',member_number:'',name:'',pledge:'',results:[]},
 ]);
 const[repayAmounts,setRepayAmounts]=useState<Record<string,string>>({});
 const[repayPins,setRepayPins]=useState<Record<string,string>>({});

 async function load(){
  setBusy(true);setMsg('');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){router.replace('/login?next=/loans');return;}
  const [s,d]=await Promise.all([supabase.rpc('member_portal_snapshot_v4'),supabase.rpc('member_loan_details_v4')]);
  setBusy(false);
  if(s.error){setMsg(friendlyError(s.error.message));return;}
  setSnap(s.data||{});
  if(!d.error)setDetails(d.data||{installments:[],repayments:[],guarantors_requested:[]});
 }
 useEffect(()=>{void load()},[]);

 const active=snap?.profile?.membership_status==='ACTIVE';
 const loans:any[]=snap?.loans||[];
 const incoming:any[]=snap?.guarantees||[];
 const installments:any[]=details?.installments||[];
 const repayments:any[]=details?.repayments||[];
 const outgoing:any[]=details?.guarantors_requested||[];
 const wallet=Number(snap?.balances?.wallet_available_kobo||0);
 const security=Number(snap?.balances?.savings_kobo||0)+Number(snap?.balances?.share_capital_kobo||0);

 const outstandingByLoan=useMemo(()=>{
  const m:Record<string,number>={};
  for(const i of installments)m[i.loan_id]=(m[i.loan_id]||0)+Number(i.outstanding_kobo||0);
  return m;
 },[installments]);

 async function searchGuarantor(index:number){
  const q=guarantors[index].query.trim();
  if(q.length<3){setMsg('Enter at least 3 characters of the member name or member number.');return;}
  setBusy(true);setMsg('');
  const r=await supabase.rpc('member_search_guarantors_v4',{p_query:q,p_limit:10});
  setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setGuarantors(g=>g.map((x,i)=>i===index?{...x,results:r.data||[]}:x));
 }
 function chooseGuarantor(index:number,row:any){
  setGuarantors(g=>g.map((x,i)=>i===index?{...x,member_number:row.member_number,name:`${row.first_name||''} ${row.surname||''}`.trim(),query:row.member_number,results:[]}:x));
 }
 async function applyLoan(){
  const p=Number(principal);const months=Number(tenure);
  if(!Number.isFinite(p)||p<=0||!Number.isInteger(months)||months<1||months>120){setMsg('Enter a valid loan amount and tenure.');return;}
  const selected=guarantors.filter(g=>g.member_number||g.pledge);
  for(const g of selected){if(!g.member_number||!Number(g.pledge)||Number(g.pledge)<=0){setMsg('Each selected guarantor needs a member and a positive pledge amount.');return;}}
  if(new Set(selected.map(g=>g.member_number)).size!==selected.length){setMsg('Select two different guarantors.');return;}
  setBusy(true);setMsg('');
  const r=await supabase.rpc('create_loan_application',{p_principal_kobo:Math.round(p*100),p_tenure_months:months,p_guarantors:selected.map(g=>({member_number:g.member_number,pledged_amount_kobo:Math.round(Number(g.pledge)*100)}))});
  setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setMsg(`Loan application submitted successfully. Estimated monthly payment: ${money(r.data?.monthly_payment_kobo)}.`);
  setPrincipal('');setGuarantors([{query:'',member_number:'',name:'',pledge:'',results:[]},{query:'',member_number:'',name:'',pledge:'',results:[]}]);
  await load();
 }
 async function repay(loanId:string){
  const naira=Number(repayAmounts[loanId]);const pin=String(repayPins[loanId]||'');
  if(!Number.isFinite(naira)||naira<=0||pin.length!==4){setMsg('Enter a repayment amount and your 4-digit transaction PIN.');return;}
  setBusy(true);setMsg('');
  const r=await supabase.rpc('repay_loan_from_wallet',{p_loan_id:loanId,p_amount_kobo:Math.round(naira*100),p_pin:pin});
  setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}
  setMsg(`Repayment posted successfully: ${money(Math.round(naira*100))}.`);
  setRepayAmounts(x=>({...x,[loanId]:''}));setRepayPins(x=>({...x,[loanId]:''}));
  await load();
 }
 async function respond(id:string,accept:boolean){
  setBusy(true);setMsg('');const r=await supabase.rpc('respond_to_guarantee',{p_request_id:id,p_accept:accept});setBusy(false);
  if(r.error){setMsg(friendlyError(r.error.message));return;}setMsg(accept?'Guarantee accepted successfully.':'Guarantee declined.');await load();
 }

 return <main className="section">{busy&&<div className="loadingBar"/>}<div className="container stack">
  <div className="actions" style={{justifyContent:'space-between'}}><Link className="btn" href="/portal">← Member portal</Link><Link className="btn" href="/loan-calculator">Loan calculator</Link></div>
  <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Member credit workspace</p><h1>Loans, guarantors & repayments</h1><p>Apply with guarantor pledges where needed, track repayment schedules, and repay directly from your available wallet.</p></div><Status v={snap?.profile?.membership_status}/></section>
  {msg&&<div className={msg.toLowerCase().includes('success')?'alert success':'alert'}>{msg}</div>}
  {!active&&<div className="alert">Loan applications are available after membership activation.</div>}

  <div className="metrics"><div className="card metric"><small>Available wallet</small><strong>{money(wallet)}</strong></div><div className="card metric"><small>Savings + shares</small><strong>{money(security)}</strong></div><div className="card metric"><small>Open loans</small><strong>{loans.filter(l=>!['SETTLED','REJECTED','CANCELLED'].includes(String(l.status))).length}</strong></div><div className="card metric"><small>Outstanding</small><strong>{money(Object.values(outstandingByLoan).reduce((a,b)=>a+b,0))}</strong></div></div>

  <section className="card"><div className="cardHeader"><div><p className="eyebrow">New application</p><h3>Apply for a loan</h3></div></div><p className="muted">The backend enforces the current qualifying savings history, security ratio and maximum of two guarantors. A guarantor is optional only when your own eligible security covers the contractual exposure.</p>
   <div className="two"><label className="label">Principal (₦)<input className="field" inputMode="decimal" value={principal} onChange={e=>setPrincipal(e.target.value)}/></label><label className="label">Tenure (months)<input className="field" type="number" min={1} max={120} value={tenure} onChange={e=>setTenure(e.target.value)}/></label></div>
   <div className="grid2" style={{marginTop:16}}>{guarantors.map((g,index)=><div className="card" style={{boxShadow:'none'}} key={index}><div className="cardHeader"><h3>Guarantor {index+1} <small className="muted">optional</small></h3></div><div className="inline"><input className="field" placeholder="Member number or name" value={g.query} onChange={e=>setGuarantors(x=>x.map((v,i)=>i===index?{...v,query:e.target.value,member_number:'',name:'',results:[]}:v))}/><button className="btn" type="button" onClick={()=>void searchGuarantor(index)}>Search</button></div>{g.results.map((r:any)=><button type="button" className="list" style={{width:'100%',background:'transparent'}} key={r.id} onClick={()=>chooseGuarantor(index,r)}><div style={{textAlign:'left'}}><b>{r.first_name} {r.surname}</b><small>{r.member_number}</small></div><span>Choose</span></button>)}{g.member_number&&<div className="alert success">Selected: <b>{g.name}</b> · {g.member_number}</div>}<label className="label">Pledge amount (₦)<input className="field" inputMode="decimal" value={g.pledge} onChange={e=>setGuarantors(x=>x.map((v,i)=>i===index?{...v,pledge:e.target.value}:v))}/></label></div>)}</div>
   <div className="actions" style={{marginTop:16}}><button className="btn primary" disabled={!active||busy} onClick={()=>void applyLoan()}>Submit loan application</button></div>
  </section>

  <section className="card"><div className="cardHeader"><h3>Your loans & repayment schedules</h3></div>{loans.map((l:any)=>{const rows=installments.filter((i:any)=>i.loan_id===l.id);const reps=repayments.filter((r:any)=>r.loan_id===l.id);const outstanding=outstandingByLoan[l.id]||0;const repayable=['ACTIVE','PAST_DUE','DEFAULTED'].includes(String(l.status));return <div className="card" style={{boxShadow:'none',marginBottom:16}} key={l.id}><div className="cardHeader"><div><b>{money(l.principal_kobo)} · {l.tenure_months} months</b><small className="muted" style={{display:'block'}}>Applied {l.created_at?new Date(l.created_at).toLocaleDateString():'—'} · {Number(l.monthly_interest_bps||0)/100}% monthly</small></div><Status v={l.status}/></div><div className="factGrid"><div className="fact"><small>Contractual exposure</small><b>{money(l.total_contractual_exposure_kobo)}</b></div><div className="fact"><small>Outstanding schedule</small><b>{money(outstanding)}</b></div><div className="fact"><small>Installments</small><b>{rows.length||'Pending disbursement'}</b></div><div className="fact"><small>Repayments posted</small><b>{reps.length}</b></div></div>{rows.length>0&&<div className="tableWrap" style={{marginTop:14}}><table className="table"><thead><tr><th>#</th><th>Due</th><th>Principal</th><th>Interest</th><th>Penalty</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{rows.map((i:any)=><tr key={i.id}><td>{i.installment_number}</td><td>{i.due_date}</td><td>{money(i.principal_due_kobo)}</td><td>{money(i.interest_due_kobo)}</td><td>{money(i.penalty_due_kobo)}</td><td>{money(i.amount_paid_kobo)}</td><td><b>{money(i.outstanding_kobo)}</b></td><td><Status v={i.status}/></td></tr>)}</tbody></table></div>}{repayable&&outstanding>0&&<div className="two" style={{marginTop:14}}><label className="label">Repay from wallet (₦)<input className="field" inputMode="decimal" value={repayAmounts[l.id]||''} onChange={e=>setRepayAmounts(x=>({...x,[l.id]:e.target.value}))}/></label><label className="label">Transaction PIN<input className="field" type="password" inputMode="numeric" maxLength={4} value={repayPins[l.id]||''} onChange={e=>setRepayPins(x=>({...x,[l.id]:e.target.value.replace(/\D/g,'').slice(0,4)}))}/></label><button className="btn primary" disabled={busy} onClick={()=>void repay(l.id)}>Pay loan from wallet</button></div>}</div>})}{!loans.length&&<div className="empty">You have not submitted a loan application yet.</div>}</section>

  <div className="grid2"><section className="card"><div className="cardHeader"><h3>Guarantors you requested</h3></div>{outgoing.map((g:any)=><div className="list" key={g.id}><div><b>{g.first_name} {g.surname}</b><small>{g.member_number} · pledge {money(g.pledged_amount_kobo)}</small></div><Status v={g.status}/></div>)}{!outgoing.length&&<div className="empty">No outgoing guarantor requests yet.</div>}</section><section className="card"><div className="cardHeader"><h3>Guarantee requests for you</h3></div>{incoming.map((g:any)=><div className="list" key={g.id}><div><b>Pledge {money(g.pledged_amount_kobo)}</b><small>Borrower {g.loan?.borrower||'member'} · loan {money(g.loan?.principal_kobo)}</small></div><div className="actions"><Status v={g.status}/>{g.status==='PENDING'&&<><button className="btn danger" onClick={()=>void respond(g.id,false)}>Decline</button><button className="btn primary" onClick={()=>void respond(g.id,true)}>Accept</button></>}</div></div>)}{!incoming.length&&<div className="empty">No guarantee requests are waiting for you.</div>}</section></div>
 </div></main>;
}
