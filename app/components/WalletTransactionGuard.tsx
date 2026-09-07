'use client';

import {useEffect,useRef,useState} from 'react';

type Rule={match:(text:string)=>boolean;title:string;action:string};
type Pending={button:HTMLButtonElement;pinInput:HTMLInputElement;amount:number;title:string;action:string;detail:string};

const rules:Rule[]=[
 {match:t=>t==='contribute',title:'Confirm contribution',action:'Savings contribution'},
 {match:t=>t.includes('allocate from wallet'),title:'Confirm share purchase',action:'Share capital purchase'},
 {match:t=>t.includes('pay loan from wallet'),title:'Confirm loan repayment',action:'Loan repayment'},
 {match:t=>t.includes('submit withdrawal request'),title:'Confirm withdrawal',action:'Wallet withdrawal'},
];

const naira=(n:number)=>`₦${n.toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

function setNativeInputValue(input:HTMLInputElement,value:string){
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
 setter?.call(input,value);
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.dispatchEvent(new Event('change',{bubbles:true}));
}

function transactionDetail(button:HTMLButtonElement,action:string){
 if(action==='Savings contribution'){
  const plan=button.closest('.plan')?.querySelector('h4')?.textContent?.trim();
  return plan?`To ${plan}`:'To your savings plan';
 }
 if(action==='Loan repayment'){
  const card=button.closest('.card');
  const loan=card?.querySelector('.cardHeader b')?.textContent?.trim();
  return loan?`For ${loan}`:'For your active loan';
 }
 if(action==='Wallet withdrawal') return 'To your verified default beneficiary';
 if(action==='Share capital purchase') return 'From available wallet to share capital';
 return '';
}

export default function WalletTransactionGuard(){
 const[pending,setPending]=useState<Pending|null>(null);
 const[pin,setPin]=useState('');
 const[pinError,setPinError]=useState('');
 const[screenError,setScreenError]=useState('');
 const pinRef=useRef<HTMLInputElement|null>(null);

 useEffect(()=>{
  function onClick(event:MouseEvent){
   const el=event.target instanceof Element?event.target.closest('button'):null;
   if(!(el instanceof HTMLButtonElement))return;
   if(el.dataset.walletGuardBypass==='1'){delete el.dataset.walletGuardBypass;return;}
   const text=(el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
   const rule=rules.find(r=>r.match(text));
   if(!rule)return;

   let scope=el.closest('.card') as HTMLElement|null;
   const pinSelector='input[type="password"][maxlength="4"]';
   if(!scope?.querySelector(pinSelector))scope=el.closest('section.card') as HTMLElement|null;
   const pinInput=(scope?.querySelector(pinSelector)||document.querySelector(pinSelector)) as HTMLInputElement|null;
   if(!pinInput)return;

   const amountInput=(scope?.querySelector('input[inputmode="decimal"]')||scope?.querySelector('input[type="number"]')) as HTMLInputElement|null;
   const amount=Number(String(amountInput?.value||'').replace(/,/g,''));

   event.preventDefault();
   event.stopPropagation();
   event.stopImmediatePropagation();

   if(!Number.isFinite(amount)||amount<=0){
    setPending(null);setPin('');setPinError('');
    setScreenError('Enter a valid transaction amount first, then tap the transaction button again.');
    return;
   }

   setScreenError('');setPin('');setPinError('');
   setPending({button:el,pinInput,amount,title:rule.title,action:rule.action,detail:transactionDetail(el,rule.action)});
  }
  document.addEventListener('click',onClick,true);
  return()=>document.removeEventListener('click',onClick,true);
 },[]);

 useEffect(()=>{
  if(pending){const id=window.setTimeout(()=>pinRef.current?.focus(),80);return()=>window.clearTimeout(id);}
 },[pending]);

 useEffect(()=>{
  function onKey(event:KeyboardEvent){if(event.key==='Escape'){setPending(null);setScreenError('');setPin('');setPinError('');}}
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[]);

 function close(){setPending(null);setScreenError('');setPin('');setPinError('');}
 function confirm(){
  if(!pending)return;
  if(!/^\d{4}$/.test(pin)){setPinError('Enter your 4-digit transaction PIN.');return;}
  setNativeInputValue(pending.pinInput,pin);
  const button=pending.button;
  button.dataset.walletGuardBypass='1';
  close();
  window.setTimeout(()=>button.click(),40);
 }

 if(!pending&&!screenError)return null;
 return <div className="walletGuardOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
  <section className="walletGuardSheet" role="dialog" aria-modal="true" aria-labelledby="wallet-guard-title">
   <div className="walletGuardHandle"/>
   {screenError?<>
    <div className="walletGuardIcon error">!</div>
    <h2 id="wallet-guard-title">Amount required</h2>
    <p className="walletGuardMuted">{screenError}</p>
    <button className="btn primary walletGuardFull" type="button" onClick={close}>Go back</button>
   </>:pending?<>
    <div className="walletGuardIcon">✓</div>
    <p className="eyebrow" style={{marginBottom:6}}>Review transaction</p>
    <h2 id="wallet-guard-title">{pending.title}</h2>
    <div className="walletGuardAmount">{naira(pending.amount)}</div>
    <div className="walletGuardSummary">
     <div><span>Transaction</span><b>{pending.action}</b></div>
     <div><span>Details</span><b>{pending.detail||'Wallet debit'}</b></div>
    </div>
    <p className="walletGuardMuted">Check the details carefully. Your wallet will only be debited after your PIN is verified.</p>
    <label className="walletGuardPinLabel">Transaction PIN
     <input ref={pinRef} className="walletGuardPin" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,'').slice(0,4));setPinError('')}} placeholder="••••"/>
    </label>
    {pinError&&<div className="walletGuardError" role="alert">{pinError}</div>}
    <div className="walletGuardActions"><button className="btn" type="button" onClick={close}>Cancel</button><button className="btn primary" type="button" onClick={confirm} disabled={pin.length!==4}>Confirm & continue</button></div>
   </>:null}
  </section>
 </div>;
}
