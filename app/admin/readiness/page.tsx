'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';

type Health={ok?:boolean;integrations?:Record<string,boolean|string>;note?:string};

const labels:Record<string,string>={
 supabase_public:'Supabase client',
 supabase_server:'Supabase server access',
 paystack_public:'Paystack public key',
 paystack_server:'Paystack server key',
 resend:'Resend email',
 resend_sender:'Resend sender',
 google_oauth:'Google OAuth configuration',
 smile_partner:'Smile ID Partner ID',
 smile_api_key:'Smile ID API key',
 smile_environment:'Smile ID environment',
 dojah_app:'Dojah App ID',
 dojah_secret:'Dojah secret key',
 dojah_environment:'Dojah environment',
 app_url:'Production app URL',
};
const configured=(v:boolean|string)=>v===true||(typeof v==='string'&&v.length>0&&v!=='not_configured'&&v!=='false');
const display=(v:boolean|string)=>typeof v==='string'?v.replaceAll('_',' '):(v?'Configured':'Not configured');

export default function Readiness(){
 const[data,setData]=useState<Health|null>(null);
 const[error,setError]=useState('');
 const[loading,setLoading]=useState(true);
 async function load(){
  setLoading(true);setError('');
  try{const r=await fetch('/api/health',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j?.error||'Unable to load readiness status');setData(j)}catch(e:any){setError(e?.message||'Unable to load readiness status')}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 const entries=Object.entries(data?.integrations||{});
 const ready=entries.filter(([,v])=>configured(v)).length;
 return <main className="section"><div className="container stack">
  <div className="actions" style={{justifyContent:'space-between'}}><Link href="/admin" className="btn">← Administration</Link><button className="btn" onClick={()=>void load()} disabled={loading}>{loading?'Checking…':'Recheck'}</button></div>
  <section className="welcome"><div><p className="eyebrow" style={{color:'#a8e4c5'}}>Production readiness</p><h1>Integration status</h1><p>This page reports configuration presence and environment mode only. It never displays secret values.</p></div><span className="status">{ready}/{entries.length||0} configured</span></section>
  {error&&<div className="alert error">{error}</div>}
  <section className="card"><div className="cardHeader"><h3>External services</h3></div><div className="factGrid">{entries.map(([k,v])=><div className="fact" key={k}><small>{labels[k]||k.replaceAll('_',' ')}</small><b>{configured(v)?display(v):'Not configured'}</b></div>)}</div>{!entries.length&&!loading&&<div className="empty">No readiness data was returned.</div>}</section>
  <section className="card"><div className="cardHeader"><h3>Launch rule</h3></div><p className="muted">Keep real member money and real identity verification disabled until Paystack live credentials and transfer webhooks, a verified Resend sender, Google OAuth, Dojah production access and final end-to-end tests have all passed. Sandbox and test environments remain suitable for development only.</p></section>
 </div></main>
}
