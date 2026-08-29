type ExamQuestion = {
  id: string;
  exam_body_slug: string;
  institution_slug?: string | null;
  subject_slug: string;
  year?: number | null;
  question_number?: string | null;
  stem?: string | null;
  answer_text?: string | null;
  explanation?: string | null;
  choices?: Array<{ label: string; choice_text?: string | null; choice_markdown?: string | null; is_correct?: boolean | null; sort_order: number }>;
};

function config() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

export function examBankConfigured() {
  const { url, key } = config();
  return Boolean(url && key);
}

async function supabase(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  if (!url || !key) throw new Error("Exam Bank Supabase is not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: init.signal || AbortSignal.timeout(5000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.error || `Supabase returned ${response.status}`);
  return body;
}

export async function getAvailableYears(examBody: string, subjectSlug: string, institutionSlug?: string | null): Promise<number[]> {
  const subjectRows = await supabase(`exam_subjects?slug=eq.${encodeURIComponent(subjectSlug)}&select=id&limit=1`);
  const subjectId = subjectRows?.[0]?.id;
  if (!subjectId) return [];
  let path = `exam_papers?exam_body_slug=eq.${encodeURIComponent(examBody)}&subject_id=eq.${encodeURIComponent(subjectId)}&select=year,institution_id&year=not.is.null&order=year.desc`;
  const rows = await supabase(path);
  if (!institutionSlug) return [...new Set(rows.map((row: any) => Number(row.year)).filter(Number.isInteger))];
  const institutions = await supabase(`exam_institutions?slug=eq.${encodeURIComponent(institutionSlug)}&select=id&limit=1`);
  const institutionId = institutions?.[0]?.id;
  if (!institutionId) return [];
  return [...new Set(rows.filter((row: any) => row.institution_id === institutionId).map((row: any) => Number(row.year)).filter(Number.isInteger))];
}

export async function getRandomExamQuestion(params: {
  examBody: string;
  subjectSlug: string;
  year?: number | null;
  institutionSlug?: string | null;
}): Promise<ExamQuestion | null> {
  const rpc = await supabase("rpc/exam_get_random_question", {
    method: "POST",
    body: JSON.stringify({
      p_exam_body_slug: params.examBody,
      p_subject_slug: params.subjectSlug,
      p_year: params.year ?? null,
      p_institution_slug: params.institutionSlug ?? null,
    }),
  });
  const question = Array.isArray(rpc) ? rpc[0] : null;
  if (!question?.id) return null;
  const choices = await supabase("rpc/exam_get_question_choices", {
    method: "POST",
    body: JSON.stringify({ p_question_id: question.id }),
  });
  return { ...question, choices: Array.isArray(choices) ? choices : [] };
}
