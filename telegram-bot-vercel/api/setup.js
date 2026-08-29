import { parseBundle, supabaseRpc, telegram, escapeHtml } from '../lib/core.js';

function page(message=''){
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JAMB Bot Setup</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:28px auto;padding:0 14px;background:#fafafa;color:#171717;line-height:1.5}.card{background:white;border:1px solid #e5e5e5;border-radius:16px;padding:22px;box-shadow:0 8px 30px #0000000c}textarea{width:100%;min-height:230px;box-sizing:border-box;padding:14px;border:2px solid #222;border-radius:12px;font:15px ui-monospace,monospace;line-height:1.55}button{width:100%;margin-top:14px;padding:14px;border:0;border-radius:10px;background:#111;color:#fff;font-weight:800;font-size:16px}.msg{padding:13px;border-radius:10px;background:#f0f0f0;margin-bottom:16px}.order{background:#f7f7f7;border:1px solid #ddd;border-radius:10px;padding:12px}.note{color:#666;font-size:.92rem}</style></head><body><div class="card"><h1>JAMB Bot — Vercel Setup</h1>${message?`<div class="msg">${message}</div>`:''}<p>Paste all credentials once. Exam questions now come directly from your Supabase <b>Exam Bank</b>; ALOC is no longer used.</p><div class="order"><b>Paste order</b><br>Line 1 — Telegram Bot Token<br>Line 2 — Groq API Key<br>Line 3 — Cloudflare Account ID<br>Line 4 — Cloudflare Workers AI Token</div><form method="post"><p><textarea name="bundle" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste all 4 lines here"></textarea></p><button type="submit">Connect Telegram Bot</button></form><p class="note">If your clipboard still contains the old 5-line bundle with an ALOC key on line 2, paste it anyway — this page automatically ignores the obsolete ALOC line.</p></div></body></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}

async function checkGroq(key){const r=await fetch('https://api.groq.com/openai/v1/models',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(7000)});if(!r.ok)throw new Error(`Groq returned ${r.status}`);return 'connected';}
async function checkCf(account,token){const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/@cf/google/gemma-4-26b-a4b-it`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Reply OK'}],max_tokens:4}),signal:AbortSignal.timeout(9000)});const b=await r.json().catch(()=>({}));if(!r.ok||b?.success===false)throw new Error(b?.errors?.[0]?.message||`Cloudflare returned ${r.status}`);return 'connected';}

export default {async fetch(req){
  if(req.method==='GET')return page(); if(req.method!=='POST')return new Response('Method Not Allowed',{status:405});
  try{
    const form=await req.formData();const {token,groq,cfAccount,cfToken}=parseBundle(form.get('bundle'));
    if(!token||!groq||!cfAccount||!cfToken)return page('Please paste all four credentials in the stated order.');
    const me=await telegram(token,'getMe');
    const checks=await Promise.allSettled([checkGroq(groq),checkCf(cfAccount,cfToken)]);
    const configId=crypto.randomUUID(),secret=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    await supabaseRpc('bot_store_config',{p_config_id:configId,p_secret:secret,p_telegram_token:token,p_groq_key:groq,p_cf_account:cfAccount,p_cf_token:cfToken});
    const origin=new URL(req.url).origin,webhook=`${origin}/telegram-webhook?cfg=${encodeURIComponent(configId)}`;
    await telegram(token,'setMyCommands',{commands:[{command:'start',description:'Start JAMB practice'},{command:'ask',description:'Ask AI about current question'},{command:'help',description:'Show bot help'}]});
    await telegram(token,'setWebhook',{url:webhook,secret_token:secret,allowed_updates:['message','callback_query'],drop_pending_updates:true});
    const info=await telegram(token,'getWebhookInfo');
    const gs=checks[0].status==='fulfilled'?'connected':`warning: ${escapeHtml(checks[0].reason?.message||'failed')}`;
    const cs=checks[1].status==='fulfilled'?'connected':`warning: ${escapeHtml(checks[1].reason?.message||'failed')}`;
    return page(`<b>${escapeHtml(me?.username?'@'+me.username:me?.first_name||'Telegram bot')}</b><br>Webhook: <b>${info?.url?'connected':'not confirmed'}</b><br>Exam Bank: <b>connected</b><br>Groq Qwen3.8-27B: <b>${gs}</b><br>Cloudflare Gemma 4 26B: <b>${cs}</b><br><br>Open Telegram and send <code>/start</code>.`);
  }catch(e){return page(`<b>Setup failed:</b> ${escapeHtml(e?.message||'Unknown error')}`);}
}};
