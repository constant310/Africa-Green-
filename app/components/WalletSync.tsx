'use client';

import {useEffect,useRef} from 'react';
import {supabase} from '../../lib/supabase';

export default function WalletSync(){
 const started=useRef(false);
 useEffect(()=>{
  if(started.current)return;
  const url=new URL(window.location.href);
  if(url.pathname!=='/portal')return;
  const wantsSync=url.searchParams.get('wallet_sync')==='1';
  const reference=url.searchParams.get('reference')||url.searchParams.get('trxref');
  if(!wantsSync||!reference)return;
  started.current=true;
  void (async()=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session)return;
   try{
    const res=await fetch('/api/paystack/verify-wallet',{
     method:'POST',
     headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
     body:JSON.stringify({reference}),
    });
    const body=await res.json().catch(()=>({}));
    const clean=new URL(window.location.href);
    clean.searchParams.delete('reference');
    clean.searchParams.delete('trxref');
    clean.searchParams.set('wallet_sync',res.ok&&body.synced?'success':body.status||'failed');
    window.location.replace(clean.toString());
   }catch{
    const clean=new URL(window.location.href);
    clean.searchParams.delete('reference');
    clean.searchParams.delete('trxref');
    clean.searchParams.set('wallet_sync','failed');
    window.location.replace(clean.toString());
   }
  })();
 },[]);
 return null;
}
