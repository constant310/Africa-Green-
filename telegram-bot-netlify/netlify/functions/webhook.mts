function escapeHtml(value: unknown = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function telegramMethod(method: string, payload: Record<string, unknown>) {
  return new Response(JSON.stringify({ method, ...payload }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function subjectKeyboard() {
  const subjects = [
    ["English", "english-language"], ["Mathematics", "mathematics"],
    ["Physics", "physics"], ["Chemistry", "chemistry"],
    ["Biology", "biology"], ["Economics", "economics"],
    ["Government", "government"], ["Commerce", "commerce"],
  ];
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < subjects.length; i += 2) {
    rows.push(subjects.slice(i, i + 2).map(([text, subject]) => ({ text, callback_data: `subject:${subject}` })));
  }
  return { inline_keyboard: rows };
}

function optionEntries(options: unknown): Array<[string, string]> {
  if (Array.isArray(options)) {
    return options.slice(0, 5).map((value, index) => [String.fromCharCode(97 + index), String(value)]);
  }
  if (options && typeof options === "object") {
    return Object.entries(options as Record<string, unknown>)
      .filter(([key, value]) => /^[a-e]$/i.test(key) && value != null)
      .map(([key, value]) => [key.toLowerCase(), String(value)]);
  }
  return [];
}

async function getQuestion(subject: string, apiKey: string) {
  const url = new URL("https://dev.aloc.com.ng/api/v1/questions");
  url.searchParams.set("subject", subject);
  url.searchParams.set("examType", "jamb");
  url.searchParams.set("random", "true");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || body?.error || `ALOC returned ${response.status}`);
  const question = Array.isArray(body?.data) ? body.data[0] : body?.data;
  if (!question) throw new Error(`No JAMB question found for ${subject}`);
  return question;
}

function questionPayload(question: any, subject: string, chatId: number, messageId: number) {
  const entries = optionEntries(question.options);
  const correct = String(question.correctAnswer || question.answer || "").trim().toLowerCase();
  const title = subject.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const passage = question.hasPassage && question.section
    ? `<b>Passage</b>\n${escapeHtml(question.section)}\n\n`
    : "";
  const optionsText = entries.map(([letter, text]) => `<b>${letter.toUpperCase()}.</b> ${escapeHtml(text)}`).join("\n");
  const questionText = escapeHtml(question.text || question.question || "Question unavailable");
  let text = `<b>${escapeHtml(title)} — JAMB${question.year ? ` ${question.year}` : ""}</b>\n\n${passage}${questionText}\n\n${optionsText}\n\n<i>Powered by ALOC API</i>`;
  if (text.length > 4000) text = `${text.slice(0, 3900)}…\n\n<i>Powered by ALOC API</i>`;

  const answerButtons = entries.map(([letter]) => ({
    text: letter.toUpperCase(),
    callback_data: `answer:${subject}:${letter}:${correct}`,
  }));

  return {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        answerButtons,
        [{ text: "🔄 Another question", callback_data: `subject:${subject}` }],
        [{ text: "📚 Change subject", callback_data: "menu" }],
      ],
    },
  };
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const alocKey = url.searchParams.get("aloc") || "";
  const webhookSecret = url.searchParams.get("secret") || "";

  if (req.method === "GET") {
    return Response.json({ ok: true, service: "jamb123bot-webhook" });
  }
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!alocKey || !webhookSecret) return new Response("Webhook not configured", { status: 503 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update: any = await req.json();

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = String(update.message.text || "").trim();
      if (text === "/start" || text.startsWith("/start@")) {
        return telegramMethod("sendMessage", {
          chat_id: chatId,
          text: "🎓 <b>JAMB Practice Bot</b>\n\nChoose a subject. I’ll fetch a real JAMB question from ALOC.\n\n<i>Powered by ALOC API</i>",
          parse_mode: "HTML",
          reply_markup: subjectKeyboard(),
        });
      }
      return telegramMethod("sendMessage", {
        chat_id: chatId,
        text: "Send /start to choose a JAMB subject.",
        reply_markup: subjectKeyboard(),
      });
    }

    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message?.chat?.id;
      const messageId = callback.message?.message_id;
      const data = String(callback.data || "");
      if (!chatId || !messageId) return Response.json({ ok: true });

      if (data === "menu") {
        return telegramMethod("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "🎓 <b>Choose a JAMB subject</b>\n\n<i>Powered by ALOC API</i>",
          parse_mode: "HTML",
          reply_markup: subjectKeyboard(),
        });
      }

      if (data.startsWith("subject:")) {
        const subject = data.slice("subject:".length);
        try {
          const question = await getQuestion(subject, alocKey);
          return telegramMethod("editMessageText", questionPayload(question, subject, chatId, messageId));
        } catch (error: any) {
          return telegramMethod("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `❌ Could not fetch a question.\n\n${escapeHtml(error?.message || "Unknown error")}\n\nChoose another subject:`,
            parse_mode: "HTML",
            reply_markup: subjectKeyboard(),
          });
        }
      }

      if (data.startsWith("answer:")) {
        const [, subject, selected, correct] = data.split(":");
        const validCorrect = /^[a-e]$/i.test(correct || "");
        const isCorrect = validCorrect && selected === correct;
        const result = isCorrect
          ? `✅ <b>Correct!</b> You chose ${selected.toUpperCase()}.`
          : validCorrect
            ? `❌ <b>Incorrect.</b> You chose ${selected.toUpperCase()}. Correct answer: <b>${correct.toUpperCase()}</b>.`
            : `✅ Answer recorded: <b>${selected.toUpperCase()}</b>.`;
        return telegramMethod("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: `${result}\n\nWhat next?`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "➡️ Next question", callback_data: `subject:${subject}` }],
              [{ text: "📚 Change subject", callback_data: "menu" }],
            ],
          },
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("telegram webhook error", error);
    return Response.json({ ok: true });
  }
};

export const config = { path: "/telegram-webhook" };
