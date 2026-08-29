import Link from 'next/link';

export default async function PaymentCallback({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const p=await searchParams;
 const raw=p.reference||p.trxref;
 const ref=Array.isArray(raw)?raw[0]:raw;
 return <main id="main" className="authSolo"><section className="authCard center"><span className="successIcon">✓</span><p className="eyebrow">PAYMENT RETURN</p><h1>Payment received for verification</h1><p className="muted">Your wallet is credited only after the server confirms the Paystack transaction. If confirmation is still processing, refresh your portal shortly.</p>{ref&&<div className="referenceBox"><small>Reference</small><b>{ref}</b></div>}<Link className="btn primary wide inlineButton" href="/portal">Return to portal</Link></section></main>
}
