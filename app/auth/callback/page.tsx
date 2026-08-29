'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../../lib/supabase';

export default function AuthCallback(){
 const router=useRouter();
 const[msg,setMsg]=useState('Completing secure sign-in…');

 useEffect(()=>{
  void (async()=>{
   const params=new URLSearchParams(window.location.search);
   const code=params.get('code');
   if(code){
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(error){setMsg(error.message);return;}
   }
   const {data}=await supabase.auth.getSession();
   if(!data.session){setMsg('We could not complete the sign-in. Please return to login and try again.');return;}
   const {data:profile}=await supabase.from('profiles').select('membership_status,application_role').eq('id',data.session.user.id).maybeSingle();
   if(profile?.application_role==='ADMIN'||profile?.application_role==='SUPER_ADMIN')router.replace('/admin');
   else if(profile?.membership_status==='ACTIVE')router.replace('/portal');
   else router.replace('/onboarding');
  })();
 },[router]);

 return <main className="authPanel" style={{minHeight:'100svh'}}><div className="card authCard"><div className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Secure authentication</small></span></div><h1 style={{fontSize:32}}>One moment.</h1><p className="muted">{msg}</p></div></main>;
}
