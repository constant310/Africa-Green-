import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function telegramMethod(method, payload) {
  return new Response(JSON.stringify({ method, ...payload }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function cacheStore() {
  return getStore({ name: "jamb-bot-cache", consistency: "strong" });
}

async function cacheGet(key) {
  try {
    const value = await cacheStore().get(key, { type: "json" });
    if (!value || Number(value.expiresAt || 0) < Date.now()) return null;
    return value.value;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlMs) {
  try {
    await cacheStore().setJSON(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  } catch {
    // Cache failure must never break question delivery.
  }
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

async function alocFetch(path, apiKey, init = {}) {
  const response = await fetch(`https://dev.aloc.com.ng/api/v1${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `ALOC returned ${response.status}`);
  }
  return body;
}

async function getSubjects(apiKey) {
  const cached = await cacheGet("subjects:v3");
  if (Array.isArray(cached) && cached.length) return cached;
  try {
    const body = await alocFetch("/subjects", apiKey);
    const subjects = Array.isArray(body?.data) ? body.data : [];
    const jambSubjects = subjects
      .filter((subject) => !Array.isArray(subject?.examTypes) || subject.examTypes.includes("jamb"))
      .map((subject) => ({
        name: String(subject?.name || "").trim(),
        displayName: String(subject?.displayName || subject?.name || "").trim(),
      }))
      .filter((subject) => subject.name && subject.displayName)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    const result = jambSubjects.length ? jambSubjects : fallbackSubjects();
    await cacheSet("subjects:v3", result, 12 * 60 * 60 * 1000);
    return result;
  } catch {
    return fallbackSubjects();
  }
}

function subjectMenu(subjects, page = 0) {
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(subjects.length / pageSize));
  const safePage = Math.min(Math.max(0, Number(page) || 0), pageCount - 1);
  const visible = subjects.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rows = [];
  for (let i = 0; i < visible.length; i += 2) {
    rows.push(
      visible.slice(i, i + 2).map((subject) => ({
        text: subject.displayName,
        callback_data: `s:${subject.name}`,
      })),
    );
  }
  if (pageCount > 1) {
    const nav = [];
    if (safePage > 0) nav.push({ text: "⬅️ Previous", callback_data: `sp:${safePage - 1}` });
    nav.push({ text: `${safePage + 1}/${pageCount}`, callback_data: "noop" });
    if (safePage < pageCount - 1) nav.push({ text: "Next ➡️", callback_data: `sp:${safePage + 1}` });
    rows.push(nav);
  }
  return {
    text:
      `🎓 <b>JAMB Practice Bot</b>\n\n` +
      `Choose a subject below.\n\n` +
      `<b>${subjects.length} subjects available</b>\n` +
      `⚡ Fast practice cache enabled\n` +
      `<i>Questions powered by ALOC API</i>`,
    reply_markup: { inline_keyboard: rows },
  };
}

async function getYears(subject, apiKey) {
  const cacheKey = `years:${subject}`;
  const cached = await cacheGet(cacheKey);
  if (Array.isArray(cached)) return cached;
  try {
    const body = await alocFetch(`/subjects/${encodeURIComponent(subject)}/years`, apiKey);
    const years = (Array.isArray(body?.data) ? body.data : [])
      .filter((item) => {
        if (Number(item?.breakdown?.jamb || 0) > 0) return true;
        return Array.isArray(item?.examTypes) ? item.examTypes.includes("jamb") : true;
      })
      .map((item) => Number(item?.year))
      .filter((year) => Number.isInteger(year) && year > 1980 && year < 2100)
      .sort((a, b) => b - a);
    const unique = [...new Set(years)];
    await cacheSet(cacheKey, unique, 12 * 60 * 60 * 1000);
    return unique;
  } catch {
    return [];
  }
}

function prettySubject(subject) {
  if (subject === "english-language") return "Use of English";
  return String(subject || "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function yearMenu(subject, years, page = 0) {
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(years.length / pageSize));
  const safePage = Math.min(Math.max(0, Number(page) || 0), pageCount - 1);
  const visible = years.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rows = [[{ text: "🎯 Random question — any year", callback_data: `q:${subject}:any` }]];
  for (let i = 0; i < visible.length; i += 3) {
    rows.push(
      visible.slice(i, i + 3).map((year) => ({
        text: String(year),
        callback_data: `q:${subject}:${year}`,
      })),
    );
  }
  if (pageCount > 1) {
    const nav = [];
    if (safePage > 0) nav.push({ text: "⬅️", callback_data: `yp:${subject}:${safePage - 1}` });
    nav.push({ text: `${safePage + 1}/${pageCount}`, callback_data: "noop" });
    if (safePage < pageCount - 1) nav.push({ text: "➡️", callback_data: `yp:${subject}:${safePage + 1}` });
    rows.push(nav);
  }
  rows.push([{ text: "📚 All subjects", callback_data: "subjects" }]);
  return {
    text:
      `📘 <b>${escapeHtml(prettySubject(subject))}</b>\n\n` +
      `Choose a JAMB year, or use a random question from any available year.` +
      (years.length ? `\n\n${years.length} years available.` : `\n\nYear catalogue unavailable, but random practice can still work.`),
    reply_markup: { inline_keyboard: rows },
  };
}

function optionEntries(options) {
  if (Array.isArray(options)) {
    return options.slice(0, 5).map((value, index) => [String.fromCharCode(97 + index), String(value)]);
  }
  if (options && typeof options === "object") {
    return Object.entries(options)
      .filter(([key, value]) => /^[a-e]$/i.test(key) && value != null)
      .map(([key, value]) => [key.toLowerCase(), String(value)]);
  }
  return [];
}

function extractImageUrl(question) {
  const candidates = [
    question?.imageUrl,
    question?.questionImageUrl,
    question?.diagramUrl,
    question?.image,
    question?.diagram,
    question?.media?.url,
    question?.media?.imageUrl,
    question?.assets?.diagram,
    question?.assets?.image,
  ];
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
    } catch {
      // ignore malformed values
    }
  }
  return "";
}

function extractLatex(question) {
  const explicit = [question?.latex, question?.equation, question?.formula, question?.mathLatex];
  for (const value of explicit) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const text = String(question?.text || question?.question || "");
  const patterns = [
    /\$\$([^$]{2,500})\$\$/,
    /\$([^$\n]{2,500})\$/,
    /\\\[([\s\S]{2,500}?)\\\]/,
    /\\\(([\s\S]{2,500}?)\\\)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function questionIdentity(question) {
  if (question?.id) return String(question.id);
  return createHash("sha256")
    .update(`${question?.subject || ""}|${question?.year || ""}|${question?.text || question?.question || ""}`)
    .digest("hex")
    .slice(0, 32);
}

async function fetchQuestionBatch(subject, year, apiKey) {
  const params = new URLSearchParams({
    subject,
    examType: "jamb",
    random: "true",
    limit: "10",
  });
  if (year !== "any") params.set("year", year);
  const body = await alocFetch(`/questions?${params.toString()}`, apiKey);
  const questions = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
  if (!questions.length) {
    throw new Error(`No JAMB question found for ${prettySubject(subject)}${year !== "any" ? ` in ${year}` : ""}`);
  }
  return questions;
}

async function nextQuestion(chatId, subject, year, apiKey) {
  const sessionKey = `batch:${chatId}:${subject}:${year}`;
  let session = await cacheGet(sessionKey);

  if (!session || !Array.isArray(session.questions) || session.index >= session.questions.length) {
    const questions = await fetchQuestionBatch(subject, year, apiKey);
    session = { questions, index: 0 };
  }

  const question = session.questions[session.index];
  session.index += 1;
  await cacheSet(sessionKey, session, 30 * 60 * 1000);
  await cacheSet(`last:${chatId}`, { question, subject, year }, 60 * 60 * 1000);
  return question;
}

async function lastQuestion(chatId) {
  return cacheGet(`last:${chatId}`);
}

function questionButtons(subject, year, entries, question) {
  const rows = [
    entries.map(([letter]) => ({
      text: letter.toUpperCase(),
      callback_data: `ans:${letter}`,
    })),
  ];
  if (extractLatex(question)) {
    rows.push([{ text: "🧮 Render maths", callback_data: "mathview" }]);
  }
  rows.push([
    { text: "💡 Explain", callback_data: "explain" },
    { text: "🎨 Diagram / Graph", callback_data: "visualize" },
  ]);
  rows.push([{ text: "🤖 Ask AI Tutor", callback_data: "askhelp" }]);
  rows.push([{ text: "➡️ Next question", callback_data: `q:${subject}:${year}` }]);
  rows.push([
    { text: "📅 Change year", callback_data: `s:${subject}` },
    { text: "📚 Subjects", callback_data: "subjects" },
  ]);
  return { inline_keyboard: rows };
}

function questionHtml(question, subject) {
  const entries = optionEntries(question?.options);
  const title = String(question?.subject || prettySubject(subject));
  const passage = question?.hasPassage && question?.section
    ? `<b>Passage</b>\n${escapeHtml(question.section)}\n\n`
    : "";
  const optionsText = entries
    .map(([letter, text]) => `<b>${letter.toUpperCase()}.</b> ${escapeHtml(text)}`)
    .join("\n");
  const questionText = escapeHtml(question?.text || question?.question || "Question unavailable");
  const diagram = extractImageUrl(question);
  const diagramLink = diagram ? `\n\n🖼 <a href="${escapeHtml(diagram)}">Open question diagram</a>` : "";
  let text =
    `<b>${escapeHtml(title)} — JAMB${question?.year ? ` ${question.year}` : ""}</b>\n\n` +
    `${passage}${questionText}\n\n${optionsText}${diagramLink}\n\n<i>Powered by ALOC API</i>`;
  if (text.length > 3900) text = `${text.slice(0, 3800)}…\n\n<i>Powered by ALOC API</i>`;
  return { text, entries };
}

function renderQuestion(question, subject, year, callback) {
  const { text, entries } = questionHtml(question, subject);
  const reply_markup = questionButtons(subject, year, entries, question);
  const imageUrl = extractImageUrl(question);

  if (imageUrl && text.length <= 950) {
    return telegramMethod("sendPhoto", {
      chat_id: callback.message.chat.id,
      photo: imageUrl,
      caption: text,
      parse_mode: "HTML",
      reply_markup,
    });
  }

  if (callback?.message?.photo) {
    return telegramMethod("sendMessage", {
      chat_id: callback.message.chat.id,
      text,
      parse_mode: "HTML",
      reply_markup,
      disable_web_page_preview: false,
    });
  }

  return telegramMethod("editMessageText", {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
    text,
    parse_mode: "HTML",
    reply_markup,
    disable_web_page_preview: false,
  });
}

function officialAnswer(question) {
  return String(question?.correctAnswer || question?.answer || "").trim().toLowerCase();
}

function resultButtons(subject, year) {
  return {
    inline_keyboard: [
      [
        { text: "💡 Explain", callback_data: "explain" },
        { text: "🎨 Visualize", callback_data: "visualize" },
      ],
      [{ text: "🤖 Ask AI Tutor", callback_data: "askhelp" }],
      [{ text: "➡️ Next question", callback_data: `q:${subject}:${year}` }],
      [
        { text: "📅 Change year", callback_data: `s:${subject}` },
        { text: "📚 Subjects", callback_data: "subjects" },
      ],
    ],
  };
}

function editCurrent(callback, text, reply_markup) {
  const common = {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
    parse_mode: "HTML",
    reply_markup,
  };
  if (callback.message.photo) {
    const base = String(callback.message.caption || "");
    const combined = `${base}\n\n${text}`;
    return telegramMethod("editMessageCaption", {
      ...common,
      caption: combined.length <= 1000 ? combined : text,
    });
  }
  const base = String(callback.message.text || "");
  const combined = `${base}\n\n${text}`;
  return telegramMethod("editMessageText", {
    ...common,
    text: combined.length <= 3900 ? combined : text,
    disable_web_page_preview: false,
  });
}

function buildTutorPrompt(question, userInstruction) {
  const entries = optionEntries(question?.options);
  const options = entries.map(([letter, text]) => `${letter.toUpperCase()}. ${text}`).join("\n");
  return [
    "You are an expert Nigerian JAMB/UTME tutor.",
    "Solve the question independently. Do not assume any provided answer key is correct.",
    "Give concise pedagogical solution steps, not hidden chain-of-thought.",
    "For Mathematics/Physics/Chemistry, use correct formulas and put the most useful formula in key_latex.",
    "When a diagram or graph materially helps, return either valid Mermaid code or valid Vega JSON in visualization_code.",
    "Use visualization_kind='none' if a visual would not help.",
    "Never invent a diagram that changes the facts in the question.",
    "",
    `Subject: ${question?.subject || ""}`,
    `Year: ${question?.year || ""}`,
    `Question: ${question?.text || question?.question || ""}`,
    `Options:\n${options}`,
    "",
    `Student request: ${userInstruction || "Explain the correct answer clearly."}`,
  ].join("\n");
}

async function aiTutor(question, aiKey, userInstruction) {
  if (!aiKey) throw new Error("AI tutor is not configured. Add an OpenRouter API key on the bot setup page.");

  const prompt = buildTutorPrompt(question, userInstruction);
  const imageUrl = extractImageUrl(question);
  const content = imageUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ]
    : prompt;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://jamb123bot-backend.netlify.app",
      "X-Title": "JAMB123Bot",
    },
    body: JSON.stringify({
      model: "qwen/qwen3.5-27b:nitro",
      messages: [
        {
          role: "system",
          content:
            "Return only the requested structured JSON. Be accurate, concise, exam-focused, and safe for students.",
        },
        { role: "user", content },
      ],
      temperature: 0.1,
      max_tokens: 900,
      provider: { sort: "throughput", allow_fallbacks: true },
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "jamb_tutor",
          strict: true,
          schema: {
            type: "object",
            properties: {
              answer: { type: "string", enum: ["A", "B", "C", "D", "E"] },
              explanation: { type: "string" },
              steps: {
                type: "array",
                items: { type: "string" },
                maxItems: 6,
              },
              key_latex: { type: "string" },
              visualization_kind: {
                type: "string",
                enum: ["none", "mermaid", "vega"],
              },
              visualization_code: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: [
              "answer",
              "explanation",
              "steps",
              "key_latex",
              "visualization_kind",
              "visualization_code",
              "confidence",
            ],
            additionalProperties: false,
          },
        },
      },
    }),
    signal: AbortSignal.timeout(25000),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error?.message || body?.message || `AI provider returned ${response.status}`);
  }
  const raw = body?.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p) => p?.text || "").join("") : "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      answer: "",
      explanation: text || "The AI tutor returned an unreadable response.",
      steps: [],
      key_latex: "",
      visualization_kind: "none",
      visualization_code: "",
      confidence: 0,
    };
  }
}

async function cachedAiTutor(question, aiKey) {
  const id = questionIdentity(question);
  const cacheKey = `ai:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;
  const result = await aiTutor(question, aiKey, "Explain this JAMB question and provide a useful diagram or graph only when it improves understanding.");
  await cacheSet(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
  return result;
}

function explanationHtml(question, ai) {
  const official = officialAnswer(question);
  const aiAnswer = String(ai?.answer || "").trim().toLowerCase();
  if (/^[a-e]$/.test(official) && /^[a-e]$/.test(aiAnswer) && official !== aiAnswer) {
    return (
      `⚠️ <b>Answer check needs review</b>\n\n` +
      `ALOC official answer: <b>${official.toUpperCase()}</b>\n` +
      `Qwen independent answer: <b>${aiAnswer.toUpperCase()}</b>\n\n` +
      `I won't present the AI explanation as authoritative because the two sources disagree.`
    );
  }

  const steps = Array.isArray(ai?.steps) && ai.steps.length
    ? `\n\n<b>Steps</b>\n${ai.steps.map((step, i) => `${i + 1}. ${escapeHtml(step)}`).join("\n")}`
    : "";
  const answerLine = /^[a-e]$/.test(official)
    ? `✅ <b>Official answer: ${official.toUpperCase()}</b>\n\n`
    : "";
  let text =
    `${answerLine}<b>AI Tutor — Qwen3.5-27B</b>\n\n` +
    `${escapeHtml(ai?.explanation || "No explanation returned.")}${steps}`;
  if (ai?.key_latex) text += `\n\n🧮 <b>Key formula:</b> <code>${escapeHtml(ai.key_latex)}</code>`;
  if (Number.isFinite(ai?.confidence)) text += `\n\nConfidence: ${Math.round(Number(ai.confidence) * 100)}%`;
  return text.slice(0, 3900);
}

function latexImageUrl(latex) {
  const value = String(latex || "").trim();
  if (!value) return "";
  return `https://latex.codecogs.com/png.image?${encodeURIComponent(`\\dpi{170} ${value}`)}`;
}

function krokiImageUrl(kind, code) {
  if (!["mermaid", "vega"].includes(kind) || !code || String(code).length > 7000) return "";
  try {
    const compressed = deflateSync(Buffer.from(String(code), "utf8"), { level: 9 });
    return `https://kroki.io/${kind}/png/${compressed.toString("base64url")}`;
  } catch {
    return "";
  }
}

function aiVisualUrl(ai) {
  const kind = String(ai?.visualization_kind || "none");
  const code = String(ai?.visualization_code || "");
  const diagram = krokiImageUrl(kind, code);
  if (diagram) return diagram;
  return latexImageUrl(ai?.key_latex || "");
}

function helpText(aiEnabled) {
  return (
    `🎓 <b>JAMB Practice Bot</b>\n\n` +
    `• /start — choose subject and year\n` +
    `• Answer with A/B/C/D buttons\n` +
    `• 💡 Explain — Qwen3.5-27B explanation\n` +
    `• 🎨 Diagram / Graph — visual solution when useful\n` +
    `• 🧮 Render maths — clean formula view\n` +
    `• /ask your question — ask about the current JAMB question\n\n` +
    `AI Tutor: <b>${aiEnabled ? "enabled" : "not configured"}</b>\n` +
    `<i>Questions powered by ALOC API</i>`
  );
}

export default async (req) => {
  const url = new URL(req.url);
  const alocKey = url.searchParams.get("aloc") || "";
  const webhookSecret = url.searchParams.get("secret") || "";
  const aiKey = url.searchParams.get("ai") || "";

  if (req.method === "GET") {
    return Response.json({
      ok: true,
      service: "jamb123bot-webhook",
      version: "ai-math-diagrams-fast-v3",
      aiModel: "qwen/qwen3.5-27b:nitro",
      cache: "netlify-blobs",
    });
  }
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!alocKey || !webhookSecret) return new Response("Webhook not configured", { status: 503 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = String(update.message.text || "").trim();

      if (text === "/help" || text.startsWith("/help@")) {
        return telegramMethod("sendMessage", {
          chat_id: chatId,
          text: helpText(Boolean(aiKey)),
          parse_mode: "HTML",
        });
      }

      if (text === "/ask" || text.startsWith("/ask@")) {
        return telegramMethod("sendMessage", {
          chat_id: chatId,
          text: "Use <code>/ask your question</code> after opening a JAMB question. Example: <code>/ask why is option B correct?</code>",
          parse_mode: "HTML",
        });
      }

      if (text.startsWith("/ask ")) {
        const request = text.slice(5).trim();
        const last = await lastQuestion(chatId);
        if (!last?.question) {
          return telegramMethod("sendMessage", {
            chat_id: chatId,
            text: "Open a JAMB question first with /start, then ask me about it.",
          });
        }
        try {
          const ai = await aiTutor(last.question, aiKey, request);
          return telegramMethod("sendMessage", {
            chat_id: chatId,
            text: explanationHtml(last.question, ai),
            parse_mode: "HTML",
          });
        } catch (error) {
          return telegramMethod("sendMessage", {
            chat_id: chatId,
            text: `❌ ${escapeHtml(error?.message || "AI tutor failed.")}`,
            parse_mode: "HTML",
          });
        }
      }

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
        text: "Send /start to choose a JAMB subject, or /help for options.",
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
        const menu = subjectMenu(subjects, page);
        if (callback.message.photo) {
          return telegramMethod("sendMessage", {
            chat_id: chatId,
            text: menu.text,
            parse_mode: "HTML",
            reply_markup: menu.reply_markup,
          });
        }
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
        if (callback.message.photo) {
          return telegramMethod("sendMessage", {
            chat_id: chatId,
            text: menu.text,
            parse_mode: "HTML",
            reply_markup: menu.reply_markup,
          });
        }
        return telegramMethod("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup,
        });
      }

      if (data.startsWith("yp:")) {
        const [, subject, pageToken] = data.split(":");
        const years = await getYears(subject, alocKey);
        const menu = yearMenu(subject, years, Number(pageToken || 0));
        return telegramMethod("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup,
        });
      }

      if (data.startsWith("q:")) {
        const [, subject, year] = data.split(":");
        try {
          const question = await nextQuestion(chatId, subject, year, alocKey);
          return renderQuestion(question, subject, year, callback);
        } catch (error) {
          return editCurrent(
            callback,
            `❌ Could not fetch a question.\n\n${escapeHtml(error?.message || "Unknown error")}`,
            {
              inline_keyboard: [
                [{ text: "🔄 Try again", callback_data: `q:${subject}:${year}` }],
                [{ text: "📚 Subjects", callback_data: "subjects" }],
              ],
            },
          );
        }
      }

      if (data.startsWith("ans:")) {
        const selected = data.slice(4).toLowerCase();
        const last = await lastQuestion(chatId);
        if (!last?.question) {
          return editCurrent(callback, "Question session expired. Choose the subject again.", {
            inline_keyboard: [[{ text: "📚 Subjects", callback_data: "subjects" }]],
          });
        }
        const correct = officialAnswer(last.question);
        const validCorrect = /^[a-e]$/.test(correct);
        const result = validCorrect && selected === correct
          ? `✅ <b>Correct!</b> You chose ${selected.toUpperCase()}.`
          : validCorrect
            ? `❌ <b>Incorrect.</b> You chose ${selected.toUpperCase()}. Official answer: <b>${correct.toUpperCase()}</b>.`
            : `✅ Answer recorded: <b>${selected.toUpperCase()}</b>.`;
        return editCurrent(callback, result, resultButtons(last.subject, last.year));
      }

      if (data === "askhelp") {
        return telegramMethod("sendMessage", {
          chat_id: chatId,
          text:
            `🤖 <b>Ask AI Tutor</b>\n\n` +
            `Send a message like:\n<code>/ask why is option B correct?</code>\n` +
            `<code>/ask show me a shorter method</code>\n` +
            `<code>/ask explain this like I am a beginner</code>`,
          parse_mode: "HTML",
        });
      }

      if (data === "explain" || data === "visualize" || data === "mathview") {
        const last = await lastQuestion(chatId);
        if (!last?.question) {
          return telegramMethod("sendMessage", {
            chat_id: chatId,
            text: "Question session expired. Send /start and open another question.",
          });
        }

        try {
          let ai = null;
          if (data === "mathview") {
            let latex = extractLatex(last.question);
            if (!latex && aiKey) {
              ai = await cachedAiTutor(last.question, aiKey);
              latex = ai?.key_latex || "";
            }
            const image = latexImageUrl(latex);
            if (!image) {
              return telegramMethod("sendMessage", {
                chat_id: chatId,
                text: "I could not identify a formula to render for this question.",
              });
            }
            return telegramMethod("sendPhoto", {
              chat_id: chatId,
              photo: image,
              caption: "🧮 Mathematical view",
            });
          }

          ai = await cachedAiTutor(last.question, aiKey);

          if (data === "visualize") {
            const image = aiVisualUrl(ai);
            if (!image) {
              return telegramMethod("sendMessage", {
                chat_id: chatId,
                text: "This solution does not need a useful diagram or graph. Use 💡 Explain for the worked solution.",
              });
            }
            return telegramMethod("sendPhoto", {
              chat_id: chatId,
              photo: image,
              caption: "🎨 AI-generated learning visual. Use it together with the official answer and explanation.",
            });
          }

          const explanation = explanationHtml(last.question, ai);
          const visual = aiVisualUrl(ai);
          if (visual && explanation.length <= 950) {
            return telegramMethod("sendPhoto", {
              chat_id: chatId,
              photo: visual,
              caption: explanation,
              parse_mode: "HTML",
            });
          }
          return telegramMethod("sendMessage", {
            chat_id: chatId,
            text: explanation,
            parse_mode: "HTML",
          });
        } catch (error) {
          return telegramMethod("sendMessage", {
            chat_id: chatId,
            text: `❌ ${escapeHtml(error?.message || "Tutor request failed.")}`,
            parse_mode: "HTML",
          });
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("telegram webhook error", error);
    return Response.json({ ok: true });
  }
};

export const config = { path: "/telegram-webhook" };
