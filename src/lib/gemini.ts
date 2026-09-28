import { GoogleGenAI, Type } from "@google/genai";

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

// When the primary model is overloaded (503), fall through to lighter models
// that are far less contended. Override with GEMINI_FALLBACK_MODELS (CSV).
const FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ??
  "gemini-flash-lite-latest,gemini-2.5-flash,gemini-2.5-flash-lite"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isOverloaded = (msg: string) =>
  /503|UNAVAILABLE|overloaded|high demand/i.test(msg);
const isQuota = (msg: string) => /429|RESOURCE_EXHAUSTED|quota/i.test(msg);

/**
 * Call Gemini resiliently:
 *  - retry the primary model on transient overload (503),
 *  - fall through to lighter fallback models when the primary is overloaded
 *    (503) OR its per-model free-tier quota is exhausted (429) — each model has
 *    its own quota bucket, so a sibling model often still works,
 *  - fail fast on hard errors (bad key, 404).
 * Callers still catch the final throw and fall back to bank/paper questions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function genContent(params: any, perModelRetries = 1): Promise<any> {
  const primary = params.model as string;
  const chain = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  let lastErr: unknown;
  for (const model of chain) {
    for (let attempt = 0; attempt <= perModelRetries; attempt++) {
      try {
        return await client().models.generateContent({ ...params, model });
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const overloaded = isOverloaded(msg);
        const quota = isQuota(msg);
        if (!overloaded && !quota) throw e; // hard error — stop entirely
        // Quota won't clear in seconds, so don't retry the same model — move on.
        if (quota) break;
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
  if (/404|not found|NOT_FOUND|is not found for API version|not supported/i.test(msg)) {
    return `Gemini couldn't find that model. Set GEMINI_MODEL / GEMINI_MARKING_MODEL to a valid id like 'gemini-2.5-flash'. (${msg.slice(0, 160)})`;
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
