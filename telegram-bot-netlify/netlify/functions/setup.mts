async function telegram(token: string, method: string, payload: Record<string, unknown> = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body?.description || `${method} failed`);
  return body.result;
}

function escapeHtml(value: unknown = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function setupForm(message = "") {
  return new Response(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JAMB Bot Setup</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 18px;line-height:1.5}input{width:100%;box-sizing:border-box;padding:12px;margin:6px 0 18px;border:1px solid #bbb;border-radius:8px}button{padding:12px 18px;border:0;border-radius:8px;background:#111;color:#fff;font-weight:700}code{word-break:break-all}.msg{padding:12px;border-radius:8px;background:#f2f2f2;margin-bottom:18px}.note{font-size:.92rem;color:#555}</style></head>
<body><h1>JAMB Telegram Bot Setup</h1>${message ? `<div class="msg">${message}</div>` : ""}
<p>This form registers the Netlify webhook with Telegram and enables ALOC-powered practice.</p>
<form method="post" action="/setup">
<label>Telegram Bot Token</label><input name="token" type="password" required autocomplete="off" placeholder="123456:AA...">
<label>ALOC API Key</label><input name="aloc" type="password" required autocomplete="off" placeholder="aloc_...">
<label>OpenRouter API Key <small>(optional, required for Qwen AI Tutor)</small></label><input name="ai" type="password" autocomplete="off" placeholder="sk-or-v1-...">
<p class="note">AI model: Qwen3.5-27B. If the OpenRouter key is left blank, normal JAMB practice still works; AI explanation and visualization buttons will tell you AI is not configured.</p>
<button type="submit">Connect / Update Bot</button>
</form></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export default async (req: Request) => {
  if (req.method === "GET") return setupForm();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const form = await req.formData();
  const token = String(form.get("token") || "").trim();
  const aloc = String(form.get("aloc") || "").trim();
  const ai = String(form.get("ai") || "").trim();
  if (!token || !aloc) return setupForm("Telegram token and ALOC key are required.");

  try {
    const url = new URL(req.url);
    const secret = crypto.randomUUID().replaceAll("-", "");
    const webhook = new URL("/telegram-webhook", url.origin);
    webhook.searchParams.set("aloc", aloc);
    webhook.searchParams.set("secret", secret);
    if (ai) webhook.searchParams.set("ai", ai);

    const me: any = await telegram(token, "getMe");
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
    const info: any = await telegram(token, "getWebhookInfo");
    const bot = me?.username ? `@${me.username}` : me?.first_name || "bot";
    const status = Boolean(info?.url) ? "Webhook connected successfully." : "Telegram did not confirm the webhook.";
    const error = info?.last_error_message ? `<br><b>Telegram error:</b> ${escapeHtml(info.last_error_message)}` : "";
    const aiStatus = ai ? "Qwen3.5-27B AI Tutor: enabled." : "Qwen3.5-27B AI Tutor: not configured yet.";
    return setupForm(`<b>${escapeHtml(bot)}</b><br>${status}<br>${aiStatus}${error}<br><br>Open Telegram and send <code>/start</code>.`);
  } catch (error: any) {
    return setupForm(`<b>Setup failed:</b> ${escapeHtml(error?.message || "Unknown error")}`);
  }
};

export const config = { path: "/setup" };
