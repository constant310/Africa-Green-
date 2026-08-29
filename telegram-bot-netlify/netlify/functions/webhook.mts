import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

const EXAM_BANK_URL = "https://wsxszbdvvtowmrnxdsrp.supabase.co";
const EXAM_BANK_KEY = "sb_publishable_JdUSYUZwX9RNdchmtUUEfw_ralc2WyT";
const EXAM_BODY = "jamb";

function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function reply(method, payload) { return new Response(JSON.stringify({ method, ...payload }), { status: 200, headers: { "content-type": "application/json; charset=utf-8" } }); }
function memory() { const root = globalThis; if (!root.__examBotMemory) root.__examBotMemory = new Map(); return root.__examBotMemory; }
function memGet(key) { const v = memory().get(key); if (!v || v.expiresAt < Date.now()) { memory().delete(key); return null; } return v.value; }
function memSet(key, value, ttl = 10 * 60 * 1000) { memory().set(key, { value, expiresAt: Date.now() + ttl }); }
function cacheStore() { return getStore("jamb-bot-cache"); }
function configStore() { return getStore("jamb-bot-config", { consistency: "strong" }); }
function questionStore() { return getStore("jamb-bot-state", { consistency: "strong" }); }
async function cacheGet(key) { const m = memGet(`c:${key}`); if (m != null) return m; try { const v = await cacheStore().get(key, { type: "json" }); if (!v || v.expiresAt < Date.now()) return null; memSet(`c:${key}`, v.value); return v.value; } catch { return null; } }
async function cacheSet(key, value, ttl) { memSet(`c:${key}`, value, Math.min(ttl, 10 * 60 * 1000)); try { await cacheStore().setJSON(key, { value, expiresAt: Date.now() + ttl }); } catch {} }
async function loadConfig(url) { const id = url.searchParams.get("cfg") || ""; if (!id) return null; const m = memGet(`cfg:${id}`); if (m) return m; try { const cfg = await configStore().get(`cfg:${id}`, { type: "json" }); if (cfg) { memSet(`cfg:${id}`, cfg, 15 * 60 * 1000); return cfg; } } catch {} return null; }
async function telegram(token, method, payload, timeout = 7000) { const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeout) }); const b = await r.json().catch(() => ({})); if (!r.ok || !b.ok) throw new Error(b?.description || `${method} failed`); return b.result; }
async function db(path, params = {}) { const qs = new URLSearchParams(params); const r = await fetch(`${EXAM_BANK_URL}/rest/v1/${path}?${qs}`, { headers: { apikey: EXAM_BANK_KEY, Authorization: `Bearer ${EXAM_BANK_KEY}`, Accept: "application/json" }, signal: AbortSignal.timeout(5000) }); const b = await r.json().catch(() => ([])); if (!r.ok) throw new Error(b?.message || `Exam Bank returned ${r.status}`); return b; }

async function subjects() {
  const cached = await cacheGet("subjects:exam-bank:v1"); if (Array.isArray(cached) && cached.length) return cached;
  const rows = await db("exam_body_subjects", { select: "subject_id,official_subject_name,exam_subjects!inner(id,slug,name)", exam_body_slug: `eq.${EXAM_BODY}`, is_active: "eq.true", order: "official_subject_name.asc" });
  const out = rows.map((r) => ({ id: r.subject_id, slug: r.exam_subjects?.slug, name: r.official_subject_name || r.exam_subjects?.name })).filter((x) => x.id && x.slug && x.name);
  await cacheSet("subjects:exam-bank:v1", out, 24 * 60 * 60 * 1000); return out;
}
async function years(subjectId) {
  const key = `years:exam-bank:${subjectId}`; const cached = await cacheGet(key); if (Array.isArray(cached)) return cached;
  const rows = await db("exam_questions", { select: "year", exam_body_slug: `eq.${EXAM_BODY}`, subject_id: `eq.${subjectId}`, content_status: "eq.published", year: "not.is.null", order: "year.desc" });
  const out = [...new Set(rows.map((x) => Number(x.year)).filter(Number.isInteger))].sort((a,b)=>b-a); await cacheSet(key, out, 60 * 60 * 1000); return out;
}
function normalizeQuestion(q, subject) {
  const choices = Array.isArray(q.exam_question_choices) ? [...q.exam_question_choices].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)) : [];
  const correct = choices.find((c) => c.is_correct === true)?.label || q.answer_text || "";
  const asset = Array.isArray(q.exam_question_assets) ? q.exam_question_assets.find((a) => a.source_url || (a.storage_bucket && a.storage_path)) : null;
  let imageUrl = asset?.source_url || "";
  if (!imageUrl && asset?.storage_bucket && asset?.storage_path) imageUrl = `${EXAM_BANK_URL}/storage/v1/object/public/${encodeURIComponent(asset.storage_bucket)}/${asset.storage_path.split("/").map(encodeURIComponent).join("/")}`;
  const passage = Array.isArray(q.exam_passages) ? q.exam_passages[0] : q.exam_passages;
  return { id: q.id, subject: subject.name, subjectSlug: subject.slug, year: q.year, text: q.stem_markdown || q.stem || "", passage: passage?.content_markdown || passage?.content || "", options: choices.map((c) => ({ label: String(c.label || "").toUpperCase(), text: c.choice_markdown || c.choice_text || "" })), correctAnswer: String(correct || "").trim().slice(0,1).toUpperCase(), explanation: q.explanation || "", imageUrl, metadata: q.metadata || {} };
}
async function questionPool(subject, year) {
  const key = `pool:exam-bank:${subject.id}:${year}`; const cached = await cacheGet(key); if (Array.isArray(cached) && cached.length) return cached;
  const params = { select: "id,year,question_number,stem,stem_markdown,answer_text,explanation,metadata,passage_id,exam_question_choices(label,choice_text,choice_markdown,is_correct,sort_order),exam_question_assets(asset_type,storage_bucket,storage_path,source_url,alt_text),exam_passages(content,content_markdown)", exam_body_slug: `eq.${EXAM_BODY}`, subject_id: `eq.${subject.id}`, content_status: "eq.published", order: "created_at.desc", limit: "40" };
  if (year !== "any") params.year = `eq.${year}`;
  const rows = await db("exam_questions", params); const normalized = rows.map((q) => normalizeQuestion(q, subject)).filter((q) => q.options.length >= 2);
  if (!normalized.length) throw new Error(`No published JAMB questions are available for ${subject.name}${year !== "any" ? ` ${year}` : ""} yet.`);
  await cacheSet(key, normalized, 15 * 60 * 1000); return normalized;
}
function pick(pool, chatId, subjectId, year) { const k = `cursor:${chatId}:${subjectId}:${year}`; let i = Number(memGet(k)); if (!Number.isInteger(i)) i = Math.floor(Math.random() * pool.length); else i = (i + 1) % pool.length; memSet(k, i, 60 * 60 * 1000); return pool[i]; }
function qid(q) { return createHash("sha1").update(String(q.id || q.text)).digest("hex").slice(0,12); }
async function saveQuestion(chatId, subject, year, q) { const id = qid(q), value = { q, subject, year }; memSet(`q:${id}`, value, 2 * 60 * 60 * 1000); memSet(`last:${chatId}`, { ...value, id }, 2 * 60 * 60 * 1000); try { await questionStore().setJSON(`q:${id}`, { value, expiresAt: Date.now()+2*60*60*1000 }); await questionStore().setJSON(`last:${chatId}`, { value:{...value,id}, expiresAt:Date.now()+2*60*60*1000 }); } catch {} return id; }
async function loadQuestion(id, chatId) { const m = memGet(id ? `q:${id}` : `last:${chatId}`); if (m) return m; try { const row = await questionStore().get(id ? `q:${id}` : `last:${chatId}`, { type: "json" }); if (row?.value && row.expiresAt > Date.now()) return row.value; } catch {} return null; }

function subjectMenu(list, page=0) { const size=10, pages=Math.max(1,Math.ceil(list.length/size)), p=Math.max(0,Math.min(page,pages-1)), visible=list.slice(p*size,p*size+size), rows=[]; for(let i=0;i<visible.length;i+=2) rows.push(visible.slice(i,i+2).map(s=>({text:s.name,callback_data:`s:${s.id}`}))); if(pages>1){const nav=[]; if(p>0)nav.push({text:"⬅️",callback_data:`sp:${p-1}`}); nav.push({text:`${p+1}/${pages}`,callback_data:"noop"}); if(p<pages-1)nav.push({text:"➡️",callback_data:`sp:${p+1}`}); rows.push(nav);} return { text:`🎓 <b>JAMB Practice Bot</b>\n\nChoose a subject.\n\n<b>${list.length} JAMB subjects</b>\n⚡ Exam Bank fast mode\n<i>Questions from your Exam Bank database</i>`, reply_markup:{inline_keyboard:rows} }; }
function yearMenu(subject, ys, page=0) { const size=12,pages=Math.max(1,Math.ceil(ys.length/size)),p=Math.max(0,Math.min(page,pages-1)),v=ys.slice(p*size,p*size+size),rows=[[{text:"🎯 Random — any year",callback_data:`q:${subject.id}:any`}]]; for(let i=0;i<v.length;i+=3) rows.push(v.slice(i,i+3).map(y=>({text:String(y),callback_data:`q:${subject.id}:${y}`}))); if(pages>1){const n=[];if(p>0)n.push({text:"⬅️",callback_data:`yp:${subject.id}:${p-1}`});n.push({text:`${p+1}/${pages}`,callback_data:"noop"});if(p<pages-1)n.push({text:"➡️",callback_data:`yp:${subject.id}:${p+1}`});rows.push(n);} rows.push([{text:"📚 Subjects",callback_data:"subjects"}]); return { text:`📘 <b>${escapeHtml(subject.name)}</b>\n\nChoose a year.${ys.length?`\n\n${ys.length} years currently populated.`:"\n\nNo published questions are populated for this subject yet."}`, reply_markup:{inline_keyboard:rows} }; }
function questionHtml(q) { const passage=q.passage?`<b>Passage</b>\n${escapeHtml(q.passage)}\n\n`:""; const opts=q.options.map(o=>`<b>${escapeHtml(o.label)}.</b> ${escapeHtml(o.text)}`).join("\n"); return (`<b>${escapeHtml(q.subject)} — JAMB${q.year?` ${q.year}`:""}</b>\n\n${passage}${escapeHtml(q.text)}\n\n${opts}\n\n<i>Exam Bank</i>`).slice(0,3900); }
function questionButtons(q, id, subject, year) { return { inline_keyboard:[q.options.map(o=>({text:o.label,callback_data:`a:${id}:${o.label}`})),[{text:"💡 Explain",callback_data:`e:${id}`},{text:"🎨 Diagram",callback_data:`v:${id}`}],[{text:"➡️ Next",callback_data:`q:${subject.id}:${year}`}],[{text:"📅 Year",callback_data:`s:${subject.id}`},{text:"📚 Subjects",callback_data:"subjects"}]] }; }
function resultButtons(id, subject, year) { return {inline_keyboard:[[{text:"💡 Explain",callback_data:`e:${id}`},{text:"🎨 Diagram",callback_data:`v:${id}`}],[{text:"➡️ Next",callback_data:`q:${subject.id}:${year}`}],[{text:"📚 Subjects",callback_data:"subjects"}]]}; }

function promptFor(q, request="Explain this question clearly and concisely.") { return `You are a Nigerian JAMB tutor. Give concise pedagogical reasoning, not hidden chain-of-thought. Return JSON only with keys answer, explanation, steps, key_latex, visualization_kind, visualization_code, confidence. visualization_kind must be none, mermaid, or vega.\nSubject: ${q.subject}\nYear: ${q.year||""}\nQuestion: ${q.text}\nOptions:\n${q.options.map(o=>`${o.label}. ${o.text}`).join("\n")}\nStudent request: ${request}`; }
function parseJson(text) { try { const m=String(text).match(/\{[\s\S]*\}/); return JSON.parse(m?m[0]:text); } catch { return {answer:"",explanation:String(text||""),steps:[],key_latex:"",visualization_kind:"none",visualization_code:"",confidence:0}; } }
async function groqTutor(q,key,request) { const content = q.imageUrl ? [{type:"text",text:promptFor(q,request)},{type:"image_url",image_url:{url:q.imageUrl}}] : promptFor(q,request); const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"qwen/qwen3.8-27b",messages:[{role:"user",content}],temperature:0.1,max_completion_tokens:650,reasoning_effort:"none",response_format:{type:"json_object"}}),signal:AbortSignal.timeout(11000)}); const b=await r.json().catch(()=>({})); if(!r.ok)throw new Error(b?.error?.message||`Groq ${r.status}`); return {...parseJson(b?.choices?.[0]?.message?.content),provider:"Groq Qwen3.8-27B"}; }
async function cloudflareTutor(q,account,token,request) { const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/@cf/google/gemma-4-26b-a4b-it`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:promptFor(q,request)}],max_tokens:650,temperature:0.1}),signal:AbortSignal.timeout(13000)}); const b=await r.json().catch(()=>({})); if(!r.ok||b?.success===false)throw new Error(b?.errors?.[0]?.message||`Cloudflare ${r.status}`); return {...parseJson(b?.result?.response||b?.result),provider:"Cloudflare Gemma 4 26B"}; }
async function tutor(q,cfg,request) { const key=`ai:${q.id}:${createHash("md5").update(request).digest("hex").slice(0,8)}`; const cached=await cacheGet(key); if(cached)return cached; let out; try { if(!cfg?.groq)throw new Error("Groq unavailable"); out=await groqTutor(q,cfg.groq,request); } catch(e){ if(!cfg?.cfAccount||!cfg?.cfToken)throw e; out=await cloudflareTutor(q,cfg.cfAccount,cfg.cfToken,request); } await cacheSet(key,out,7*24*60*60*1000); return out; }
function explanation(q,ai){ const official=String(q.correctAnswer||"").toUpperCase(), a=String(ai.answer||"").toUpperCase(); if(official&&a&&official!==a)return `⚠️ <b>Answer discrepancy</b>\n\nExam Bank answer: <b>${official}</b>\nAI answer: <b>${a}</b>\n\nThis item should be reviewed.`; const steps=Array.isArray(ai.steps)&&ai.steps.length?`\n\n<b>Steps</b>\n${ai.steps.slice(0,6).map((s,i)=>`${i+1}. ${escapeHtml(s)}`).join("\n")}`:""; return `✅ <b>Answer: ${escapeHtml(official||a||"—")}</b>\n\n<b>${escapeHtml(ai.provider||"AI Tutor")}</b>\n\n${escapeHtml(ai.explanation||q.explanation||"No explanation available.")}${steps}`.slice(0,3900); }
function latexUrl(v){return v?`https://latex.codecogs.com/png.image?${encodeURIComponent(`\\dpi{170} ${v}`)}`:"";}
function visualUrl(ai){ const kind=String(ai.visualization_kind||"none"),code=String(ai.visualization_code||""); if(["mermaid","vega"].includes(kind)&&code){try{return `https://kroki.io/${kind}/png/${deflateSync(Buffer.from(code)).toString("base64url")}`;}catch{}} return latexUrl(ai.key_latex||""); }

export default async (req, context) => {
  const url=new URL(req.url);
  if(req.method==="GET")return Response.json({ok:true,service:"jamb123bot",version:"exam-bank-v1",questionSource:"supabase-exam-bank",ai:["groq-qwen3.8-27b","cloudflare-gemma-4-26b"]});
  if(req.method!=="POST")return new Response("Method Not Allowed",{status:405});
  const secret=url.searchParams.get("secret")||"";
  if(!secret||req.headers.get("x-telegram-bot-api-secret-token")!==secret)return new Response("Unauthorized",{status:401});
  const cfg=await loadConfig(url); if(!cfg?.token)return new Response("Bot configuration missing",{status:503});
  const update=await req.json().catch(()=>({}));
  if(update.message){
    const chatId=update.message.chat.id,text=String(update.message.text||"").trim();
    if(text.startsWith("/ask ")){ const saved=await loadQuestion("",chatId); if(!saved?.q)return reply("sendMessage",{chat_id:chatId,text:"Open a question first with /start."}); context.waitUntil((async()=>{try{await telegram(cfg.token,"sendChatAction",{chat_id:chatId,action:"typing"});const ai=await tutor(saved.q,cfg,text.slice(5));await telegram(cfg.token,"sendMessage",{chat_id:chatId,text:explanation(saved.q,ai),parse_mode:"HTML"});}catch(e){await telegram(cfg.token,"sendMessage",{chat_id:chatId,text:`AI tutor error: ${String(e?.message||e)}`});}})()); return new Response("ok"); }
    const list=await subjects(),menu=subjectMenu(list,0); return reply("sendMessage",{chat_id:chatId,text: text.startsWith("/start")?menu.text:"Send /start to begin JAMB practice.",parse_mode:"HTML",reply_markup:menu.reply_markup});
  }
  if(update.callback_query){
    const cb=update.callback_query,chatId=cb.message?.chat?.id,messageId=cb.message?.message_id,data=String(cb.data||""); if(!chatId||!messageId||data==="noop")return Response.json({ok:true});
    if(data==="subjects"||data.startsWith("sp:")){ const p=data.startsWith("sp:")?Number(data.split(":")[1]):0,menu=subjectMenu(await subjects(),p); return reply("editMessageText",{chat_id:chatId,message_id:messageId,text:menu.text,parse_mode:"HTML",reply_markup:menu.reply_markup}); }
    if(data.startsWith("s:")){ const id=data.slice(2),list=await subjects(),s=list.find(x=>x.id===id); if(!s)return Response.json({ok:true}); const menu=yearMenu(s,await years(s.id),0); return reply("editMessageText",{chat_id:chatId,message_id:messageId,text:menu.text,parse_mode:"HTML",reply_markup:menu.reply_markup}); }
    if(data.startsWith("yp:")){ const [,id,p]=data.split(":"),list=await subjects(),s=list.find(x=>x.id===id); if(!s)return Response.json({ok:true}); const menu=yearMenu(s,await years(s.id),Number(p)); return reply("editMessageText",{chat_id:chatId,message_id:messageId,text:menu.text,parse_mode:"HTML",reply_markup:menu.reply_markup}); }
    if(data.startsWith("q:")){ const [,id,year]=data.split(":"),list=await subjects(),s=list.find(x=>x.id===id); if(!s)return Response.json({ok:true}); try{const pool=await questionPool(s,year),q=pick(pool,chatId,s.id,year),idq=await saveQuestion(chatId,s,year,q);if(q.imageUrl)return reply("sendPhoto",{chat_id:chatId,photo:q.imageUrl,caption:questionHtml(q).slice(0,950),parse_mode:"HTML",reply_markup:questionButtons(q,idq,s,year)});return reply("editMessageText",{chat_id:chatId,message_id:messageId,text:questionHtml(q),parse_mode:"HTML",reply_markup:questionButtons(q,idq,s,year)});}catch(e){return reply("sendMessage",{chat_id:chatId,text:`❌ ${String(e?.message||e)}`});} }
    if(data.startsWith("a:")){ const [,id,choice]=data.split(":"),saved=await loadQuestion(id,chatId); if(!saved?.q)return reply("sendMessage",{chat_id:chatId,text:"Question session expired. Send /start."}); const correct=String(saved.q.correctAnswer||"").toUpperCase(),ok=correct&&choice.toUpperCase()===correct; return reply("sendMessage",{chat_id:chatId,text:ok?`✅ Correct! ${choice.toUpperCase()}`:`❌ Incorrect. Correct answer: ${correct||"not set"}`,parse_mode:"HTML",reply_markup:resultButtons(id,saved.subject,saved.year)}); }
    if(data.startsWith("e:")||data.startsWith("v:")){ const mode=data[0],id=data.slice(2),saved=await loadQuestion(id,chatId); if(!saved?.q)return reply("sendMessage",{chat_id:chatId,text:"Question session expired."}); context.waitUntil((async()=>{try{await telegram(cfg.token,"sendChatAction",{chat_id:chatId,action:"typing"});const ai=await tutor(saved.q,cfg,"Explain this JAMB question clearly. Include a useful visual only when it materially helps.");if(mode==="v"){const img=visualUrl(ai);await telegram(cfg.token,img?"sendPhoto":"sendMessage",img?{chat_id:chatId,photo:img,caption:"🎨 Learning visual"}:{chat_id:chatId,text:"This question does not need a useful diagram."});}else await telegram(cfg.token,"sendMessage",{chat_id:chatId,text:explanation(saved.q,ai),parse_mode:"HTML"});}catch(e){await telegram(cfg.token,"sendMessage",{chat_id:chatId,text:`AI tutor error: ${String(e?.message||e)}`});}})()); return new Response("ok"); }
  }
  return Response.json({ok:true});
};

export const config={path:"/telegram-webhook"};
