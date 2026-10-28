/**
 * Small server-side input guards for untrusted request bodies. Keep these
 * dependency-free and cheap; they run before any expensive work (DB, AI calls).
 */

/** Longest student answer we will send to the AI marker. A 6-mark free-response
 * answer is well under this; the cap stops oversized payloads from inflating
 * Gemini cost or latency. */
export const MAX_ANSWER_CHARS = 6000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a canonical UUID string. */
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/**
 * Validate and normalise a student answer. Returns the trimmed answer, or an
 * error string suitable for a 400 response. Rejects non-strings, empty answers,
 * and anything over MAX_ANSWER_CHARS.
 */
export function cleanAnswer(
  v: unknown
): { ok: true; answer: string } | { ok: false; error: string } {
  if (typeof v !== "string") return { ok: false, error: "Answer is required." };
  const answer = v.trim();
  if (answer.length === 0)
    return { ok: false, error: "Type an answer before marking." };
  if (answer.length > MAX_ANSWER_CHARS)
    return {
      ok: false,
      error: `Answer is too long (max ${MAX_ANSWER_CHARS} characters).`,
    };
  return { ok: true, answer };
}
