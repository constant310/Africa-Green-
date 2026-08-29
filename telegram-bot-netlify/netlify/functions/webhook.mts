import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

const SUBJECTS = [
  ["agri", "Agriculture", "agriculture"], ["ara", "Arabic", "arabic"], ["art", "Art", "art"],
  ["bio", "Biology", "biology"], ["chem", "Chemistry", "chemistry"],
  ["crs", "Christian Religious Studies", "christian-religious-studies"], ["comm", "Commerce", "commerce"],
  ["econ", "Economics", "economics"], ["fre", "French", "french"], ["geo", "Geography", "geography"],
  ["gov", "Government", "government"], ["hau", "Hausa", "hausa"], ["hist", "History", "history"],
  ["home", "Home Economics", "home-economics"], ["igb", "Igbo", "igbo"], ["isl", "Islamic Studies", "islamic-studies"],
  ["lit", "Literature in English", "literature-in-english"], ["math", "Mathematics", "mathematics"],
  ["mus", "Music", "music"], ["phy", "Physics", "physics"], ["acct", "Principles of Account", "principles-of-account"],
  ["eng", "Use of English", "english-language"], ["yor", "Yoruba", "yoruba"], ["comp", "Computer Studies", "computer-studies"],
  ["phe", "Physical & Health Education", "physical-and-health-education"],
].map(([code, displayName, slug]) => ({ code, displayName, slug }));

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function telegramMethod(method, payload) {
  return new Response(JSON.stringify({ method, ...payload }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function memoryStore() {
  const root = globalThis;
  if (!root.__jambBotMemory) root.__jambBotMemory = new Map();
  return root.__jambBotMemory;
}
function memoryGet(key) {
  const entry = memoryStore().get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    if (entry) memoryStore().delete(key);
    return null;
  }
  return entry.value;
}
function memorySet(key, value, ttlMs) {
  memoryStore().set(key, { value, expiresAt: Date.now() + ttlMs });
}
function cacheStore() { return getStore("jamb-bot-cache"); }
function stateStore() { return getStore("jamb-bot-state", { consistency: "strong" }); }
function configStore() { return getStore("jamb-bot-config", { consistency: "strong" }); }

async function cacheGet(key) {
  const mem = memoryGet(`cache:${key}`);
  if (mem != null) return mem;
  try {
    const item = await cacheStore().get(key, { type: "json" });
    if (!item || Number(item.expiresAt || 0) < Date.now()) return null;
    memorySet(`cache:${key}`, item.value, Math.min(Number(item.expiresAt) - Date.now(), 15 * 60 * 1000));
    return item.value;
  } catch { return null; }
}
async function cacheSet(key, value, ttlMs) {
  memorySet(`cache:${key}`, value, Math.min(ttlMs, 15 * 60 * 1000));
  try { await cacheStore().setJSON(key, { value, expiresAt: Date.now() + ttlMs }); } catch {}
}
async function stateGet(key) {
  const mem = memoryGet(`state:${key}`);
  if (mem != null) return mem;
  try {
    const item = await stateStore().get(key, { type: "json" });
    if (!item || Number(item.expiresAt || 0) < Date.now()) return null;
    memorySet(`state:${key}`, item.value, Math.min(Number(item.expiresAt) - Date.now(), 10 * 60 * 1000));
    return item.value;
  } catch { return null; }
}
async function stateSet(key, value, ttlMs) {
  memorySet(`state:${key}`, value, Math.min(ttlMs, 10 * 60 * 1000));
  try { await stateStore().setJSON(key, { value, expiresAt: Date.now() + ttlMs }); } catch {}
}

async function loadConfig(url) {
  const configId = url.searchParams.get("cfg") || "";
  if (configId) {
    const cached = memoryGet(`config:${configId}`);
    if (cached) return cached;
    try {
      const config = await configStore().get(`cfg:${configId}`, { type: "json" });
      if (config) {
        memorySet(`config:${configId}`, config, 15 * 60 * 1000);
        return config;
      }
    } catch {}
  }
  return {
    token: "",
    aloc: url.searchParams.get("aloc") || "",
    groq: url.searchParams.get("groq") || "",
    cfAccount: url.searchParams.get("cf_account") || "",
    cfToken: url.searchParams.get("cf_token") || "",
  };
}

async function telegram(token, method, payload = {}, timeoutMs = 7000) {
  if (!token) throw new Error("Telegram token unavailable in server configuration.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.ok) throw new Error(body?.description || `${method} failed`);
  return body.result;
}

function subjectFromToken(token) {
  const value = String(token || "").trim();
  return SUBJECTS.find((s) => s.code === value || s.slug === value) || null;
}

function subjectMenu(page = 0) {
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(SUBJECTS.length / pageSize));
  const safePage = Math.min(Math.max(0, Number(page) || 0), pageCount - 1);
  const visible = SUBJECTS.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rows = [];
  for (let i = 0; i < visible.length; i += 2) {
    rows.push(visible.slice(i, i + 2).map((s) => ({ text: s.displayName, callback_data: `s:${s.code}` })));
  }
  if (pageCount > 1) {
    const nav = [];
    if (safePage > 0) nav.push({ text: "⬅️ Previous", callback_data: `sp:${safePage - 1}` });
    nav.push({ text: `${safePage + 1}/${pageCount}`, callback_data: "noop" });
    if (safePage < pageCount - 1) nav.push({ text: "Next ➡️", callback_data: `sp:${safePage + 1}` });
    rows.push(nav);
  }
  return {
    text: `🎓 <b>JAMB Practice Bot</b>\n\nChoose a subject below.\n\n<b>${SUBJECTS.length} subjects available</b>\n⚡ Fast mode enabled\n<i>Questions powered by ALOC API</i>`,
    reply_markup: { inline_keyboard: rows },
  };
}

async function alocFetch(path, apiKey) {
  const response = await fetch(`https://dev.aloc.com.ng/api/v1${path}`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || body?.error || `ALOC returned ${response.status}`);
  return body;
}

async function getYears(subject, apiKey) {
  const key = `years:v4:${subject.code}`;
  const cached = await cacheGet(key);
  if (Array.isArray(cached) && cached.length) return cached;
  try {
    const body = await alocFetch(`/subjects/${encodeURIComponent(subject.slug)}/years`, apiKey);
    const years = (Array.isArray(body?.data) ? body.data : [])
      .filter((item) => Number(item?.breakdown?.jamb || 0) > 0 || !Array.isArray(item?.examTypes) || item.examTypes.includes("jamb"))
      .map((item) => Number(item?.year))
      .filter((year) => Number.isInteger(year) && year > 1980 && year < 2100)
      .sort((a, b) => b - a);
    const unique = [...new Set(years)];
    await cacheSet(key, unique, 24 * 60 * 60 * 1000);
    return unique;
  } catch { return []; }
}

function yearMenu(subject, years, page = 0) {
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(years.length / pageSize));
  const safePage = Math.min(Math.max(0, Number(page) || 0), pageCount - 1);
  const visible = years.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rows = [[{ text: "🎯 Random question — any year", callback_data: `q:${subject.code}:any` }]];
  for (let i = 0; i < visible.length; i += 3) {
    rows.push(visible.slice(i, i + 3).map((year) => ({ text: String(year), callback_data: `q:${subject.code}:${year}` })));
  }
  if (pageCount > 1) {
    const nav = [];
    if (safePage > 0) nav.push({ text: "⬅️", callback_data: `yp:${subject.code}:${safePage - 1}` });
    nav.push({ text: `${safePage + 1}/${pageCount}`, callback_data: "noop" });
    if (safePage < pageCount - 1) nav.push({ text: "➡️", callback_data: `yp:${subject.code}:${safePage + 1}` });
    rows.push(nav);
  }
  rows.push([{ text: "📚 All subjects", callback_data: "subjects" }]);
  return {
    text: `📘 <b>${escapeHtml(subject.displayName)}</b>\n\nChoose a JAMB year, or use a random question from any available year.${years.length ? `\n\n${years.length} years available.` : "\n\nYear catalogue unavailable; random practice still works."}`,
    reply_markup: { inline_keyboard: rows },
  };
}

function optionEntries(options) {
  if (Array.isArray(options)) return options.slice(0, 5).map((v, i) => [String.fromCharCode(97 + i), String(v)]);
  if (options && typeof options === "object") {
    return Object.entries(options).filter(([k, v]) => /^[a-e]$/i.test(k) && v != null).map(([k, v]) => [k.toLowerCase(), String(v)]);
  }
  return [];
}

function extractImageUrl(question) {
  const candidates = [question?.imageUrl, question?.questionImageUrl, question?.diagramUrl, question?.image, question?.diagram, question?.media?.url, question?.media?.imageUrl, question?.assets?.diagram, question?.assets?.image];
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
    } catch {}
  }
  return "";
}

function extractLatex(question) {
  for (const value of [question?.latex, question?.equation, question?.formula, question?.mathLatex]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const text = String(question?.text || question?.question || "");
  for (const pattern of [/\$\$([^$]{2,500})\$\$/, /\$([^$\n]{2,500})\$/, /\\\[([\s\S]{2,500}?)\\\]/, /\\\(([\s\S]{2,500}?)\\\)/]) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function officialAnswer(q) { return String(q?.correctAnswer || q?.answer || "").trim().toLowerCase(); }
function questionIdentity(q) {
  return createHash("sha256").update(`${q?.id || ""}|${q?.subject || ""}|${q?.year || ""}|${q?.text || q?.question || ""}`).digest("hex").slice(0, 14);
}

async function getQuestionPool(subject, year, apiKey) {
  const key = `pool:v4:${subject.code}:${year}`;
  const cached = await cacheGet(key);
  if (Array.isArray(cached) && cached.length) return cached;
  const params = new URLSearchParams({ subject: subject.slug, examType: "jamb", random: "true", limit: "10" });
  if (year !== "any") params.set("year", year);
  const body = await alocFetch(`/questions?${params.toString()}`, apiKey);
  const questions = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
  if (!questions.length) throw new Error(`No JAMB question found for ${subject.displayName}${year !== "any" ? ` in ${year}` : ""}.`);
  await cacheSet(key, questions, 30 * 60 * 1000);
  return questions;
}

function selectQuestion(pool, chatId, subject, year) {
  const key = `cursor:${chatId}:${subject.code}:${year}`;
  let index = Number(memoryGet(key));
  if (!Number.isInteger(index)) {
    const seed = createHash("sha1").update(`${chatId}:${Date.now()}:${subject.code}:${year}`).digest().readUInt32BE(0);
    index = seed % pool.length;
  } else index = (index + 1) % pool.length;
  memorySet(key, index, 30 * 60 * 1000);
  return pool[index];
}

async function rememberQuestion(chatId, subject, year, question) {
  const qid = questionIdentity(question);
  const value = { question, subjectCode: subject.code, year };
  await Promise.all([
    stateSet(`question:${qid}`, value, 2 * 60 * 60 * 1000),
    stateSet(`last:${chatId}`, { ...value, qid }, 2 * 60 * 60 * 1000),
  ]);
  return qid;
}
async function getRememberedQuestion(qid, chatId = "") {
  if (qid) {
    const saved = await stateGet(`question:${qid}`);
    if (saved?.question) return { ...saved, qid };
  }
  return chatId ? stateGet(`last:${chatId}`) : null;
}

function questionHtml(question, subject) {
  const entries = optionEntries(question?.options);
  const passage = question?.hasPassage && question?.section ? `<b>Passage</b>\n${escapeHtml(question.section)}\n\n` : "";
  const optionsText = entries.map(([letter, text]) => `<b>${letter.toUpperCase()}.</b> ${escapeHtml(text)}`).join("\n");
  let text = `<b>${escapeHtml(subject.displayName)} — JAMB${question?.year ? ` ${question.year}` : ""}</b>\n\n${passage}${escapeHtml(question?.text || question?.question || "Question unavailable")}\n\n${optionsText}\n\n<i>Powered by ALOC API</i>`;
  if (text.length > 3900) text = `${text.slice(0, 3800)}…\n\n<i>Powered by ALOC API</i>`;
  return { text, entries };
}

function questionButtons(subject, year, entries, question, qid) {
  const correct = officialAnswer(question);
  const safeCorrect = /^[a-e]$/.test(correct) ? correct : "x";
  const rows = [entries.map(([letter]) => ({ text: letter.toUpperCase(), callback_data: `ans:${letter}:${safeCorrect}:${subject.code}:${year}:${qid}` }))];
  if (extractLatex(question)) rows.push([{ text: "🧮 Render maths", callback_data: `math:${qid}` }]);
  rows.push([{ text: "💡 Explain", callback_data: `ex:${qid}` }, { text: "🎨 Diagram / Graph", callback_data: `viz:${qid}` }]);
  rows.push([{ text: "🤖 Ask AI Tutor", callback_data: `ask:${qid}` }]);
  rows.push([{ text: "➡️ Next question", callback_data: `q:${subject.code}:${year}` }]);
  rows.push([{ text: "📅 Change year", callback_data: `s:${subject.code}` }, { text: "📚 Subjects", callback_data: "subjects" }]);
  return { inline_keyboard: rows };
}
function resultButtons(subject, year, qid) {
  return { inline_keyboard: [
    [{ text: "💡 Explain", callback_data: `ex:${qid}` }, { text: "🎨 Visualize", callback_data: `viz:${qid}` }],
    [{ text: "🤖 Ask AI Tutor", callback_data: `ask:${qid}` }],
    [{ text: "➡️ Next question", callback_data: `q:${subject.code}:${year}` }],
    [{ text: "📅 Change year", callback_data: `s:${subject.code}` }, { text: "📚 Subjects", callback_data: "subjects" }],
  ] };
}

function editCurrentResponse(callback, text, replyMarkup) {
  if (callback.message.photo) {
    return telegramMethod("sendMessage", { chat_id: callback.message.chat.id, text, parse_mode: "HTML", reply_markup: replyMarkup, disable_web_page_preview: true });
  }
  return telegramMethod("editMessageText", { chat_id: callback.message.chat.id, message_id: callback.message.message_id, text, parse_mode: "HTML", reply_markup: replyMarkup, disable_web_page_preview: true });
}
async function editOrSendDirect(token, callback, text, replyMarkup) {
  const payload = { chat_id: callback.message.chat.id, text, parse_mode: "HTML", reply_markup: replyMarkup, disable_web_page_preview: true };
  if (!callback.message.photo) {
    try { return await telegram(token, "editMessageText", { ...payload, message_id: callback.message.message_id }); } catch {}
  }
  return telegram(token, "sendMessage", payload);
}

async function deliverQuestionDirect(config, callback, subject, year, question) {
  const qid = await rememberQuestion(callback.message.chat.id, subject, year, question);
  const { text, entries } = questionHtml(question, subject);
  const imageUrl = extractImageUrl(question);
  if (imageUrl) {
    try { await telegram(config.token, "sendPhoto", { chat_id: callback.message.chat.id, photo: imageUrl, caption: `🖼 Diagram for ${subject.displayName}${question?.year ? ` — JAMB ${question.year}` : ""}` }); } catch {}
  }
  await editOrSendDirect(config.token, callback, text, questionButtons(subject, year, entries, question, qid));
}

function buildTutorPrompt(question, instruction) {
  const options = optionEntries(question?.options).map(([l, t]) => `${l.toUpperCase()}. ${t}`).join("\n");
  return [
    "You are an expert Nigerian JAMB/UTME tutor.",
    "Solve independently. The official answer is checked separately, so do not blindly trust it.",
    "Return concise teaching steps, not hidden chain-of-thought.",
    "For Mathematics, Physics and Chemistry, use correct formulas and put one useful LaTeX expression in key_latex.",
    "If a graph or diagram materially improves understanding, return valid Mermaid code or Vega JSON.",
    "Use visualization_kind='none' if a visual would not help. Never invent facts or labels not supported by the question.",
    `Subject: ${question?.subject || ""}`, `Year: ${question?.year || ""}`,
    `Question: ${question?.text || question?.question || ""}`, `Options:\n${options}`,
    `Student request: ${instruction || "Explain the correct answer clearly."}`,
  ].join("\n");
}

const TUTOR_SCHEMA = {
  name: "jamb_tutor", strict: true,
  schema: {
    type: "object",
    properties: {
      answer: { type: "string", enum: ["A", "B", "C", "D", "E", ""] },
      explanation: { type: "string" }, steps: { type: "array", items: { type: "string" }, maxItems: 5 },
      key_latex: { type: "string" }, visualization_kind: { type: "string", enum: ["none", "mermaid", "vega"] },
      visualization_code: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["answer", "explanation", "steps", "key_latex", "visualization_kind", "visualization_code", "confidence"],
    additionalProperties: false,
  },
};

function tutorContent(prompt, imageUrl) {
  return imageUrl ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }] : prompt;
}
function parseTutorResult(raw, provider) {
  let text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p) => p?.text || "").join("") : "";
  text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return { ...JSON.parse(text), provider }; } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return { ...JSON.parse(match[0]), provider }; } catch {} }
  return { answer: "", explanation: text || "The AI tutor returned an unreadable response.", steps: [], key_latex: "", visualization_kind: "none", visualization_code: "", confidence: 0, provider };
}

async function groqTutor(question, key, instruction) {
  if (!key) throw new Error("Groq is not configured.");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      messages: [
        { role: "system", content: "Return only valid JSON matching the schema. Be concise, accurate and exam-focused." },
        { role: "user", content: tutorContent(buildTutorPrompt(question, instruction), extractImageUrl(question)) },
      ],
      temperature: 0.15, max_completion_tokens: 550, reasoning_effort: "low", reasoning_format: "hidden",
      response_format: { type: "json_schema", json_schema: TUTOR_SCHEMA },
    }),
    signal: AbortSignal.timeout(9000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.message || `Groq returned ${response.status}`);
  return parseTutorResult(body?.choices?.[0]?.message?.content, "Groq · Qwen3.8-27B");
}

async function cloudflareTutor(question, accountId, apiToken, instruction) {
  if (!accountId || !apiToken) throw new Error("Cloudflare Workers AI is not configured.");
  const prompt = `${buildTutorPrompt(question, instruction)}\n\nReturn JSON only with keys: answer, explanation, steps, key_latex, visualization_kind, visualization_code, confidence.`;
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "@cf/google/gemma-4-26b-a4b-it",
      messages: [
        { role: "system", content: "You are a concise JAMB tutor. Return JSON only." },
        { role: "user", content: tutorContent(prompt, extractImageUrl(question)) },
      ],
      temperature: 0.15, max_completion_tokens: 550, reasoning_effort: "low",
    }),
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.errors?.[0]?.message || body?.error?.message || body?.message || `Cloudflare returned ${response.status}`);
  return parseTutorResult(body?.choices?.[0]?.message?.content ?? body?.result?.response ?? body?.result, "Cloudflare · Gemma 4 26B");
}

async function aiTutor(question, config, instruction) {
  const errors = [];
  if (config.groq) {
    try { return await groqTutor(question, config.groq, instruction); }
    catch (e) { errors.push(`Groq: ${e?.message || "failed"}`); }
  }
  if (config.cfAccount && config.cfToken) {
    try { return await cloudflareTutor(question, config.cfAccount, config.cfToken, instruction); }
    catch (e) { errors.push(`Cloudflare: ${e?.message || "failed"}`); }
  }
  if (!config.groq && !(config.cfAccount && config.cfToken)) throw new Error("Free AI is not configured yet. Add a Groq key and/or Cloudflare Workers AI credentials on /setup.");
  throw new Error(`Both free AI providers were unavailable. ${errors.join(" | ")}`);
}
async function cachedAiTutor(question, config) {
  const key = `ai:v4:${questionIdentity(question)}`;
  const cached = await cacheGet(key);
  if (cached) return cached;
  const result = await aiTutor(question, config, "Explain this JAMB question clearly. Add a diagram or graph only when it genuinely improves understanding.");
  await cacheSet(key, result, 7 * 24 * 60 * 60 * 1000);
  return result;
}

function explanationHtml(question, ai) {
  const official = officialAnswer(question), aiAnswer = String(ai?.answer || "").trim().toLowerCase();
  if (/^[a-e]$/.test(official) && /^[a-e]$/.test(aiAnswer) && official !== aiAnswer) {
    return `⚠️ <b>Answer check needs review</b>\n\nALOC official answer: <b>${official.toUpperCase()}</b>\n${escapeHtml(ai?.provider || "AI")} independent answer: <b>${aiAnswer.toUpperCase()}</b>\n\nThe bot will not present the AI explanation as authoritative while these disagree.`;
  }
  const steps = Array.isArray(ai?.steps) && ai.steps.length ? `\n\n<b>Steps</b>\n${ai.steps.map((s, i) => `${i + 1}. ${escapeHtml(s)}`).join("\n")}` : "";
  let text = `${/^[a-e]$/.test(official) ? `✅ <b>Official answer: ${official.toUpperCase()}</b>\n\n` : ""}<b>AI Tutor</b> <i>${escapeHtml(ai?.provider || "")}</i>\n\n${escapeHtml(ai?.explanation || "No explanation returned.")}${steps}`;
  if (ai?.key_latex) text += `\n\n🧮 <b>Key formula:</b> <code>${escapeHtml(ai.key_latex)}</code>`;
  if (Number.isFinite(ai?.confidence)) text += `\n\nConfidence: ${Math.round(Number(ai.confidence) * 100)}%`;
  return text.slice(0, 3900);
}
function latexImageUrl(latex) {
  const value = String(latex || "").trim();
  return value ? `https://latex.codecogs.com/png.image?${encodeURIComponent(`\\dpi{170} ${value}`)}` : "";
}
function krokiImageUrl(kind, code) {
  if (!["mermaid", "vega"].includes(kind) || !code || String(code).length > 7000) return "";
  try { return `https://kroki.io/${kind}/png/${deflateSync(Buffer.from(String(code), "utf8"), { level: 9 }).toString("base64url")}`; } catch { return ""; }
}
function aiVisualUrl(ai) { return krokiImageUrl(String(ai?.visualization_kind || "none"), String(ai?.visualization_code || "")) || latexImageUrl(ai?.key_latex || ""); }
function aiEnabled(config) { return Boolean(config.groq || (config.cfAccount && config.cfToken)); }
function helpText(config) {
  const provider = config.groq && config.cfAccount && config.cfToken ? "Groq primary + Cloudflare fallback" : config.groq ? "Groq Qwen3.8-27B" : config.cfAccount && config.cfToken ? "Cloudflare Gemma 4 26B" : "not configured";
  return `🎓 <b>JAMB Practice Bot</b>\n\n• /start — choose subject and year\n• A/B/C/D — instant grading\n• 💡 Explain — free AI worked solution\n• 🎨 Diagram / Graph — visual solution when useful\n• 🧮 Render maths — clean formula view\n• /ask your question — ask about the current question\n\nAI: <b>${escapeHtml(provider)}</b>\n⚡ Fast background processing enabled\n<i>Questions powered by ALOC API</i>`;
}

async function showYearMenuDirect(config, callback, subject, page = 0) {
  const years = await getYears(subject, config.aloc);
  const menu = yearMenu(subject, years, page);
  await editOrSendDirect(config.token, callback, menu.text, menu.reply_markup);
  await getQuestionPool(subject, "any", config.aloc).catch(() => {});
}
async function showQuestionDirect(config, callback, subject, year) {
  const pool = await getQuestionPool(subject, year, config.aloc);
  await deliverQuestionDirect(config, callback, subject, year, selectQuestion(pool, callback.message.chat.id, subject, year));
}
async function explainDirect(config, chatId, qid, mode) {
  const saved = await getRememberedQuestion(qid, String(chatId));
  if (!saved?.question) return telegram(config.token, "sendMessage", { chat_id: chatId, text: "Question session expired. Send /start and open another question." });
  if (mode === "math") {
    let latex = extractLatex(saved.question);
    if (!latex && aiEnabled(config)) latex = (await cachedAiTutor(saved.question, config))?.key_latex || "";
    const image = latexImageUrl(latex);
    return image ? telegram(config.token, "sendPhoto", { chat_id: chatId, photo: image, caption: "🧮 Mathematical view" }) : telegram(config.token, "sendMessage", { chat_id: chatId, text: "I could not identify a useful mathematical expression to render." });
  }
  const ai = await cachedAiTutor(saved.question, config);
  if (mode === "visual") {
    const image = aiVisualUrl(ai);
    return image ? telegram(config.token, "sendPhoto", { chat_id: chatId, photo: image, caption: `🎨 Learning visual · ${ai.provider || "AI"}` }) : telegram(config.token, "sendMessage", { chat_id: chatId, text: "This solution does not need a useful diagram or graph. Tap 💡 Explain for the worked solution." });
  }
  const text = explanationHtml(saved.question, ai), visual = aiVisualUrl(ai);
  if (visual && text.length <= 900) {
    try { return await telegram(config.token, "sendPhoto", { chat_id: chatId, photo: visual, caption: text, parse_mode: "HTML" }); } catch {}
  }
  return telegram(config.token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
}
async function askDirect(config, chatId, instruction) {
  const saved = await getRememberedQuestion("", String(chatId));
  if (!saved?.question) return telegram(config.token, "sendMessage", { chat_id: chatId, text: "Open a JAMB question first with /start, then ask me about it." });
  const ai = await aiTutor(saved.question, config, instruction);
  return telegram(config.token, "sendMessage", { chat_id: chatId, text: explanationHtml(saved.question, ai), parse_mode: "HTML" });
}
function schedule(context, task) {
  if (!context?.waitUntil) return false;
  context.waitUntil(Promise.resolve(task).catch((error) => console.error("background task failed", error)));
  return true;
}

export default async (req, context) => {
  const url = new URL(req.url);
  const webhookSecret = url.searchParams.get("secret") || "";
  if (req.method === "GET") return Response.json({ ok: true, service: "jamb123bot-webhook", version: "free-ai-fast-v4", aiPrimary: "groq:qwen/qwen3.8-27b", aiFallback: "cloudflare:@cf/google/gemma-4-26b-a4b-it", cache: "memory+netlify-blobs", background: "netlify-waitUntil" });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!webhookSecret) return new Response("Webhook not configured", { status: 503 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) return new Response("Unauthorized", { status: 401 });

  try {
    const update = await req.json();
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = String(update.message.text || "").trim();
      if (text === "/start" || text.startsWith("/start@")) {
        const menu = subjectMenu(0);
        return telegramMethod("sendMessage", { chat_id: chatId, text: menu.text, parse_mode: "HTML", reply_markup: menu.reply_markup });
      }
      if (!text.startsWith("/ask") && text !== "/help" && !text.startsWith("/help@")) {
        const menu = subjectMenu(0);
        return telegramMethod("sendMessage", { chat_id: chatId, text: "Send /start to choose a JAMB subject, or /help for options.", reply_markup: menu.reply_markup });
      }
      const config = await loadConfig(url);
      if (!config?.aloc) return telegramMethod("sendMessage", { chat_id: chatId, text: "Bot configuration is incomplete. Reconnect it from /setup." });
      if (text === "/help" || text.startsWith("/help@")) return telegramMethod("sendMessage", { chat_id: chatId, text: helpText(config), parse_mode: "HTML" });
      if (text === "/ask" || text.startsWith("/ask@")) return telegramMethod("sendMessage", { chat_id: chatId, text: "Use <code>/ask your question</code> after opening a JAMB question.\nExample: <code>/ask why is option B correct?</code>", parse_mode: "HTML" });
      if (text.startsWith("/ask ")) {
        const instruction = text.slice(5).trim();
        if (config.token && schedule(context, askDirect(config, chatId, instruction))) return telegramMethod("sendChatAction", { chat_id: chatId, action: "typing" });
        try {
          const saved = await getRememberedQuestion("", String(chatId));
          if (!saved?.question) return telegramMethod("sendMessage", { chat_id: chatId, text: "Open a JAMB question first with /start, then ask me about it." });
          const ai = await aiTutor(saved.question, config, instruction);
          return telegramMethod("sendMessage", { chat_id: chatId, text: explanationHtml(saved.question, ai), parse_mode: "HTML" });
        } catch (error) { return telegramMethod("sendMessage", { chat_id: chatId, text: `❌ ${escapeHtml(error?.message || "AI tutor failed.")}`, parse_mode: "HTML" }); }
      }
    }

    if (update.callback_query) {
      const callback = update.callback_query, chatId = callback.message?.chat?.id, messageId = callback.message?.message_id, data = String(callback.data || "");
      if (!chatId || !messageId) return Response.json({ ok: true });
      if (data === "noop") return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id });
      if (data === "subjects" || data.startsWith("sp:")) {
        const menu = subjectMenu(data.startsWith("sp:") ? Number(data.split(":")[1] || 0) : 0);
        return editCurrentResponse(callback, menu.text, menu.reply_markup);
      }
      if (data.startsWith("ans:")) {
        const parts = data.split(":"), selected = String(parts[1] || "").toLowerCase(), correct = String(parts[2] || "").toLowerCase(), subject = subjectFromToken(parts[3]), year = parts[4] || "any", qid = parts[5] || "";
        if (subject && /^[a-e]$/.test(correct)) {
          const result = selected === correct ? `✅ <b>Correct!</b> You chose ${selected.toUpperCase()}.` : `❌ <b>Incorrect.</b> You chose ${selected.toUpperCase()}. Official answer: <b>${correct.toUpperCase()}</b>.`;
          return editCurrentResponse(callback, result, resultButtons(subject, year, qid));
        }
        const saved = await getRememberedQuestion("", String(chatId));
        const oldCorrect = officialAnswer(saved?.question), oldSubject = subjectFromToken(saved?.subjectCode || saved?.subject);
        if (!saved?.question || !oldSubject) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: "Question session expired. Send /start." });
        const result = /^[a-e]$/.test(oldCorrect) && selected === oldCorrect ? `✅ <b>Correct!</b> You chose ${selected.toUpperCase()}.` : /^[a-e]$/.test(oldCorrect) ? `❌ <b>Incorrect.</b> Official answer: <b>${oldCorrect.toUpperCase()}</b>.` : `✅ Answer recorded: <b>${selected.toUpperCase()}</b>.`;
        return editCurrentResponse(callback, result, resultButtons(oldSubject, saved.year, saved.qid || questionIdentity(saved.question)));
      }
      if (data.startsWith("ask:") || data === "askhelp") return telegramMethod("sendMessage", { chat_id: chatId, text: "🤖 <b>Ask AI Tutor</b>\n\nSend:\n<code>/ask why is option B correct?</code>\n<code>/ask show me a shorter method</code>\n<code>/ask explain this like I am a beginner</code>", parse_mode: "HTML" });

      const config = await loadConfig(url);
      if (!config?.aloc) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: "Bot configuration is incomplete. Reconnect it from /setup.", show_alert: true });
      if (data.startsWith("s:")) {
        const subject = subjectFromToken(data.slice(2));
        if (!subject) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: "Unknown subject." });
        if (config.token && schedule(context, showYearMenuDirect(config, callback, subject, 0))) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: "Loading years…", cache_time: 0 });
        const years = await getYears(subject, config.aloc), menu = yearMenu(subject, years, 0);
        return editCurrentResponse(callback, menu.text, menu.reply_markup);
      }
      if (data.startsWith("yp:")) {
        const [, token, pageToken] = data.split(":"), subject = subjectFromToken(token);
        if (!subject) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: "Unknown subject." });
        if (config.token && schedule(context, showYearMenuDirect(config, callback, subject, Number(pageToken || 0)))) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: "Loading…", cache_time: 0 });
        const years = await getYears(subject, config.aloc), menu = yearMenu(subject, years, Number(pageToken || 0));
        return editCurrentResponse(callback, menu.text, menu.reply_markup);
      }
      if (data.startsWith("q:")) {
        const [, token, year = "any"] = data.split(":"), subject = subjectFromToken(token);
        if (!subject) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: "Unknown subject." });
        if (config.token && schedule(context, showQuestionDirect(config, callback, subject, year).catch(async (error) => telegram(config.token, "sendMessage", { chat_id: chatId, text: `❌ Could not fetch a question.\n\n${String(error?.message || "Unknown error")}` })))) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: "Loading question…", cache_time: 0 });
        try {
          const pool = await getQuestionPool(subject, year, config.aloc), question = selectQuestion(pool, chatId, subject, year), qid = await rememberQuestion(chatId, subject, year, question), { text, entries } = questionHtml(question, subject);
          return editCurrentResponse(callback, text, questionButtons(subject, year, entries, question, qid));
        } catch (error) { return editCurrentResponse(callback, `❌ Could not fetch a question.\n\n${escapeHtml(error?.message || "Unknown error")}`, { inline_keyboard: [[{ text: "🔄 Try again", callback_data: `q:${subject.code}:${year}` }], [{ text: "📚 Subjects", callback_data: "subjects" }]] }); }
      }

      const isExplain = data.startsWith("ex:") || data === "explain", isVisual = data.startsWith("viz:") || data === "visualize", isMath = data.startsWith("math:") || data === "mathview";
      if (isExplain || isVisual || isMath) {
        const qid = data.includes(":") ? data.split(":")[1] : "", mode = isMath ? "math" : isVisual ? "visual" : "explain";
        if (config.token && schedule(context, explainDirect(config, chatId, qid, mode).catch(async (error) => telegram(config.token, "sendMessage", { chat_id: chatId, text: `❌ ${String(error?.message || "Tutor request failed.")}` })))) return telegramMethod("answerCallbackQuery", { callback_query_id: callback.id, text: mode === "math" ? "Rendering maths…" : mode === "visual" ? "Creating visual…" : "Preparing explanation…", cache_time: 0 });
        try {
          const saved = await getRememberedQuestion(qid, String(chatId));
          if (!saved?.question) return telegramMethod("sendMessage", { chat_id: chatId, text: "Question session expired. Send /start and open another question." });
          if (mode === "math") {
            let latex = extractLatex(saved.question);
            if (!latex && aiEnabled(config)) latex = (await cachedAiTutor(saved.question, config))?.key_latex || "";
            const image = latexImageUrl(latex);
            return image ? telegramMethod("sendPhoto", { chat_id: chatId, photo: image, caption: "🧮 Mathematical view" }) : telegramMethod("sendMessage", { chat_id: chatId, text: "I could not identify a formula to render." });
          }
          const ai = await cachedAiTutor(saved.question, config);
          if (mode === "visual") {
            const image = aiVisualUrl(ai);
            return image ? telegramMethod("sendPhoto", { chat_id: chatId, photo: image, caption: `🎨 Learning visual · ${ai.provider || "AI"}` }) : telegramMethod("sendMessage", { chat_id: chatId, text: "This solution does not need a useful diagram or graph. Tap 💡 Explain for the worked solution." });
          }
          return telegramMethod("sendMessage", { chat_id: chatId, text: explanationHtml(saved.question, ai), parse_mode: "HTML" });
        } catch (error) { return telegramMethod("sendMessage", { chat_id: chatId, text: `❌ ${escapeHtml(error?.message || "Tutor request failed.")}`, parse_mode: "HTML" }); }
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("telegram webhook error", error);
    return Response.json({ ok: true });
  }
};

export const config = { path: "/telegram-webhook" };
