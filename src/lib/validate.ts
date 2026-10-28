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
 * Sniff an image's real type from its magic bytes, returning our file-extension
 * token ("png" | "jpg" | "webp" | "gif") or null if it matches none. Used to
 * verify uploads instead of trusting the client-declared MIME type.
 */
export function sniffImageExt(
  buf: Buffer | Uint8Array
): "png" | "jpg" | "webp" | "gif" | null {
  const b = buf;
  if (b.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
    return "png";
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  // GIF: "GIF87a" / "GIF89a"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return "gif";
  // WEBP: "RIFF"????"WEBP"
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "webp";
  return null;
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
