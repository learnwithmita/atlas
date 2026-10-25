/**
 * Approved topic summary sheets, served as static assets from /public/summaries.
 *
 * These are authored offline (generated, then hand-refined in Figma and pulled
 * back in) and committed per topic. They are Pro-tier content: gate every view
 * with getEntitlement().isPro. Keyed by topic id so a topic rename can't break
 * the mapping.
 */
export const TOPIC_SUMMARIES: Record<string, string> = {
  // Pure Biology · Cell Structure and Organisation
  "d68d5046-49f0-4bc9-b226-3a490d2ace3f":
    "/summaries/cell-structure-and-organisation.png",
  // Respiration in Humans (Pure Biology + Combined Science share the sheet)
  "010586ac-1766-4ddc-ad9b-7c2c6f6aac23": "/summaries/respiration-in-humans.png",
  "dd6bcdf2-3c48-454e-8c15-62380a133197": "/summaries/respiration-in-humans.png",
};

/** The summary asset path for a topic, or null if none is published yet. */
export function summaryForTopic(topicId: string): string | null {
  return TOPIC_SUMMARIES[topicId] ?? null;
}
