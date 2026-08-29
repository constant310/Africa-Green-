import { getStore } from "@netlify/blobs";

function configStore() { return getStore("jamb-bot-config", { consistency: "strong" }); }
async function telegram(token, method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(9000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body?.description || `${method} failed`);
  return body.result;
}
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function parseBundle(raw) {
  const lines = String(raw || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  let token = lines.find((x) => /^\d+:[A-Za-z0-9_-]+$/.test(x)) || "";
  let groq = lines.find((x) => x.startsWith("gsk_")) || "";
  let cfToken = lines.find((x) => x.startsWith("cfut_")) || "";
  let cfAccount = lines.find((x) => x !== token && x !== groq && x !== cfToken) || "";
  if ((!token || !groq || !cfAccount || !cfToken) && lines.length >= 4) {
    token ||= lines[0] || ""; groq ||= lines[1] || ""; cfAccount ||= lines[2] || ""; cfToken ||= lines[3] || "";
  }
  return { token, groq, cfAccount, cfToken };
}
function form(message = "") {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JAMB Bot Setup</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:30px auto;padding:0 14px;background:#fafafa;color:#171717}.card{background:#fff;border:1px solid #e5e5e5;border-radius:14px;padding:20px}textarea{width:100%;box-sizing:border-box;min-height:220px;padding:14px;border:2px solid #171717;border-radius:10px;font:15px ui-monospace,monospace;line-height:1.55}button{width:100%;padding:14px;margin-top:16px;border:0;border-radius:9px;background:#111;color:#fff;font-size:16px;font-weight:750}.msg,.order{padding:12px;border-radius:9px;background:#f2f2f2;margin-bottom:16px}.note{font-size:.92rem;color:#555}</style></head><body><div class="card"><h1>JAMB Bot Setup</h1>${message ? `<div class="msg">${message}</div>` : ""}<p>Questions now come directly from your Supabase <b>Exam Bank</b>. ALOC is no longer required.</p><div class="order"><b>Paste all 4 credentials in this order:</b><br>1. Telegram Bot Token<br>2. Groq API Key<br>3. Cloudflare Account ID<br>4. Cloudflare Workers AI API Token</div><form method="post" action="/setup"><textarea name="bundle" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste all four lines here"></textarea><button type="submit">Connect / Update Bot</button></form><p class="note">The values are submitted by POST and stored server-side. They are not committed into GitHub source.</p></div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
export default async (req) => {
  if (req.method === "GET") return form();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const data = await req.formData();
  const { token, groq, cfAccount, cfToken } = parseBundle(data.get("bundle"));
  if (!token || !groq || !cfAccount || !cfToken) return form("Paste all four credentials, one per line, in the displayed order.");
  try {
    const me = await telegram(token, "getMe");
    const url = new URL(req.url), secret = crypto.randomUUID().replaceAll("-", ""), configId = crypto.randomUUID().replaceAll("-", "");
    await configStore().setJSON(`cfg:${configId}`, { token, groq, cfAccount, cfToken, questionSource: "supabase-exam-bank", createdAt: new Date().toISOString() });
    const webhook = new URL("/telegram-webhook", url.origin); webhook.searchParams.set("cfg", configId); webhook.searchParams.set("secret", secret);
    await telegram(token, "setMyCommands", { commands: [{ command: "start", description: "Start JAMB practice" }, { command: "ask", description: "Ask AI about the current question" }, { command: "help", description: "Show bot help" }] });
    await telegram(token, "setWebhook", { url: webhook.toString(), secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
    const bot = me?.username ? `@${me.username}` : me?.first_name || "bot";
    return form(`<b>${escapeHtml(bot)}</b><br>Connected successfully.<br><b>Question source:</b> Supabase Exam Bank<br><b>Primary AI:</b> Groq Qwen3.8-27B<br><b>Fallback AI:</b> Cloudflare Gemma 4 26B`);
  } catch (error) { return form(`<b>Setup failed:</b> ${escapeHtml(error?.message || "Unknown error")}`); }
};
export const config = { path: "/setup" };
