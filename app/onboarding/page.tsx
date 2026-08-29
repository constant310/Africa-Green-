'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../lib/supabase';

type Any=Record<string,any>;

const steps=[
 ['personal','Personal'],
 ['contact','Contact'],
 ['occupation','Work'],
 ['kyc','KYC'],
 ['passport','Identity'],
 ['nextOfKin','Next of kin'],
 ['registration','Payment'],
 ['bylaws','Bye-laws'],
 ['review','Review'],
];

export default function Onboarding(){
 const router=useRouter();
 const[snap,setSnap]=useState<Any|null>(null);
 const[step,setStep]=useState('personal');
 const[busy,setBusy]=useState(false);
 const[msg,setMsg]=useState('');

 async function load(){
  setBusy(true);
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){router.replace('/login');return;}
  const r=await supabase.rpc('member_portal_snapshot_v4');
  setBusy(false);
  if(r.error)return setMsg(friendlyError(r.error.message));
  setSnap(r.data);
  if(r.data?.application?.current_step)setStep(r.data.application.current_step);
 }

 useEffect(()=>{void load()},[]);

 const data=snap?.application?.application_data||{};
 const currentIndex=steps.findIndex(x=>x[0]===step);
 const bylaw=snap?.active_bylaw;

 async function save(payload:Any,next=true){
  setBusy(true);setMsg('');
  const r=await supabase.rpc('update_application_step_v4',{p_step:step,p_payload:payload});
  setBusy(false);
  if(r.error)return setMsg(friendlyError(r.error.message));
  setMsg('Saved. You can safely continue later.');
  if(next&&currentIndex<steps.length-1)setStep(steps[currentIndex+1][0]);
  await load();
 }

 async function submitForm(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  if(step==='kyc'){
   setBusy(true);setMsg('');
   const {data:{session}}=await supabase.auth.getSession();
   if(!session){router.replace('/login');return;}
   const nin=String(fd.get('nin')||'');
   const consent=String(fd.get('consent')||'')==='yes';
   const res=await fetch('/api/kyc/dojah',{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({nin,consent}),
   });
   const result=await res.json().catch(()=>({}));
   if(!res.ok){setBusy(false);return setMsg(result.error||'Identity verification could not be completed.');}
   const r=await supabase.rpc('update_application_step_v4',{p_step:'kyc',p_payload:{
    verified:true,
    provider:'DOJAH',
    environment:result.environment,
    verifiedAt:new Date().toISOString(),
    identity:result.identity,
   }});
   setBusy(false);
   if(r.error)return setMsg(friendlyError(r.error.message));
   setMsg('NIN verified successfully with Dojah.');
   setStep('passport');
   await load();
   return;
  }
  await save(Object.fromEntries(fd.entries()));
 }

 async function startPayment(){
  setBusy(true);setMsg('');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){router.replace('/login');return;}
  await supabase.rpc('update_application_step_v4',{p_step:'registration',p_payload:{fee:'10000',provider:'PAYSTACK'}});
  const res=await fetch('/api/paystack/registration',{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
   body:JSON.stringify({email:session.user.email,callback_url:`${location.origin}/onboarding`}),
  });
  const body=await res.json();
  setBusy(false);
  if(!res.ok)return setMsg(body.error||'Payment could not be started.');
  location.href=body.authorization_url;
 }

 async function finalSubmit(){
  if(!bylaw?.id)return setMsg('No active bye-law version is available.');
  setBusy(true);setMsg('');
  for(const s of ['bylaws','review']){
   const payload=s==='bylaws'?{accepted:true,version:bylaw.version_number}:{confirmed:true};
   const r=await supabase.rpc('update_application_step_v4',{p_step:s,p_payload:payload});
   if(r.error){setBusy(false);return setMsg(friendlyError(r.error.message));}
  }
  const r=await supabase.rpc('submit_membership_application',{
   p_bylaw_version_id:bylaw.id,
   p_accepted:true,
   p_user_agent:navigator.userAgent,
  });
  setBusy(false);
  if(r.error)return setMsg(friendlyError(r.error.message));
  setMsg('Application submitted successfully. It is now ready for independent review.');
  await load();
 }

 function Fields(){
  if(step==='personal')return <>
   <div className="two">
    <label className="label">Date of birth<input className="field" type="date" name="dateOfBirth" defaultValue={data.personal?.dateOfBirth}/></label>
    <label className="label">Gender<select className="field" name="gender" defaultValue={data.personal?.gender||''}><option value="">Select</option><option>Male</option><option>Female</option></select></label>
   </div>
   <label className="label">Marital status<select className="field" name="maritalStatus" defaultValue={data.personal?.maritalStatus||''}><option value="">Select</option><option>Single</option><option>Married</option><option>Other</option></select></label>
  </>;

  if(step==='contact')return <>
   <label className="label">Residential address<textarea className="field" name="address" required defaultValue={data.contact?.address}/></label>
   <div className="two"><label className="label">State<input className="field" name="state" required defaultValue={data.contact?.state}/></label><label className="label">LGA<input className="field" name="lga" defaultValue={data.contact?.lga}/></label></div>
  </>;

  if(step==='occupation')return <>
   <label className="label">Occupation<input className="field" name="occupation" required defaultValue={data.occupation?.occupation}/></label>
   <label className="label">Employer / business<input className="field" name="employer" defaultValue={data.occupation?.employer}/></label>
   <label className="label">Work address<textarea className="field" name="workAddress" defaultValue={data.occupation?.workAddress}/></label>
  </>;

  if(step==='kyc')return <>
   <div className="alert">Your NIN is sent securely to Dojah for verification. The raw NIN is not stored in your membership application.</div>
   <label className="label">11-digit NIN<input className="field" name="nin" required inputMode="numeric" pattern="[0-9]{11}" minLength={11} maxLength={11} autoComplete="off"/></label>
   <label className="label">Identity consent<select className="field" name="consent" required><option value="">Select</option><option value="yes">I consent to identity verification</option></select></label>
   <div className="muted">Sandbox test NIN: 70123456789. Live NIN checks will only be enabled after the cooperative activates Dojah production access.</div>
  </>;

  if(step==='passport')return <>
   <div className="alert">NIN verification is handled through Dojah. You may also record the identity document type supplied by the member.</div>
   <label className="label">Identity document type<select className="field" name="documentType" defaultValue={data.passport?.documentType||''}><option value="NIN_SLIP">NIN slip</option><option value="PASSPORT">International passport</option><option value="DRIVERS_LICENSE">Driver&apos;s licence</option></select></label>
   <label className="label">Document reference (optional)<input className="field" name="reference" defaultValue={data.passport?.reference}/></label>
  </>;

  if(step==='nextOfKin')return <>
   <label className="label">Full name<input className="field" name="fullName" required defaultValue={data.nextOfKin?.fullName}/></label>
   <div className="two"><label className="label">Relationship<input className="field" name="relationship" required defaultValue={data.nextOfKin?.relationship}/></label><label className="label">Phone<input className="field" name="phone" required defaultValue={data.nextOfKin?.phone}/></label></div>
   <label className="label">Email<input className="field" name="email" type="email" defaultValue={data.nextOfKin?.email}/></label>
   <label className="label">Address<textarea className="field" name="address" required defaultValue={data.nextOfKin?.address}/></label>
  </>;

  return null;
 }

 return <main className="onboarding">
  {busy&&<div className="loadingBar"/>}
  <div className="onboardTop"><div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}><Link href="/" className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Membership onboarding</small></span></Link><Link href="/portal" className="btn">Member portal</Link></div></div>
  <div className="container onboardGrid">
   <aside className="steps">{steps.map(([k,l],i)=><button key={k} className={`stepButton ${step===k?'active':''}`} onClick={()=>setStep(k)}>{i+1}. {l}</button>)}</aside>
   <section className="card onboardCard">
    <p className="eyebrow">Step {currentIndex+1} of {steps.length}</p>
    <h1>{steps[currentIndex]?.[1]||'Membership application'}</h1>
    <p className="muted">Your application saves as you go. You can return from another device after signing in.</p>
    {msg&&<div className={msg.includes('success')||msg.startsWith('Saved')?'alert success':'alert'}>{msg}</div>}

    {['personal','contact','occupation','kyc','passport','nextOfKin'].includes(step)&&<form className="formGrid" onSubmit={submitForm}><Fields/><div className="actions"><button type="button" className="btn" onClick={()=>currentIndex>0&&setStep(steps[currentIndex-1][0])}>Back</button><button className="btn primary" disabled={busy}>{step==='kyc'?'Verify NIN & continue':'Save & continue'}</button></div></form>}

    {step==='registration'&&<div className="stack">
     <div className="card" style={{boxShadow:'none'}}><small className="muted">Required registration fee</small><div className="balance" style={{fontSize:32}}>₦10,000</div></div>
     <p className="muted">Only the ₦10,000 registration fee is required during onboarding. Share capital and thrift contributions can be funded separately after membership activation. Payment is verified server-side before your application can be submitted.</p>
     <div className="actions"><button className="btn primary" onClick={startPayment} disabled={busy}>Pay ₦10,000 with Paystack</button><button className="btn" onClick={async()=>{await save({fee:'10000',provider:'PAYSTACK'},false);setStep('bylaws')}}>I already paid / continue</button></div>
    </div>}

    {step==='bylaws'&&<div className="stack">
     <div className="reviewBox"><b>Current bye-laws: {bylaw?.version_number||'Not published'}</b><br/>Publication date: {bylaw?.publication_date||'—'}<br/><br/>Before submitting, confirm that you have read the current bye-laws and agree to comply with the cooperative&apos;s rules, policies and lawful decisions.</div>
     {bylaw?.document_url&&<a className="btn" target="_blank" rel="noreferrer" href={bylaw.document_url}>Open current bye-laws</a>}
     <button className="btn primary" onClick={async()=>{await save({accepted:true,version:bylaw?.version_number},false);setStep('review')}}>I have read and accept the bye-laws</button>
    </div>}

    {step==='review'&&<div className="stack">
     <div className="reviewBox">Account: {snap?.profile?.email||'—'}\nStatus: {snap?.profile?.membership_status||'—'}\nRequired registration fee: ₦10,000\nShare capital: optional after activation\nProperty Thrift: optional after activation · ₦10,000 weekly × 50 weeks\n\nFinal submission requires only a verified ₦10,000 registration payment. After submission, two independent authorized reviewers are required before activation.</div>
     <button className="btn primary" onClick={finalSubmit} disabled={busy}>Submit membership application</button>
    </div>}
   </section>
  </div>
 </main>;
}
