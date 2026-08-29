import { getStore } from "@netlify/blobs";

function configStore() {
  return getStore("jamb-bot-config", { consistency: "strong" });
}

async function telegram(token, method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(9000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body?.description || `${method} failed`);
  return body.result;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function checkAloc(apiKey) {
  const response = await fetch("https://dev.aloc.com.ng/api/v1/subjects", {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`ALOC returned ${response.status}`);
}

async function checkGroq(apiKey) {
  if (!apiKey) return "not configured";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: "Reply with OK only." }],
      max_completion_tokens: 4,
      reasoning_effort: "none",
      temperature: 0,
    }),
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Groq returned ${response.status}`);
  }
  return "connected";
}

async function checkCloudflare(accountId, apiToken) {
  if (!accountId && !apiToken) return "not configured";
  if (!accountId || !apiToken) throw new Error("Both Cloudflare Account ID and API token are required.");
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/google/gemma-4-26b-a4b-it`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Reply with OK only." }],
        max_tokens: 4,
      }),
      signal: AbortSignal.timeout(12000),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(body?.errors?.[0]?.message || `Cloudflare returned ${response.status}`);
  }
  return "connected";
}

function parseAiBundle(raw) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return { groq: "", cfAccount: "", cfToken: "" };

  let groq = lines.find((line) => line.startsWith("gsk_")) || "";
  let cfToken = lines.find((line) => line.startsWith("cfut_")) || "";
  let cfAccount = lines.find((line) => line !== groq && line !== cfToken) || "";

  if ((!groq || !cfAccount || !cfToken) && lines.length >= 3) {
    groq ||= lines[0] || "";
    cfAccount ||= lines[1] || "";
    cfToken ||= lines[2] || "";
  }

  return { groq, cfAccount, cfToken };
}

function setupForm(message = "") {
  return new Response(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>JAMB Bot Setup</title>
<style>
body{font-family:system-ui,sans-serif;max-width:760px;margin:28px auto;padding:0 14px;line-height:1.5;background:#fafafa;color:#171717}
.card{background:#fff;border:1px solid #e5e5e5;border-radius:14px;padding:20px;box-shadow:0 6px 24px rgba(0,0,0,.05)}
input,textarea{width:100%;box-sizing:border-box;padding:13px;margin:6px 0 18px;border:1px solid #bbb;border-radius:9px;font-size:16px;background:#fff}
textarea{min-height:150px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.55}
button{width:100%;padding:14px 19px;border:0;border-radius:9px;background:#111;color:#fff;font-weight:750;font-size:16px}
code{word-break:break-all}.msg{padding:13px;border-radius:9px;background:#f2f2f2;margin-bottom:18px}.note{font-size:.92rem;color:#555}.paste{border:2px solid #171717;border-radius:12px;padding:16px;margin:20px 0;background:#f8f8f8}.order{font-size:.9rem;background:#fff;padding:10px 12px;border-radius:8px;border:1px solid #ddd}h1{margin-top:0;font-size:1.55rem}h2{font-size:1.05rem;margin:0 0 4px}
</style>
</head>
<body><div class="card">
<h1>JAMB Telegram Bot Setup</h1>
${message ? `<div class="msg">${message}</div>` : ""}
<p>Enter your Telegram and ALOC credentials, then paste all three AI credentials from your clipboard into one box.</p>
<form method="post" action="/setup">
<label>Telegram Bot Token</label>
<input name="token" type="password" required autocomplete="off" placeholder="Paste Telegram bot token">

<label>ALOC API Key</label>
<input name="aloc" type="password" required autocomplete="off" placeholder="Paste ALOC API key">

<div class="paste">
<h2>📋 Paste all 3 AI credentials here</h2>
<p class="note">Long-press the box on your phone and tap <b>Paste</b>. Paste the three lines together exactly as they are in your clipboard.</p>
<div class="order">Line 1: Groq API key<br>Line 2: Cloudflare Account ID<br>Line 3: Cloudflare Workers AI API token</div>
<textarea name="ai_bundle" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste all three lines here"></textarea>
<p class="note">The server automatically identifies the Groq key and Cloudflare token by their prefixes, so extra spaces or line breaks are okay.</p>
</div>

<button type="submit">Connect / Update Bot</button>
<p class="note">Credentials are submitted by POST and stored server-side. They are not written into GitHub source code.</p>
</form>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export default async (req) => {
  if (req.method === "GET") return setupForm();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const form = await req.formData();
  const token = String(form.get("token") || "").trim();
  const aloc = String(form.get("aloc") || "").trim();
  const { groq, cfAccount, cfToken } = parseAiBundle(form.get("ai_bundle"));

  if (!token || !aloc) return setupForm("Telegram token and ALOC key are required.");
  if (!groq || !cfAccount || !cfToken) {
    return setupForm("Paste all three AI credentials into the large box: Groq key, Cloudflare Account ID, and Cloudflare Workers AI token.");
  }

  try {
    const url = new URL(req.url);
    const secret = crypto.randomUUID().replaceAll("-", "");
    const configId = crypto.randomUUID().replaceAll("-", "");

    const me = await telegram(token, "getMe");
    await checkAloc(aloc);

    const checks = await Promise.allSettled([
      checkGroq(groq),
      checkCloudflare(cfAccount, cfToken),
    ]);

    await configStore().setJSON(`cfg:${configId}`, {
      token,
      aloc,
      groq,
      cfAccount,
      cfToken,
      createdAt: new Date().toISOString(),
    });

    const webhook = new URL("/telegram-webhook", url.origin);
    webhook.searchParams.set("cfg", configId);
    webhook.searchParams.set("secret", secret);

    await telegram(token, "setMyCommands", {
      commands: [
        { command: "start", description: "Start JAMB practice" },
        { command: "ask", description: "Ask the AI tutor about the current question" },
        { command: "help", description: "Show bot help" },
      ],
    });

    await telegram(token, "setWebhook", {
      url: webhook.toString(),
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });

    const info = await telegram(token, "getWebhookInfo");
    const bot = me?.username ? `@${me.username}` : me?.first_name || "bot";
    const webhookStatus = Boolean(info?.url) ? "Webhook connected successfully." : "Telegram did not confirm the webhook.";
    const telegramError = info?.last_error_message ? `<br><b>Telegram error:</b> ${escapeHtml(info.last_error_message)}` : "";

    const groqStatus = checks[0].status === "fulfilled"
      ? String(checks[0].value)
      : `warning: ${escapeHtml(checks[0].reason?.message || "connection failed")}`;
    const cfStatus = checks[1].status === "fulfilled"
      ? String(checks[1].value)
      : `warning: ${escapeHtml(checks[1].reason?.message || "connection failed")}`;

    return setupForm(
      `<b>${escapeHtml(bot)}</b><br>${webhookStatus}${telegramError}<br><br>` +
      `<b>ALOC:</b> connected<br>` +
      `<b>Groq Qwen3.8-27B:</b> ${groqStatus}<br>` +
      `<b>Cloudflare Gemma 4 26B:</b> ${cfStatus}<br><br>` +
      `Open Telegram and send <code>/start</code>.`,
    );
  } catch (error) {
    return setupForm(`<b>Setup failed:</b> ${escapeHtml(error?.message || "Unknown error")}`);
  }
};

export const config = { path: "/setup" };
