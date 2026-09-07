'use client';

import {useEffect} from 'react';

export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error('Application route error',error)},[error]);
 return <main className="section"><div className="container"><section className="card" style={{maxWidth:680,margin:'48px auto',textAlign:'center'}}>
  <div style={{width:54,height:54,borderRadius:'50%',display:'grid',placeItems:'center',margin:'0 auto 14px',background:'#fff1f1',color:'#a62626',fontWeight:900,fontSize:24}}>!</div>
  <p className="eyebrow">Something did not complete</p>
  <h1 style={{marginTop:6}}>We could not load this part of your account.</h1>
  <p className="muted">Your financial action has not been assumed successful. Check your transaction history before trying a payment again, especially if your internet connection dropped during processing.</p>
  {error.digest&&<small className="muted">Reference: {error.digest}</small>}
  <div className="actions" style={{justifyContent:'center',marginTop:18}}><button className="btn primary" onClick={reset}>Try again</button><button className="btn" onClick={()=>window.location.assign('/portal')}>Return to portal</button></div>
 </section></div></main>;
}
