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

function parseAllCredentials(raw) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 5) {
    return { token: "", aloc: "", groq: "", cfAccount: "", cfToken: "", count: lines.length };
  }

  const [token, aloc, groq, cfAccount, cfToken] = lines;
  return { token, aloc, groq, cfAccount, cfToken, count: lines.length };
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
textarea{width:100%;box-sizing:border-box;padding:14px;margin:8px 0 18px;border:2px solid #171717;border-radius:11px;font-size:16px;background:#fff;min-height:250px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.65}
button{width:100%;padding:15px 19px;border:0;border-radius:9px;background:#111;color:#fff;font-weight:750;font-size:16px}
code{word-break:break-all}.msg{padding:13px;border-radius:9px;background:#f2f2f2;margin-bottom:18px}.note{font-size:.92rem;color:#555}.order{font-size:.93rem;background:#f5f5f5;padding:14px;border-radius:10px;border:1px solid #ddd;margin:14px 0}.order b{display:inline-block;min-width:58px}h1{margin-top:0;font-size:1.55rem}
</style>
</head>
<body><div class="card">
<h1>JAMB Telegram Bot Setup</h1>
${message ? `<div class="msg">${message}</div>` : ""}
<p><b>Paste all 5 credentials into the single box below.</b> Put one credential on each line in this exact order.</p>
<div class="order">
<b>Line 1</b> Telegram Bot Token<br>
<b>Line 2</b> ALOC API Key<br>
<b>Line 3</b> Groq API Key<br>
<b>Line 4</b> Cloudflare Account ID<br>
<b>Line 5</b> Cloudflare Workers AI API Token
</div>
<form method="post" action="/setup">
<textarea name="all_credentials" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Telegram Bot Token\nALOC API Key\nGroq API Key\nCloudflare Account ID\nCloudflare Workers AI API Token"></textarea>
<button type="submit">Connect Everything</button>
<p class="note">Long-press the box on your phone and tap <b>Paste</b>. The server reads the five non-empty lines in order. Credentials are submitted by POST and are not written into GitHub source code.</p>
</form>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export default async (req) => {
  if (req.method === "GET") return setupForm();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const form = await req.formData();
  const parsed = parseAllCredentials(form.get("all_credentials"));
  const { token, aloc, groq, cfAccount, cfToken } = parsed;

  if (!token || !aloc || !groq || !cfAccount || !cfToken) {
    return setupForm(`I found ${parsed.count} non-empty line(s). Paste all 5 credentials, one per line, in the exact order shown.`);
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
      `Everything has been submitted. Open Telegram and send <code>/start</code>.`,
    );
  } catch (error) {
    return setupForm(`<b>Setup failed:</b> ${escapeHtml(error?.message || "Unknown error")}`);
  }
};

export const config = { path: "/setup" };
