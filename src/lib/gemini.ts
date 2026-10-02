import { GoogleGenAI, Type } from "@google/genai";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";

const API_KEY = process.env.GEMINI_API_KEY ?? "";
// Use the "-latest" alias so a retired version (e.g. gemini-2.5-flash was
// pulled for new keys) never breaks the app. Override per env when on billing.
const CHAT_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const MARK_MODEL = process.env.GEMINI_MARKING_MODEL ?? "gemini-flash-latest";

export const isGeminiConfigured = API_KEY.length > 0;

function client() {
  return new GoogleGenAI({ apiKey: API_KEY });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// When the primary model is overloaded (503) or out of quota (429), fall
// through to these lighter, less-contended models. These are the "-latest" and
// 3.x ids that work for current keys — DO NOT list gemini-2.5-flash here, it
// returns 404 ("no longer available to new users"). Override with
// GEMINI_FALLBACK_MODELS (CSV).
const FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ??
  "gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.5-flash"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isOverloaded = (msg: string) =>
  /503|UNAVAILABLE|overloaded|high demand/i.test(msg);
const isQuota = (msg: string) => /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
const isNotFound = (msg: string) =>
  /404|NOT_FOUND|not found|no longer available|is not found for API version|not supported/i.test(
    msg
  );

/**
 * Call Gemini resiliently:
 *  - retry the primary model on transient overload (503),
 *  - fall through to lighter fallback models when a model is overloaded (503),
 *    out of its per-model free-tier quota (429), or unavailable/404 (a retired
 *    id) — each model has its own quota bucket, so a sibling often still works,
 *  - fail fast only on genuinely hard errors (bad key / permission).
 * If EVERY model fails, the last error is thrown; callers catch it and fall
 * back to bank/paper questions where possible.
 */
// Approximate published Gemini Flash pricing (USD per 1M tokens). Real spend on
// a free-tier key is $0, but logging an *estimate* at paid rates makes the admin
// cost dashboard meaningful for capacity planning. Matched by substring.
const PRICING: { match: RegExp; in: number; out: number }[] = [
  { match: /image/i, in: 0.3, out: 30 }, // image output billed per-image; rough
  { match: /lite/i, in: 0.1, out: 0.4 },
  { match: /flash/i, in: 0.3, out: 2.5 },
];
function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING.find((x) => x.match.test(model)) ?? PRICING[PRICING.length - 1];
  return (tokensIn / 1e6) * p.in + (tokensOut / 1e6) * p.out;
}

/**
 * Record one AI call for the admin analytics dashboard. Fire-and-forget: a
 * telemetry failure must never break a user-facing AI feature. Uses the
 * service-role client because calls happen in server routes where there may be
 * no user session (and ai_events RLS would otherwise block the insert).
 */
function logAiEvent(e: {
  operation: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}) {
  if (!isServiceConfigured) return;
  try {
    const supabase = createServiceClient();
    void supabase
      .from("ai_events")
      .insert({
        operation: e.operation,
        model: e.model,
        tokens_in: e.tokensIn,
        tokens_out: e.tokensOut,
        cost_usd: estimateCost(e.model, e.tokensIn, e.tokensOut),
        latency_ms: e.latencyMs,
      })
      .then(({ error }) => {
        if (error) console.warn("[gemini] ai_events log failed:", error.message);
      });
  } catch {
    // ignore — telemetry is best-effort
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function genContent(params: any, perModelRetries = 1): Promise<any> {
  // `op` is our own label for analytics — strip it before calling the SDK.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { op = "generate", ...sdkParams } = params as any;
  const primary = sdkParams.model as string;
  const chain = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  let lastErr: unknown;
  for (const model of chain) {
    for (let attempt = 0; attempt <= perModelRetries; attempt++) {
      const started = Date.now();
      try {
        const res = await client().models.generateContent({ ...sdkParams, model });
        const u = res?.usageMetadata ?? {};
        logAiEvent({
          operation: op,
          model,
          tokensIn: Number(u.promptTokenCount) || 0,
          tokensOut:
            (Number(u.candidatesTokenCount) || 0) +
            (Number(u.thoughtsTokenCount) || 0),
          latencyMs: Date.now() - started,
        });
        return res;
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const recoverable = isOverloaded(msg) || isQuota(msg) || isNotFound(msg);
        if (!recoverable) throw e; // e.g. bad key / permission — stop entirely
        // Quota/404 won't clear in seconds — don't retry the same model, move on.
        if (isQuota(msg) || isNotFound(msg)) break;
        if (attempt < perModelRetries) await sleep(600 * (attempt + 1));
      }
    }
    if (model !== chain[chain.length - 1]) {
      console.warn(`[gemini] ${model} unavailable — falling back to next model`);
    }
  }
  throw lastErr;
}

/** Turn a raw Gemini SDK error into a short, human message. */
export function friendlyGeminiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  // Always log the full error server-side for debugging.
  console.error("[gemini] call failed:", msg);
  if (/RESOURCE_EXHAUSTED|quota|429|rate.?limit/i.test(msg)) {
    return "Gemini is rate-limited on the free tier right now. Wait a minute and try again — or add billing to raise the limit.";
  }
  if (/503|UNAVAILABLE|overloaded|high demand/i.test(msg)) {
    return "Gemini is briefly overloaded. Give it a few seconds and try again.";
  }
  if (/API[_ ]?key|401|403|PERMISSION_DENIED|API_KEY_INVALID|unregistered/i.test(msg)) {
    return "Gemini rejected the API key. Create a key at aistudio.google.com/apikey (it should start with 'AIza') and put it in .env.local as GEMINI_API_KEY.";
  }
  if (/404|not found|NOT_FOUND|is not found for API version|not supported|no longer available/i.test(msg)) {
    return `Gemini couldn't find that model. Set GEMINI_MODEL / GEMINI_MARKING_MODEL to a current id like 'gemini-flash-latest' (avoid retired ids like gemini-2.5-flash). (${msg.slice(0, 160)})`;
  }
  // Surface the real cause so it can be diagnosed instead of a dead-end message.
  return `The AI call failed: ${msg.slice(0, 240)}`;
}

const TUTOR_SYSTEM = `You are Atlas, a warm but rigorous Biology & Chemistry tutor for Singapore secondary-school students sitting SEAB (Singapore-Cambridge) examinations.

Rules:
- Teach the SEAB syllabus and Singapore answering conventions. Use precise command words (state, describe, explain, suggest, calculate).
- Be Socratic first: ask a guiding question or give a hint before revealing a full model answer. Reveal the full answer only after the student attempts or explicitly asks.
- Reward examiner technique (keywords, phrasing) as much as concepts.
- If you are not confident the answer is in the syllabus, say so plainly rather than inventing facts.
- Keep replies concise and warm. Use British spelling. Never give dangerous chemistry procedures (explosives, weapons, drugs) even if framed as curriculum.
- Write any maths in LaTeX: inline as $...$ and block as $$...$$. Write chemical formulae/equations with mhchem, e.g. $\\ce{H2O}$, $\\ce{2H2 + O2 -> 2H2O}$.
- If asked something outside Biology/Chemistry or general study skills, gently redirect.`;

export type ChatMessage = { role: "user" | "model"; text: string };

export type ExtractedQuestion = {
  number: string;
  stem: string;
  marks: number;
  type: "mcq" | "structured" | "open_ended" | "data_based" | "diagram" | "practical";
  commandWords: string[];
  topic: string; // must match one of the provided topic names, or "Unknown"
  confidence: number; // 0..1
};

export type PaperMeta = {
  school: string;
  year: string;
  paperType: string; // e.g. Prelim, WA1, SA2, Mid-Year
  subject: string;
};

export type ExtractionResult = { meta: PaperMeta; questions: ExtractedQuestion[] };

/**
 * Read an uploaded past paper and produce ADAPTED practice questions (rephrased
 * in the model's own words — same concept and difficulty, different scenario/
 * values). This deliberately avoids reproducing the copyrighted paper verbatim
 * (which both breaches copyright and triggers Gemini's RECITATION block). Also
 * reads the paper's provenance (school/year/type) from the cover.
 */
export async function extractQuestions(
  fileBase64: string,
  mimeType: string,
  topics: { name: string; subject: string }[]
): Promise<ExtractionResult> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");

  const topicList = topics.map((t) => `- ${t.name} (${t.subject})`).join("\n");

  const prompt = `You are digitising a Singapore secondary-school science exam paper into ADAPTED practice questions.

First, read the cover/header and report the paper's provenance:
- school (e.g. "Anglo-Chinese School (Independent)")
- year (e.g. "2024")
- paperType (e.g. "Prelim", "Mid-Year", "WA1", "SA2", "End-of-Year")
- subject (Biology or Chemistry)

Then, for EVERY question in the paper, write an ADAPTED practice version:
- number: the ORIGINAL question number as printed (e.g. "1", "3(b)", "5(a)(ii)")
- stem: REPHRASE the question IN YOUR OWN WORDS. Keep the same concept, skill and difficulty, but change the scenario, context, values or organism so it is NOT a verbatim copy. If the original is multiple-choice, turn it into a short structured/open-ended question testing the same idea. Preserve any maths/chemistry in LaTeX ($...$, $\\ce{...}$).
- marks: the mark allocation shown, else a sensible estimate.
- type: one of structured, open_ended, data_based (avoid mcq).
- commandWords: SEAB command words (state, describe, explain, suggest, calculate, define…).
- topic: EXACTLY one topic name from this list (verbatim), or "Unknown":
${topicList}
- confidence: 0..1 for the topic classification.

Do NOT copy the paper's original wording. Adapt every question.`;

  const res = await genContent({
    op: "extract",
    model: CHAT_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType, data: fileBase64 } }, { text: prompt }],
      },
    ],
    config: {
      temperature: 0.5,
      maxOutputTokens: 32768,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          school: { type: Type.STRING },
          year: { type: Type.STRING },
          paperType: { type: Type.STRING },
          subject: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.STRING },
                stem: { type: Type.STRING },
                marks: { type: Type.NUMBER },
                type: {
                  type: Type.STRING,
                  enum: ["structured", "open_ended", "data_based"],
                },
                commandWords: { type: Type.ARRAY, items: { type: Type.STRING } },
                topic: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
              },
              required: ["number", "stem", "topic"],
            },
          },
        },
        required: ["questions"],
      },
    },
  });

  try {
    const p = JSON.parse(res.text ?? "{}");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions: ExtractedQuestion[] = (p.questions ?? []).map((q: any) => ({
      number: String(q.number ?? ""),
      stem: String(q.stem ?? ""),
      marks: Number(q.marks) || 1,
      type: q.type ?? "structured",
      commandWords: Array.isArray(q.commandWords) ? q.commandWords : [],
      topic: String(q.topic ?? "Unknown"),
      confidence: Number(q.confidence) || 0,
    })).filter((q: ExtractedQuestion) => q.stem);
    return {
      meta: {
        school: String(p.school ?? ""),
        year: String(p.year ?? ""),
        paperType: String(p.paperType ?? ""),
        subject: String(p.subject ?? ""),
      },
      questions,
    };
  } catch {
    return { meta: { school: "", year: "", paperType: "", subject: "" }, questions: [] };
  }
}

export type SyllabusOutcome = { code: string; statement: string };
export type SyllabusSubtopic = { name: string; outcomes: SyllabusOutcome[] };
export type SyllabusTopic = { name: string; subtopics: SyllabusSubtopic[] };
export type SyllabusTree = {
  subjectName: string; // Biology | Chemistry | Combined Science
  code: string; // e.g. K325
  level: string; // e.g. G3
  track: string; // Pure | Combined
  examBody: string; // SEAB
  topics: SyllabusTopic[];
};

/**
 * Read an official syllabus PDF and extract its structure — the topic →
 * subtopic → learning-outcome tree, plus the syllabus code, subject, level and
 * track. Used by the admin "upload syllabus" flow to seed the curriculum spine.
 */
export async function generateSyllabusTree(
  fileBase64: string,
  mimeType: string
): Promise<SyllabusTree> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");

  const prompt = `You are reading an official Singapore SEAB (Singapore-Cambridge) science syllabus document.

Extract its full structure. Return:
- subjectName: the science subject — exactly "Biology", "Chemistry", or "Combined Science".
- code: the syllabus code printed on the cover (e.g. "K325", "K324", "K328"), else "".
- level: the level as "G3", "G2" or "G1" (SEC uses G1/G2/G3). If it says O-Level, use "G3". Else "".
- track: "Pure" for a single-subject syllabus (Biology or Chemistry on its own), or "Combined" for Combined Science.
- examBody: "SEAB".
- topics: the ordered list of main topics/themes in the syllabus. For each:
  - name: the topic name as printed (e.g. "Cells and the Chemistry of Life", "The Particulate Nature of Matter").
  - subtopics: the sub-sections/headings under the topic. Most topics have SEVERAL subtopics — break them out as printed; do NOT collapse a whole topic into a single subtopic. For each:
    - name: the subtopic name.
    - outcomes: the numbered learning outcomes / learning objectives listed. For each:
      - code: the outcome reference/number as printed (e.g. "1.1", "3.2a"), else "".
      - statement: the learning-outcome text, lightly cleaned (British spelling, maths/chemistry in LaTeX $...$ / $\\ce{...}$). Keep it faithful to the syllabus wording.

Capture every topic and subtopic. If a subtopic has no explicitly numbered outcomes, return an empty outcomes array. Do not invent content that is not in the document.`;

  const res = await genContent({
    op: "syllabus",
    model: CHAT_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType, data: fileBase64 } }, { text: prompt }],
      },
    ],
    config: {
      temperature: 0.2,
      maxOutputTokens: 32768,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjectName: { type: Type.STRING },
          code: { type: Type.STRING },
          level: { type: Type.STRING },
          track: { type: Type.STRING },
          examBody: { type: Type.STRING },
          topics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                subtopics: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      outcomes: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            code: { type: Type.STRING },
                            statement: { type: Type.STRING },
                          },
                          required: ["statement"],
                        },
                      },
                    },
                    required: ["name"],
                  },
                },
              },
              required: ["name"],
            },
          },
        },
        required: ["subjectName", "topics"],
      },
    },
  });

  try {
    const p = JSON.parse(res.text ?? "{}");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topics: SyllabusTopic[] = (p.topics ?? []).map((t: any) => ({
      name: String(t.name ?? "").trim(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subtopics: (t.subtopics ?? []).map((s: any) => ({
        name: String(s.name ?? "").trim(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outcomes: (s.outcomes ?? [])
          .map((o: any) => ({
            code: String(o.code ?? "").trim(),
            statement: String(o.statement ?? "").trim(),
          }))
          .filter((o: SyllabusOutcome) => o.statement),
      })).filter((s: SyllabusSubtopic) => s.name),
    })).filter((t: SyllabusTopic) => t.name);

    return {
      subjectName: String(p.subjectName ?? "").trim(),
      code: String(p.code ?? "").trim(),
      level: String(p.level ?? "").trim(),
      track: String(p.track ?? "").trim(),
      examBody: String(p.examBody ?? "SEAB").trim() || "SEAB",
      topics,
    };
  } catch {
    return { subjectName: "", code: "", level: "", track: "", examBody: "SEAB", topics: [] };
  }
}

export type TopicNotes = {
  keyPoints: string[];
  misconceptions: { claim: string; correction: string }[];
};

/** Generate quick revision notes + common misconceptions for a topic. */
export async function generateTopicNotes(
  topicName: string,
  outcomes: string[]
): Promise<TopicNotes> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");

  const prompt = `Write concise revision notes for the SEAB O-Level science topic "${topicName}".
${outcomes.length ? `Cover these learning outcomes:\n${outcomes.map((o) => `- ${o}`).join("\n")}` : ""}

Return:
- keyPoints: 6–10 short bullet points of the must-know facts and exam keywords (each one line, British spelling; maths/chemistry in LaTeX $...$ / $\\ce{...}$).
- misconceptions: 3–5 common student misconceptions, each with the wrong "claim" and the "correction".`;

  const res = await genContent({
    op: "notes",
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          misconceptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                claim: { type: Type.STRING },
                correction: { type: Type.STRING },
              },
              required: ["claim", "correction"],
            },
          },
        },
        required: ["keyPoints", "misconceptions"],
      },
    },
  });

  try {
    const p = JSON.parse(res.text ?? "{}");
    return {
      keyPoints: Array.isArray(p.keyPoints) ? p.keyPoints.map(String) : [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      misconceptions: Array.isArray(p.misconceptions)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p.misconceptions.map((m: any) => ({
            claim: String(m.claim ?? ""),
            correction: String(m.correction ?? ""),
          }))
        : [],
    };
  } catch {
    return { keyPoints: [], misconceptions: [] };
  }
}

export type GeneratedCard = { front: string; back: string };

/** Generate flashcards for a topic/subtopic (Lumi-style AI decks). */
export async function generateFlashcards(
  subtopicName: string,
  outcomes: string[],
  count = 8
): Promise<GeneratedCard[]> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");

  const prompt = `Create ${count} exam-revision flashcards for the SEAB "${subtopicName}" topic, in the style of Quizlet definition cards.
${outcomes.length ? `Base them on these learning outcomes:\n${outcomes.map((o) => `- ${o}`).join("\n")}` : ""}

Rules:
- FRONT = a key TERM, structure, definition prompt or short recall question (e.g. an organelle name, "Define diffusion", a keyword). BACK = the precise SEAB-keyword answer/definition/function a student must know.
- Prefer term→definition and structure→function pairs (e.g. front "Mitochondrion" / back "Site of aerobic respiration; releases energy for the cell"). Cover every important term, structure, definition and process in the topic.
- Keep each side short and exam-precise. British spelling. Maths/chemistry in LaTeX ($...$, $\\ce{...}$).`;

  const res = await genContent({
    op: "flashcards",
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
          },
          required: ["front", "back"],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(res.text ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed
      .map((c: any) => ({ front: String(c.front ?? ""), back: String(c.back ?? "") }))
      .filter((c: GeneratedCard) => c.front && c.back);
  } catch {
    return [];
  }
}

export type GeneratedExamQuestion = {
  stem: string;
  marks: number;
  type: "structured" | "open_ended" | "data_based";
  commandWords: string[];
  topic: string;
};

/** A topic plus the context that grounds question generation. */
export type TopicContext = {
  name: string;
  outcomes: string[]; // syllabus learning outcomes = the scope we may test
  examples: string[]; // stems from real uploaded papers = the style to match
};

/**
 * Generate fresh practice questions grounded in the syllabus outcomes and
 * styled after real uploaded papers. Deliberately fair: only tests content in
 * the given outcomes, and never requires a diagram/figure the student can't see.
 */
export async function generateExamQuestions(
  topics: TopicContext[],
  count: number
): Promise<GeneratedExamQuestion[]> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");

  const topicBlocks = topics
    .map((t) => {
      const outcomes = t.outcomes.length
        ? t.outcomes.map((o) => `  • ${o}`).join("\n")
        : "  (use the standard SEAB syllabus content for this topic)";
      const examples = t.examples.length
        ? `\n Example questions from real school papers (match this STYLE and difficulty — do NOT copy them):\n${t.examples
            .map((e) => `  • ${e}`)
            .join("\n")}`
        : "";
      return `TOPIC: ${t.name}\n Syllabus outcomes you may test:\n${outcomes}${examples}`;
    })
    .join("\n\n");

  const prompt = `You are setting a fair Singapore SEAB science practice paper for a G3 (upper-secondary) student.

Write ${count} exam questions, spread as evenly as possible across the topics below.

${topicBlocks}

Rules:
- SCOPE: test ONLY ideas covered by the syllabus outcomes listed for each topic. Do NOT ask about named species, brand names, obscure facts, or details a G3 student would not have studied (e.g. the internal structure of a specific named bacterium).
- SELF-CONTAINED: every question must be fully answerable from its own text. Do NOT write a question that depends on reading a diagram, figure, graph, image or table that is not written into the question. If data is needed, state the numbers in words within the question.
- Mix command words (state, describe, explain, suggest, calculate, define) and mark values (1–5).
- Make them genuinely varied — different contexts, data and scenarios each time; match the phrasing style of the example questions above.
- type is one of: structured, open_ended, data_based (no MCQ).
- topic must be copied verbatim from a TOPIC line above.
- Write any maths/chemistry in LaTeX ($...$, $\\ce{...}$).
Return only the questions.`;

  const res = await genContent({
    op: "paper",
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      temperature: 1.0, // high → fresh questions each call
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            stem: { type: Type.STRING },
            marks: { type: Type.NUMBER },
            type: {
              type: Type.STRING,
              enum: ["structured", "open_ended", "data_based"],
            },
            commandWords: { type: Type.ARRAY, items: { type: Type.STRING } },
            topic: { type: Type.STRING },
          },
          required: ["stem", "marks", "topic"],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(res.text ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed
      .map((q: any) => ({
        stem: String(q.stem ?? ""),
        marks: Math.max(1, Math.min(5, Math.round(Number(q.marks) || 2))),
        type: q.type ?? "structured",
        commandWords: Array.isArray(q.commandWords) ? q.commandWords : [],
        topic: String(q.topic ?? ""),
      }))
      .filter((q: GeneratedExamQuestion) => q.stem);
  } catch {
    return [];
  }
}

// ── Question bank: generate questions WITH their mark schemes ─────────────────

export type QuestionAnswer = { modelAnswer: string; points: string[] };

/**
 * Generate model answers + mark-scheme points for a batch of questions (e.g.
 * questions extracted from a paper that have no stored answer). Returns one
 * answer per input question, in order.
 */
export async function generateAnswersForQuestions(
  items: { stem: string; marks: number }[],
  subject: string
): Promise<QuestionAnswer[]> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");
  if (items.length === 0) return [];

  const prompt = `You are a Singapore SEAB ${subject} teacher writing an answer key. For each question below, give a concise full-marks model answer and the mark-scheme points (one per mark). Use British spelling; write maths/chemistry in LaTeX ($...$, $\\ce{...}$).

Questions:
${items.map((q, i) => `${i + 1}. (${q.marks} mark${q.marks === 1 ? "" : "s"}) ${q.stem}`).join("\n\n")}

Return an array with exactly ${items.length} entries, in the same order.`;

  const res = await genContent({
    op: "answers",
    model: MARK_MODEL,
    contents: prompt,
    config: {
      temperature: 0.2,
      maxOutputTokens: 32768,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            modelAnswer: { type: Type.STRING },
            points: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["modelAnswer"],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(res.text ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed.map((a: any) => ({
      modelAnswer: String(a.modelAnswer ?? ""),
      points: Array.isArray(a.points) ? a.points.map(String) : [],
    }));
  } catch {
    return [];
  }
}

export type SchemePoint = { point: string; keywords: string[] };
export type BankQuestionGen = {
  stem: string;
  marks: number;
  type: "structured" | "open_ended" | "data_based";
  commandWords: string[];
  topic: string;
  markScheme: SchemePoint[];
  modelAnswer: string;
};

/**
 * Generate bank questions that each carry their own mark scheme + model answer,
 * so they can be stored once and marked for every student without a fresh call
 * to derive a scheme. Same grounding/fairness rules as generateExamQuestions.
 */
export async function generateBankBatch(
  topics: TopicContext[],
  count: number
): Promise<BankQuestionGen[]> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");

  const topicBlocks = topics
    .map((t) => {
      const outcomes = t.outcomes.length
        ? t.outcomes.map((o) => `  • ${o}`).join("\n")
        : "  (use the standard SEAB syllabus content for this topic)";
      const examples = t.examples.length
        ? `\n Example questions from real papers (match STYLE, don't copy):\n${t.examples
            .map((e) => `  • ${e}`)
            .join("\n")}`
        : "";
      return `TOPIC: ${t.name}\n Syllabus outcomes you may test:\n${outcomes}${examples}`;
    })
    .join("\n\n");

  const prompt = `You are writing a fair Singapore SEAB science practice bank for a G3 (upper-secondary) student, WITH a mark scheme for each question.

Write ${count} questions spread evenly across the topics below.

${topicBlocks}

For EACH question provide:
- stem: the question. SCOPE: only ideas in the outcomes above; no obscure/out-of-syllabus specifics (e.g. the internal structure of a named bacterium). SELF-CONTAINED: never depend on a diagram/figure/table not written into the stem.
- marks: 1–5.
- type: structured | open_ended | data_based (no MCQ).
- commandWords: the SEAB command words used.
- topic: copied verbatim from a TOPIC line above.
- markScheme: an array with exactly one entry PER MARK (so a 3-mark question has 3 entries). Each entry: { point: the creditable idea in examiner language, keywords: 2–5 short accept-words/phrases a marker would look for }.
- modelAnswer: a concise full-marks answer.
Write maths/chemistry in LaTeX ($...$, $\\ce{...}$). Return only the questions.`;

  const res = await genContent({
    op: "bank",
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.9,
      maxOutputTokens: 32768,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            stem: { type: Type.STRING },
            marks: { type: Type.NUMBER },
            type: {
              type: Type.STRING,
              enum: ["structured", "open_ended", "data_based"],
            },
            commandWords: { type: Type.ARRAY, items: { type: Type.STRING } },
            topic: { type: Type.STRING },
            markScheme: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  point: { type: Type.STRING },
                  keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["point", "keywords"],
              },
            },
            modelAnswer: { type: Type.STRING },
          },
          required: ["stem", "marks", "topic", "markScheme"],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(res.text ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed
      .map((q: any) => ({
        stem: String(q.stem ?? ""),
        marks: Math.max(1, Math.min(5, Math.round(Number(q.marks) || 2))),
        type: q.type ?? "structured",
        commandWords: Array.isArray(q.commandWords) ? q.commandWords : [],
        topic: String(q.topic ?? ""),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        markScheme: (Array.isArray(q.markScheme) ? q.markScheme : [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => ({
            point: String(p.point ?? ""),
            keywords: Array.isArray(p.keywords) ? p.keywords.map(String) : [],
          }))
          .filter((p: SchemePoint) => p.point),
        modelAnswer: String(q.modelAnswer ?? ""),
      }))
      .filter((q: BankQuestionGen) => q.stem && q.markScheme.length > 0);
  } catch {
    return [];
  }
}

/**
 * Free, offline keyword marking against a stored scheme. Awards a mark for a
 * scheme point when the answer contains at least one of its keywords. Returns
 * the mark result plus a `borderline` flag: true when the score is partial and
 * the answer is substantive enough that a nuanced AI re-mark is worthwhile.
 */
export function markAgainstScheme(input: {
  scheme: SchemePoint[];
  modelAnswer: string;
  marks: number;
  studentAnswer: string;
}): { result: MarkResult; borderline: boolean } {
  const ans = input.studentAnswer.toLowerCase();
  const max = input.marks || input.scheme.length || 1;
  const awardedPoints: string[] = [];
  const missingPoints: string[] = [];
  let nearMisses = 0;

  const norm = (s: string) => s.toLowerCase().trim();
  for (const p of input.scheme) {
    const kws = p.keywords.map(norm).filter(Boolean);
    const hit = kws.some((k) => k.length > 0 && ans.includes(k));
    if (hit) awardedPoints.push(p.point);
    else {
      missingPoints.push(p.point);
      // Partial-word overlap suggests the idea may be there in other words.
      const words = ans.split(/\W+/);
      const partial = kws.some((k) =>
        k.split(/\s+/).some((tok) => tok.length > 3 && words.includes(tok))
      );
      if (partial) nearMisses++;
    }
  }

  const awarded = Math.min(max, awardedPoints.length);
  const trivial = ans.replace(/\s+/g, "").length < 8;
  // Worth an AI second look when it's a partial score with real content, or a
  // zero on a non-trivial answer (likely paraphrased rather than wrong).
  const borderline =
    !trivial && ((awarded > 0 && awarded < max) || (awarded === 0 && nearMisses > 0) || (awarded === 0 && ans.length > 60));

  return {
    result: {
      awarded,
      max,
      awardedPoints,
      missingPoints,
      errorType: awarded === max ? "none" : "knowledge",
      modelAnswer: input.modelAnswer,
      improvedAnswer: input.modelAnswer,
      feedback:
        awarded === max
          ? "Full marks — you covered every marking point."
          : `You earned ${awarded}/${max}. Missing: ${missingPoints.join("; ") || "—"}.`,
    },
    borderline,
  };
}

const IMAGE_MODELS = (
  process.env.GEMINI_IMAGE_MODELS ??
  "gemini-2.5-flash-image,gemini-3.1-flash-image"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Generate a clean black-and-white educational diagram for a term (e.g. an
 * organelle) suitable for a flashcard and for black-and-white printing.
 * Returns the raw image bytes (base64) or null if unavailable.
 */
export async function generateDiagram(
  term: string,
  subject: string
): Promise<{ data: string; mimeType: string } | null> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");
  const prompt = `A clean, simple, black-and-white educational line-art diagram of "${term}" for a ${subject} revision flashcard. Clearly labelled with thin black lines on a white background, minimal shading, no colour, textbook style, suitable for printing in black and white.`;

  let lastErr: unknown;
  for (const model of IMAGE_MODELS) {
    try {
      const res = await client().models.generateContent({ model, contents: prompt });
      const parts = res.candidates?.[0]?.content?.parts ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const img = parts.find((p: any) => p.inlineData?.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inline = (img as any)?.inlineData;
      if (inline?.data) {
        return { data: inline.data as string, mimeType: (inline.mimeType as string) ?? "image/png" };
      }
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!isOverloaded(msg) && !isQuota(msg) && !isNotFound(msg)) throw e;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

/**
 * Generate a black-and-white diagram that an exam question refers to (e.g. the
 * micrograph/figure a paper question is based on), so students have something
 * to work from. Best-effort: it reconstructs the described structure, not the
 * exact original figure. Returns image bytes or null.
 */
export async function generateQuestionDiagram(
  stem: string,
  subject: string
): Promise<{ data: string; mimeType: string } | null> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");
  const prompt = `Draw the clean, black-and-white, clearly labelled ${subject} diagram that the following exam question refers to, so a student can attempt it. Thin black lines on a white background, textbook style, no colour, suitable for black-and-white printing. Label the relevant structures.

QUESTION: ${stem}`;

  let lastErr: unknown;
  for (const model of IMAGE_MODELS) {
    try {
      const res = await client().models.generateContent({ model, contents: prompt });
      const parts = res.candidates?.[0]?.content?.parts ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inline = (parts.find((p: any) => p.inlineData?.data) as any)?.inlineData;
      if (inline?.data) return { data: inline.data as string, mimeType: (inline.mimeType as string) ?? "image/png" };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!isOverloaded(msg) && !isQuota(msg) && !isNotFound(msg)) throw e;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

/** Heuristic: does a question depend on a figure/diagram the student needs? */
export function referencesDiagram(stem: string): boolean {
  return /\b(diagram|figure|fig\.?|micrograph|graph|shown|labelled|labeled|image|photograph|illustration|below|following diagram)\b/i.test(
    stem
  );
}

export type GeneratedCloze = { text: string; answer: string };

/** Generate fill-in-the-blank items for a subtopic. */
export async function generateCloze(
  subtopicName: string,
  outcomes: string[],
  count = 8
): Promise<GeneratedCloze[]> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");

  const prompt = `Create ${count} fill-in-the-blank revision sentences for the SEAB O-Level topic "${subtopicName}".
${outcomes.length ? `Base them on these learning outcomes:\n${outcomes.map((o) => `- ${o}`).join("\n")}` : ""}

Rules: each sentence must state a key fact and hide ONE important keyword/phrase (the answer a student must recall) by wrapping it in double braces, e.g. "Osmosis moves water across a {{partially permeable}} membrane." The "answer" field = the exact text inside the braces. Keep sentences short and unambiguous, with only ONE blank each. Use British spelling.`;

  const res = await genContent({
    op: "cloze",
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            answer: { type: Type.STRING },
          },
          required: ["text", "answer"],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(res.text ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed
      .map((c: any) => ({ text: String(c.text ?? ""), answer: String(c.answer ?? "") }))
      .filter((c: GeneratedCloze) => c.text.includes("{{") && c.answer);
  } catch {
    return [];
  }
}

export async function tutorReply(
  messages: ChatMessage[],
  topicContext?: string
): Promise<{ text: string; grounded: boolean }> {
  if (!isGeminiConfigured) {
    return {
      text: "The AI tutor isn't connected yet. Add your GEMINI_API_KEY to .env.local and restart, and I'll be able to help you here — grounded in the SEAB syllabus, with a hint before the full answer.",
      grounded: false,
    };
  }

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const systemInstruction = topicContext
    ? `${TUTOR_SYSTEM}\n\nThe student is currently studying: ${topicContext}. Prefer this context.`
    : TUTOR_SYSTEM;

  const res = await genContent({
    op: "chat",
    model: CHAT_MODEL,
    contents,
    config: {
      systemInstruction,
      temperature: 0.6,
      maxOutputTokens: 700,
    },
  });

  return { text: res.text ?? "", grounded: true };
}

export type MarkResult = {
  awarded: number;
  max: number;
  missingPoints: string[];
  awardedPoints: string[];
  errorType: "conceptual" | "careless" | "technique" | "knowledge" | "none";
  modelAnswer: string;
  improvedAnswer: string;
  feedback: string;
};

export async function markAnswer(input: {
  stem: string;
  marks: number;
  markingPoints: string[];
  modelAnswer: string;
  acceptedKeywords: string[];
  studentAnswer: string;
}): Promise<MarkResult> {
  if (!isGeminiConfigured) {
    return {
      awarded: 0,
      max: input.marks,
      missingPoints: input.markingPoints,
      awardedPoints: [],
      errorType: "none",
      modelAnswer: input.modelAnswer,
      improvedAnswer: input.modelAnswer,
      feedback:
        "AI marking isn't connected yet. Add GEMINI_API_KEY to .env.local to have Atlas mark this against the SEAB scheme.",
    };
  }

  const prompt = `Mark this student's answer strictly against the SEAB mark scheme.

QUESTION (${input.marks} marks): ${input.stem}

MARKING POINTS (award one mark per point genuinely made):
${input.markingPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

ACCEPTED KEYWORDS: ${input.acceptedKeywords.join(", ")}

MODEL ANSWER: ${input.modelAnswer}

STUDENT ANSWER: "${input.studentAnswer}"

Award marks like a Singapore examiner. Be specific about which marking points the student earned and which are missing. Classify the dominant error (conceptual / careless / technique / knowledge, or "none" if full marks). Provide an improved version of THE STUDENT'S OWN answer that would score full marks.`;

  const res = await genContent({
    op: "mark",
    model: MARK_MODEL,
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          awarded: { type: Type.NUMBER },
          missingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          awardedPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          errorType: {
            type: Type.STRING,
            enum: ["conceptual", "careless", "technique", "knowledge", "none"],
          },
          improvedAnswer: { type: Type.STRING },
          feedback: { type: Type.STRING },
        },
        required: [
          "awarded",
          "missingPoints",
          "awardedPoints",
          "errorType",
          "improvedAnswer",
          "feedback",
        ],
      },
    },
  });

  try {
    const parsed = JSON.parse(res.text ?? "{}");
    return {
      awarded: Math.min(input.marks, Math.max(0, Number(parsed.awarded) || 0)),
      max: input.marks,
      missingPoints: parsed.missingPoints ?? [],
      awardedPoints: parsed.awardedPoints ?? [],
      errorType: parsed.errorType ?? "none",
      modelAnswer: input.modelAnswer,
      improvedAnswer: parsed.improvedAnswer ?? input.modelAnswer,
      feedback: parsed.feedback ?? "",
    };
  } catch {
    return {
      awarded: 0,
      max: input.marks,
      missingPoints: input.markingPoints,
      awardedPoints: [],
      errorType: "none",
      modelAnswer: input.modelAnswer,
      improvedAnswer: input.modelAnswer,
      feedback: "Couldn't parse the marking response. Please try again.",
    };
  }
}

/**
 * Mark an open-ended answer when there is NO stored mark scheme (e.g. a question
 * extracted from an uploaded paper). Gemini derives an SEAB-style scheme itself,
 * then marks against it.
 */
export async function markOpenEnded(input: {
  stem: string;
  marks: number;
  studentAnswer: string;
}): Promise<MarkResult> {
  if (!isGeminiConfigured) {
    return {
      awarded: 0,
      max: input.marks,
      missingPoints: [],
      awardedPoints: [],
      errorType: "none",
      modelAnswer: "",
      improvedAnswer: "",
      feedback: "AI marking isn't connected. Add GEMINI_API_KEY to .env.local.",
    };
  }

  const prompt = `You are a Singapore O-Level (SEAB) examiner. First derive the mark scheme for the question, then mark the student's answer against it.

QUESTION (${input.marks} marks): ${input.stem}

STUDENT ANSWER: "${input.studentAnswer}"

Award marks like a Singapore examiner (one mark per valid point, up to ${input.marks}). Return: the marking points the student earned, the ones missing, the dominant error type (conceptual/careless/technique/knowledge, or "none"), a full-marks model answer, and an improved version of the student's own answer.`;

  const res = await genContent({
    op: "mark",
    model: MARK_MODEL,
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          awarded: { type: Type.NUMBER },
          missingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          awardedPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          errorType: {
            type: Type.STRING,
            enum: ["conceptual", "careless", "technique", "knowledge", "none"],
          },
          modelAnswer: { type: Type.STRING },
          improvedAnswer: { type: Type.STRING },
          feedback: { type: Type.STRING },
        },
        required: ["awarded", "missingPoints", "awardedPoints", "errorType", "modelAnswer", "improvedAnswer", "feedback"],
      },
    },
  });

  try {
    const p = JSON.parse(res.text ?? "{}");
    return {
      awarded: Math.min(input.marks, Math.max(0, Number(p.awarded) || 0)),
      max: input.marks,
      missingPoints: p.missingPoints ?? [],
      awardedPoints: p.awardedPoints ?? [],
      errorType: p.errorType ?? "none",
      modelAnswer: p.modelAnswer ?? "",
      improvedAnswer: p.improvedAnswer ?? "",
      feedback: p.feedback ?? "",
    };
  } catch {
    return {
      awarded: 0,
      max: input.marks,
      missingPoints: [],
      awardedPoints: [],
      errorType: "none",
      modelAnswer: "",
      improvedAnswer: "",
      feedback: "Couldn't parse the marking response. Please try again.",
    };
  }
}
