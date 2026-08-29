import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function telegram(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) throw new Error(body?.description || `Telegram ${method} failed (${res.status})`);
  return body.result;
}

export async function GET(req: NextRequest) {
  try {
    const webhookUrl = `${req.nextUrl.origin}/api/jamb-bot/webhook`;
    const payload: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    };
    if (process.env.TELEGRAM_WEBHOOK_SECRET) payload.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;

    const setWebhook = await telegram("setWebhook", payload);
    const info = await telegram("getWebhookInfo", {});
    return NextResponse.json({ ok: true, webhookUrl, setWebhook, info });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
