/**
 * Topic summary sheets. The clean master PNGs live server-only in
 * /assets/summaries (NOT in /public), so there is no un-watermarked copy anyone
 * can fetch. They are delivered through the Pro-gated image route
 * /learn/summary/[topicId]/image, which stamps the viewing student's identity
 * onto the sheet and logs the view. Keyed by topic id so a rename can't break
 * the mapping.
 */
const TOPIC_SUMMARY_FILES: Record<string, string> = {
  // Pure Biology · Cell Structure and Organisation
  "d68d5046-49f0-4bc9-b226-3a490d2ace3f": "cell-structure-and-organisation.png",
  // Respiration in Humans (Pure Biology + Combined Science share the sheet)
  "010586ac-1766-4ddc-ad9b-7c2c6f6aac23": "respiration-in-humans.png",
  "dd6bcdf2-3c48-454e-8c15-62380a133197": "respiration-in-humans.png",
};

/** Server-only master filename for a topic, or null if none is published. */
export function summaryFileForTopic(topicId: string): string | null {
  return TOPIC_SUMMARY_FILES[topicId] ?? null;
}

/** Whether a topic has a published summary sheet. */
export function hasSummary(topicId: string): boolean {
  return summaryFileForTopic(topicId) !== null;
}

/** The Pro-gated, per-student image endpoint for a topic's summary. */
export function summaryImageUrl(topicId: string): string {
  return `/learn/summary/${topicId}/image`;
}
