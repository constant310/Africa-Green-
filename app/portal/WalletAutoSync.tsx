'use client';

import {useEffect} from 'react';
import {supabase} from '../../lib/supabase';

export default function WalletAutoSync(){
 useEffect(()=>{
  let cancelled=false;
  async function sync(){
   const {data:{session}}=await supabase.auth.getSession();
   if(!session||cancelled)return;
   try{
    const r=await fetch('/api/paystack/reconcile-wallet',{
     method:'POST',
     headers:{Authorization:`Bearer ${session.access_token}`},
     cache:'no-store',
    });
    const body=await r.json().catch(()=>null);
    if(cancelled||!r.ok)return;
    if(Number(body?.credited_count||0)>0){
     const url=new URL(window.location.href);
     url.searchParams.delete('reference');
     url.searchParams.delete('trxref');
     window.history.replaceState({},'',url.pathname+url.search+url.hash);
     window.location.reload();
    }
   }catch{}
  }
  void sync();
  return()=>{cancelled=true};
 },[]);
 return null;
}
