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

/** Turn a raw Gemini SDK error into a short, human message. */
export function friendlyGeminiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  // Always log the full error server-side for debugging.
  console.error("[gemini] call failed:", msg);
  if (/RESOURCE_EXHAUSTED|quota|429|rate.?limit/i.test(msg)) {
    return "Gemini is rate-limited on the free tier right now. Wait a minute and try again — or add billing to raise the limit.";
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

/**
 * Extract exam questions from an uploaded paper (PDF or image) and classify
 * each to a syllabus topic from the provided list.
 */
export async function extractQuestions(
  fileBase64: string,
  mimeType: string,
  topics: { name: string; subject: string }[]
): Promise<ExtractedQuestion[]> {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY missing");

  const topicList = topics
    .map((t) => `- ${t.name} (${t.subject})`)
    .join("\n");

  const prompt = `You are an SEAB examiner digitising a Singapore O-Level science exam paper.

Extract EVERY distinct question (and sub-part) from the attached document. For each, return:
- number: the question label as printed (e.g. "1", "3(b)", "5(a)(ii)")
- stem: the full question text, cleaned up. Preserve chemical formulae, subscripts and units in plain text (e.g. "H2O", "CO2", "24 dm3").
- marks: the mark allocation if shown, else your best estimate.
- type: one of mcq, structured, open_ended, data_based, diagram, practical.
- commandWords: the SEAB command words used (state, describe, explain, suggest, calculate, define, etc.).
- topic: classify to EXACTLY ONE topic name from this list (copy the name verbatim); if unsure use "Unknown":
${topicList}
- confidence: 0 to 1, how sure you are of the topic.

Return only questions actually present in the document. Do not invent questions.`;

  const res = await client().models.generateContent({
    model: CHAT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: fileBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            number: { type: Type.STRING },
            stem: { type: Type.STRING },
            marks: { type: Type.NUMBER },
            type: {
              type: Type.STRING,
              enum: ["mcq", "structured", "open_ended", "data_based", "diagram", "practical"],
            },
            commandWords: { type: Type.ARRAY, items: { type: Type.STRING } },
            topic: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ["stem", "topic"],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(res.text ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed.map((q: any) => ({
      number: String(q.number ?? ""),
      stem: String(q.stem ?? ""),
      marks: Number(q.marks) || 1,
      type: q.type ?? "structured",
      commandWords: Array.isArray(q.commandWords) ? q.commandWords : [],
      topic: String(q.topic ?? "Unknown"),
      confidence: Number(q.confidence) || 0,
    }));
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

  const res = await client().models.generateContent({
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

  const res = await client().models.generateContent({
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

  const res = await client().models.generateContent({
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
