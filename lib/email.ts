type EmailInput={to:string;subject:string;html:string;replyTo?:string};

const resendKey=()=>process.env.V4_RESEND_API_KEY||process.env.RESEND_API_KEY||'';
const fromEmail=()=>process.env.RESEND_FROM_EMAIL||process.env.V4_RESEND_FROM_EMAIL||'';

export async function sendTransactionalEmail(input:EmailInput){
 const key=resendKey();
 const from=fromEmail();
 if(!key||!from)return {ok:false,skipped:true,error:'EMAIL_NOT_CONFIGURED'} as const;
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify({from,to:[input.to],subject:input.subject,html:input.html,reply_to:input.replyTo}),
 });
 const body=await response.json().catch(()=>({}));
 if(!response.ok)return {ok:false,skipped:false,error:body?.message||'EMAIL_SEND_FAILED'} as const;
 return {ok:true,skipped:false,id:body?.id||null} as const;
}

export function cooperativeEmailTemplate(title:string,body:string,cta?:{label:string;url:string}){
 const button=cta?`<p style="margin:24px 0"><a href="${cta.url}" style="display:inline-block;background:#176b43;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${cta.label}</a></p>`:'';
 return `<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:Arial,sans-serif;color:#13231b"><div style="max-width:620px;margin:auto;padding:28px"><div style="background:white;border:1px solid #dce5e0;border-radius:14px;padding:28px"><p style="font-weight:800;color:#176b43;margin-top:0">Acres of Diamond Multipurpose Cooperative Society</p><h1 style="font-size:24px">${title}</h1><div style="line-height:1.65;color:#46544d">${body}</div>${button}<p style="font-size:12px;color:#77827c;margin-top:28px">This is an automated cooperative notification. Do not share passwords, transaction PINs or verification secrets by email.</p></div></div></body></html>`;
}
