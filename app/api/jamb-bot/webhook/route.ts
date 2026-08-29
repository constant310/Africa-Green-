import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TG_BASE = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return `https://api.telegram.org/bot${token}`;
};

async function telegram(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`${TG_BASE()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) throw new Error(body?.description || `Telegram ${method} failed (${res.status})`);
  return body.result;
}

function subjectKeyboard() {
  const subjects = [
    ["English Language", "english"], ["Mathematics", "mathematics"],
    ["Physics", "physics"], ["Chemistry", "chemistry"],
    ["Biology", "biology"], ["Economics", "economics"],
    ["Government", "government"], ["Commerce", "commerce"],
  ];
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < subjects.length; i += 2) {
    rows.push(subjects.slice(i, i + 2).map(([text, value]) => ({ text, callback_data: `subject:${value}` })));
  }
  return { inline_keyboard: rows };
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function getQuestion(subject: string) {
  const key = process.env.ALOC_API_KEY;
  if (!key) throw new Error("ALOC_API_KEY is not configured");
  const url = new URL("https://dev.aloc.com.ng/api/v1/questions");
  url.searchParams.set("subject", subject);
  url.searchParams.set("examType", "jamb");
  url.searchParams.set("random", "true");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, {
    headers: { "X-API-Key": key, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || body?.error || `ALOC returned ${res.status}`);
  const question = Array.isArray(body?.data) ? body.data[0] : null;
  if (!question) throw new Error(`No JAMB question found for ${subject}`);
  return question;
}

function optionEntries(options: Record<string, unknown> | unknown[]) {
  if (Array.isArray(options)) return options.slice(0, 5).map((v, i) => [String.fromCharCode(97 + i), v] as const);
  return Object.entries(options || {}).filter(([k, v]) => /^[a-e]$/i.test(k) && v != null).map(([k, v]) => [k.toLowerCase(), v] as const);
}

async function sendQuestion(chatId: number, subject: string, messageId: number) {
  const q = await getQuestion(subject);
  const entries = optionEntries(q.options || {});
  const correct = String(q.correctAnswer || "").trim().toLowerCase();
  const title = subject.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const passage = q.hasPassage && q.section ? `<b>Passage</b>\n${escapeHtml(q.section)}\n\n` : "";
  const optionsText = entries.map(([letter, text]) => `<b>${letter.toUpperCase()}.</b> ${escapeHtml(text)}`).join("\n");
  const text = `<b>${escapeHtml(title)} — JAMB${q.year ? ` ${q.year}` : ""}</b>\n\n${passage}${escapeHtml(q.text)}\n\n${optionsText}`;
  const keyboard = {
    inline_keyboard: [
      entries.map(([letter]) => ({ text: letter.toUpperCase(), callback_data: `answer:${subject}:${letter}:${correct}` })),
      [{ text: "🔄 Another question", callback_data: `subject:${subject}` }],
    ],
  };
  await telegram("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup: keyboard });
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const received = req.headers.get("x-telegram-bot-api-secret-token");
      if (received !== expectedSecret) return NextResponse.json({ ok: false }, { status: 401 });
    }

    const update = await req.json();
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = String(update.message.text || "").trim();
      if (text === "/start" || text.startsWith("/start@")) {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: "🎓 <b>JAMB Practice Bot</b>\n\nChoose a subject and I will fetch a real JAMB question from ALOC.",
          parse_mode: "HTML",
          reply_markup: subjectKeyboard(),
        });
      } else {
        await telegram("sendMessage", { chat_id: chatId, text: "Use /start to choose a JAMB subject.", reply_markup: subjectKeyboard() });
      }
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      const data = String(cb.data || "");
      await telegram("answerCallbackQuery", { callback_query_id: cb.id });

      if (data.startsWith("subject:")) {
        const subject = data.slice("subject:".length);
        try {
          await telegram("editMessageText", { chat_id: chatId, message_id: messageId, text: `⏳ Fetching a ${escapeHtml(subject)} JAMB question from ALOC...`, parse_mode: "HTML" });
          await sendQuestion(chatId, subject, messageId);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error("question fetch failed", error);
          await telegram("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `❌ Could not fetch a question.\n\n${escapeHtml(message)}\n\nChoose another subject:`,
            parse_mode: "HTML",
            reply_markup: subjectKeyboard(),
          });
        }
      } else if (data.startsWith("answer:")) {
        const [, subject, selected, correct] = data.split(":");
        const text = selected === correct
          ? `✅ Correct — <b>${selected.toUpperCase()}</b>`
          : `❌ Incorrect. You chose <b>${selected.toUpperCase()}</b>. Correct answer: <b>${correct.toUpperCase()}</b>`;
        await telegram("sendMessage", {
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "➡️ Next question", callback_data: `subject:${subject}` }]] },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("webhook error", error);
    return NextResponse.json({ ok: true });
  }
}
