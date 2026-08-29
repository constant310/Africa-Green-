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

function setupForm(message = "") {
  return new Response(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JAMB Bot Setup</title>
<style>body{font-family:system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 18px;line-height:1.5}input{width:100%;box-sizing:border-box;padding:12px;margin:6px 0 18px;border:1px solid #bbb;border-radius:8px}button{padding:12px 18px;border:0;border-radius:8px;background:#111;color:#fff;font-weight:700}code{word-break:break-all}.msg{padding:12px;border-radius:8px;background:#f2f2f2;margin-bottom:18px}</style></head>
<body><h1>JAMB Telegram Bot Setup</h1>${message ? `<div class="msg">${message}</div>` : ""}
<p>This one-time form registers the Netlify webhook with Telegram. The values are submitted by POST and are not placed in the page URL.</p>
<form method="post" action="/setup">
<label>Telegram Bot Token</label><input name="token" type="password" required autocomplete="off" placeholder="123456:AA...">
<label>ALOC API Key</label><input name="aloc" type="password" required autocomplete="off" placeholder="aloc_...">
<button type="submit">Connect Bot</button>
</form></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export default async (req: Request) => {
  if (req.method === "GET") return setupForm();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const form = await req.formData();
  const token = String(form.get("token") || "").trim();
  const aloc = String(form.get("aloc") || "").trim();
  if (!token || !aloc) return setupForm("Both values are required.");

  try {
    const url = new URL(req.url);
    const secret = crypto.randomUUID().replaceAll("-", "");
    const webhook = new URL("/telegram-webhook", url.origin);
    webhook.searchParams.set("aloc", aloc);
    webhook.searchParams.set("secret", secret);

    const me: any = await telegram(token, "getMe");
    await telegram(token, "setMyCommands", {
      commands: [{ command: "start", description: "Start JAMB practice" }],
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
    const error = info?.last_error_message ? `<br><b>Telegram error:</b> ${String(info.last_error_message)}` : "";
    return setupForm(`<b>${bot}</b><br>${status}${error}<br><br>Open Telegram and send <code>/start</code>.`);
  } catch (error: any) {
    return setupForm(`<b>Setup failed:</b> ${String(error?.message || "Unknown error")}`);
  }
};

export const config = { path: "/setup" };
