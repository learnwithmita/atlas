import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY ?? "";
const CHAT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
// Default to flash: gemini-2.5-pro is not available on the Gemini free tier.
const MARK_MODEL = process.env.GEMINI_MARKING_MODEL ?? "gemini-2.5-flash";

export const isGeminiConfigured = API_KEY.length > 0;

function client() {
  return new GoogleGenAI({ apiKey: API_KEY });
}

/** Turn a raw Gemini SDK error into a short, human message. */
export function friendlyGeminiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/RESOURCE_EXHAUSTED|quota|429|rate.?limit/i.test(msg)) {
    return "The AI is rate-limited on Gemini's free tier right now. Wait a minute and try again — or add billing / use gemini-2.5-flash to raise the limit.";
  }
  if (/API key|401|403|PERMISSION_DENIED|invalid/i.test(msg)) {
    return "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local (it should start with 'AIza').";
  }
  return "The AI hit an unexpected error. Please try again in a moment.";
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
