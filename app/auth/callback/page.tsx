'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../../lib/supabase';

function safeNext(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:null}

export default function AuthCallback(){
 const router=useRouter();
 const[msg,setMsg]=useState('Completing secure sign-in…');
 const[failed,setFailed]=useState(false);

 useEffect(()=>{
  void (async()=>{
   const params=new URLSearchParams(window.location.search);
   const next=safeNext(params.get('next'));
   const oauthError=params.get('error_description')||params.get('error');
   if(oauthError){setFailed(true);setMsg(friendlyError(oauthError));return;}

   const code=params.get('code');
   if(code){
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(error){setFailed(true);setMsg(friendlyError(error.message));return;}
   }

   const {data,error}=await supabase.auth.getSession();
   if(error||!data.session){setFailed(true);setMsg('We could not complete the Google sign-in. Please return to login and try again.');return;}

   const user=data.session.user;
   const meta=user.user_metadata||{};
   await supabase.from('profiles').update({
    first_name:meta.given_name||meta.first_name||undefined,
    surname:meta.family_name||meta.last_name||undefined,
    updated_at:new Date().toISOString(),
   }).eq('id',user.id);

   if(next){router.replace(next);return;}
   const {data:profile}=await supabase.from('profiles').select('membership_status,application_role').eq('id',user.id).maybeSingle();
   if(profile?.application_role==='ADMIN'||profile?.application_role==='SUPER_ADMIN')router.replace('/admin');
   else if(profile?.membership_status==='ACTIVE')router.replace('/portal');
   else router.replace('/onboarding');
  })();
 },[router]);

 return <main className="authPanel" style={{minHeight:'100svh'}}><div className="card authCard"><div className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Secure authentication</small></span></div><h1 style={{fontSize:32}}>{failed?'Sign-in needs attention':'One moment.'}</h1><p className="muted">{msg}</p>{failed&&<div className="actions"><Link className="btn primary" href="/login">Return to login</Link></div>}</div></main>;
}
