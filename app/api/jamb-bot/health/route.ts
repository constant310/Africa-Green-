import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = [
    !process.env.TELEGRAM_BOT_TOKEN ? "TELEGRAM_BOT_TOKEN" : null,
    !process.env.ALOC_API_KEY ? "ALOC_API_KEY" : null,
  ].filter(Boolean);

  return NextResponse.json({
    ok: true,
    service: "jamb-telegram-bot",
    bot: "@jamb123bot",
    configured: missing.length === 0,
    missing,
  });
}
