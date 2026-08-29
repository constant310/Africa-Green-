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

export default async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const aloc = url.searchParams.get("aloc") || "";
  if (!token || !aloc) {
    return Response.json({ ok: false, error: "token and aloc query parameters are required" }, { status: 400 });
  }

  try {
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

    return Response.json({
      ok: true,
      bot: me?.username ? `@${me.username}` : me?.first_name,
      webhookConfigured: Boolean(info?.url),
      pendingUpdateCount: info?.pending_update_count ?? 0,
      lastErrorMessage: info?.last_error_message ?? null,
      webhookPath: "/telegram-webhook",
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "Setup failed" }, { status: 500 });
  }
};

export const config = { path: "/setup" };
