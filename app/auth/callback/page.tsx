'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {friendlyError,supabase} from '../../../lib/supabase';

function safeNext(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:null}

export default function AuthCallback(){
 const router=useRouter();
 const[msg,setMsg]=useState('Completing secure sign-in…');
 const[failed,setFailed]=useState(false);
 const started=useRef(false);

 useEffect(()=>{
  if(started.current)return;
  started.current=true;
  void (async()=>{
   const params=new URLSearchParams(window.location.search);
   const next=safeNext(params.get('next'));
   const oauthError=params.get('error_description')||params.get('error');
   if(oauthError){setFailed(true);setMsg(friendlyError(oauthError));return;}

   const code=params.get('code');
   let {data:sessionData}=await supabase.auth.getSession();
   if(code&&!sessionData.session){
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(error){
     const retry=await supabase.auth.getSession();
     if(!retry.data.session){setFailed(true);setMsg(friendlyError(error.message));return;}
     sessionData=retry.data;
    }else{
     sessionData=(await supabase.auth.getSession()).data;
    }
   }

   if(!sessionData.session){setFailed(true);setMsg('We could not complete the Google sign-in. Please return to login and try again.');return;}

   const user=sessionData.session.user;
   const meta=user.user_metadata||{};
   const profileUpdate:Record<string,string>={updated_at:new Date().toISOString()};
   if(meta.given_name||meta.first_name)profileUpdate.first_name=String(meta.given_name||meta.first_name);
   if(meta.family_name||meta.last_name)profileUpdate.surname=String(meta.family_name||meta.last_name);
   const updated=await supabase.from('profiles').update(profileUpdate).eq('id',user.id);
   if(updated.error)console.warn('profile_oauth_sync_warning',updated.error.message);

   if(next){router.replace(next);return;}
   const {data:profile}=await supabase.from('profiles').select('membership_status,application_role').eq('id',user.id).maybeSingle();
   if(profile?.application_role==='ADMIN'||profile?.application_role==='SUPER_ADMIN')router.replace('/admin');
   else if(profile?.membership_status==='ACTIVE')router.replace('/portal');
   else router.replace('/onboarding');
  })().catch(error=>{
   console.error('auth_callback_error',error);
   setFailed(true);
   setMsg('We could not complete sign-in. Please return to login and try again.');
  });
 },[router]);

 return <main className="authPanel" style={{minHeight:'100svh'}}><div className="card authCard"><div className="brand"><span className="brandMark">AD</span><span>Acres of Diamond<small>Secure authentication</small></span></div><h1 style={{fontSize:32}}>{failed?'Sign-in needs attention':'One moment.'}</h1><p className="muted">{msg}</p>{failed&&<div className="actions"><Link className="btn primary" href="/login">Return to login</Link></div>}</div></main>;
}
