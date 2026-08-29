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

function fallbackSubjects() {
  return [
    ["Agriculture", "agriculture"],
    ["Arabic", "arabic"],
    ["Art", "art"],
    ["Biology", "biology"],
    ["Chemistry", "chemistry"],
    ["Christian Religious Studies", "christian-religious-studies"],
    ["Commerce", "commerce"],
    ["Economics", "economics"],
    ["French", "french"],
    ["Geography", "geography"],
    ["Government", "government"],
    ["Hausa", "hausa"],
    ["History", "history"],
    ["Home Economics", "home-economics"],
    ["Igbo", "igbo"],
    ["Islamic Studies", "islamic-studies"],
    ["Literature in English", "literature-in-english"],
    ["Mathematics", "mathematics"],
    ["Music", "music"],
    ["Physics", "physics"],
    ["Principles of Account", "principles-of-account"],
    ["Use of English", "english-language"],
    ["Yoruba", "yoruba"],
    ["Computer Studies", "computer-studies"],
    ["Physical & Health Education", "physical-and-health-education"],
  ].map(([displayName, name]) => ({ displayName, name }));
}

async function alocFetch(path: string, apiKey: string) {
  const response = await fetch(`https://dev.aloc.com.ng/api/v1${path}`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || body?.error || `ALOC returned ${response.status}`);
  return body;
}

async function getSubjects(apiKey: string) {
  try {
    const body = await alocFetch("/subjects", apiKey);
    const subjects = Array.isArray(body?.data) ? body.data : [];
    const jambSubjects = subjects
      .filter((subject: any) => !Array.isArray(subject?.examTypes) || subject.examTypes.includes("jamb"))
      .map((subject: any) => ({
        name: String(subject?.name || "").trim(),
        displayName: String(subject?.displayName || subject?.name || "").trim(),
      }))
      .filter((subject: any) => subject.name && subject.displayName)
      .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
    return jambSubjects.length ? jambSubjects : fallbackSubjects();
  } catch {
    return fallbackSubjects();
  }
}

function subjectMenu(subjects: Array<{ name: string; displayName: string }>, page = 0) {
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(subjects.length / pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const visible = subjects.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (let i = 0; i < visible.length; i += 2) {
    rows.push(visible.slice(i, i + 2).map((subject) => ({
      text: subject.displayName,
      callback_data: `s:${subject.name}`,
    })));
  }

  if (pageCount > 1) {
    const nav: Array<{ text: string; callback_data: string }> = [];
    if (safePage > 0) nav.push({ text: "⬅️ Previous", callback_data: `sp:${safePage - 1}` });
    nav.push({ text: `${safePage + 1}/${pageCount}`, callback_data: "noop" });
    if (safePage < pageCount - 1) nav.push({ text: "Next ➡️", callback_data: `sp:${safePage + 1}` });
    rows.push(nav);
  }

  return {
    text: `🎓 <b>JAMB Practice Bot</b>\n\nChoose a subject below.\n\n<b>${subjects.length} subjects available</b>\n<i>Questions powered by ALOC API</i>`,
    reply_markup: { inline_keyboard: rows },
  };
}

async function getYears(subject: string, apiKey: string) {
  try {
    const body = await alocFetch(`/subjects/${encodeURIComponent(subject)}/years`, apiKey);
    const years = (Array.isArray(body?.data) ? body.data : [])
      .filter((item: any) => {
        if (Number(item?.breakdown?.jamb || 0) > 0) return true;
        return Array.isArray(item?.examTypes) ? item.examTypes.includes("jamb") : true;
      })
      .map((item: any) => Number(item?.year))
      .filter((year: number) => Number.isInteger(year) && year > 1980 && year < 2100)
      .sort((a: number, b: number) => b - a);
    return [...new Set(years)];
  } catch {
    return [];
  }
}

function prettySubject(subject: string) {
  if (subject === "english-language") return "Use of English";
  return subject.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function yearMenu(subject: string, years: number[], page = 0) {
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(years.length / pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const visible = years.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rows: Array<Array<{ text: string; callback_data: string }>> = [
    [{ text: "🎯 Random question — any year", callback_data: `q:${subject}:any` }],
  ];

  for (let i = 0; i < visible.length; i += 3) {
    rows.push(visible.slice(i, i + 3).map((year) => ({
      text: String(year),
      callback_data: `q:${subject}:${year}`,
    })));
  }

  if (pageCount > 1) {
    const nav: Array<{ text: string; callback_data: string }> = [];
    if (safePage > 0) nav.push({ text: "⬅️", callback_data: `yp:${subject}:${safePage - 1}` });
    nav.push({ text: `${safePage + 1}/${pageCount}`, callback_data: "noop" });
    if (safePage < pageCount - 1) nav.push({ text: "➡️", callback_data: `yp:${subject}:${safePage + 1}` });
    rows.push(nav);
  }

  rows.push([{ text: "📚 All subjects", callback_data: "subjects" }]);

  return {
    text: `📘 <b>${escapeHtml(prettySubject(subject))}</b>\n\nChoose a JAMB year, or use a random question from any available year.${years.length ? `\n\n${years.length} years available.` : "\n\nYear catalogue unavailable, but random practice can still work."}`,
    reply_markup: { inline_keyboard: rows },
  };
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

async function getQuestion(subject: string, year: string, apiKey: string) {
  const params = new URLSearchParams({
    subject,
    examType: "jamb",
    random: "true",
    limit: "1",
  });
  if (year !== "any") params.set("year", year);
  const body = await alocFetch(`/questions?${params.toString()}`, apiKey);
  const question = Array.isArray(body?.data) ? body.data[0] : body?.data;
  if (!question) throw new Error(`No JAMB question found for ${prettySubject(subject)}${year !== "any" ? ` in ${year}` : ""}`);
  return question;
}

function questionPayload(question: any, subject: string, yearToken: string, chatId: number, messageId: number) {
  const entries = optionEntries(question.options);
  const correct = String(question.correctAnswer || question.answer || "").trim().toLowerCase();
  const title = String(question.subject || prettySubject(subject));
  const passage = question.hasPassage && question.section
    ? `<b>Passage</b>\n${escapeHtml(question.section)}\n\n`
    : "";
  const optionsText = entries.map(([letter, text]) => `<b>${letter.toUpperCase()}.</b> ${escapeHtml(text)}`).join("\n");
  const questionText = escapeHtml(question.text || question.question || "Question unavailable");
  let text = `<b>${escapeHtml(title)} — JAMB${question.year ? ` ${question.year}` : ""}</b>\n\n${passage}${questionText}\n\n${optionsText}\n\n<i>Powered by ALOC API</i>`;
  if (text.length > 4000) text = `${text.slice(0, 3900)}…\n\n<i>Powered by ALOC API</i>`;

  const answerButtons = entries.map(([letter]) => ({
    text: letter.toUpperCase(),
    callback_data: `a:${subject}:${yearToken}:${letter}:${correct}`,
  }));

  return {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        answerButtons,
        [{ text: "🔄 Another question", callback_data: `q:${subject}:${yearToken}` }],
        [{ text: "📅 Change year", callback_data: `s:${subject}` }],
        [{ text: "📚 Change subject", callback_data: "subjects" }],
      ],
    },
  };
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const alocKey = url.searchParams.get("aloc") || "";
  const webhookSecret = url.searchParams.get("secret") || "";

  if (req.method === "GET") {
    return Response.json({ ok: true, service: "jamb123bot-webhook", version: "subjects-years-v2" });
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
      const subjects = await getSubjects(alocKey);
      const menu = subjectMenu(subjects, 0);
      if (text === "/start" || text.startsWith("/start@")) {
        return telegramMethod("sendMessage", {
          chat_id: chatId,
          text: menu.text,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup,
        });
      }
      return telegramMethod("sendMessage", {
        chat_id: chatId,
        text: "Send /start or choose a JAMB subject below.",
        reply_markup: menu.reply_markup,
      });
    }

    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message?.chat?.id;
      const messageId = callback.message?.message_id;
      const data = String(callback.data || "");
      if (!chatId || !messageId) return Response.json({ ok: true });
      if (data === "noop") return Response.json({ ok: true });

      if (data === "subjects" || data.startsWith("sp:")) {
        const page = data.startsWith("sp:") ? Number(data.split(":")[1] || 0) : 0;
        const subjects = await getSubjects(alocKey);
        const menu = subjectMenu(subjects, Number.isFinite(page) ? page : 0);
        return telegramMethod("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup,
        });
      }

      if (data.startsWith("s:")) {
        const subject = data.slice(2);
        const years = await getYears(subject, alocKey);
        const menu = yearMenu(subject, years, 0);
        return telegramMethod("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup,
        });
      }

      if (data.startsWith("yp:")) {
        const [, subject, pageText] = data.split(":");
        const years = await getYears(subject, alocKey);
        const menu = yearMenu(subject, years, Number(pageText || 0));
        return telegramMethod("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup,
        });
      }

      if (data.startsWith("q:")) {
        const [, subject, yearToken = "any"] = data.split(":");
        try {
          const question = await getQuestion(subject, yearToken, alocKey);
          return telegramMethod("editMessageText", questionPayload(question, subject, yearToken, chatId, messageId));
        } catch (error: any) {
          const years = await getYears(subject, alocKey);
          const menu = yearMenu(subject, years, 0);
          return telegramMethod("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `❌ <b>Could not fetch that question.</b>\n\n${escapeHtml(error?.message || "Unknown error")}\n\nTry another year or use random practice.`,
            parse_mode: "HTML",
            reply_markup: menu.reply_markup,
          });
        }
      }

      if (data.startsWith("a:")) {
        const [, subject, yearToken, selected, correct] = data.split(":");
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
              [{ text: "➡️ Next question", callback_data: `q:${subject}:${yearToken}` }],
              [{ text: "📅 Change year", callback_data: `s:${subject}` }],
              [{ text: "📚 Change subject", callback_data: "subjects" }],
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
