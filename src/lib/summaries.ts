/**
 * Topic summary sheets. The clean master PNGs live server-only in
 * /assets/summaries (NOT in /public), so there is no un-watermarked copy anyone
 * can fetch. They are delivered through the Pro-gated image route
 * /learn/summary/[topicId]/image, which stamps the viewing student's identity
 * onto the sheet and logs the view. Keyed by topic id so a rename can't break
 * the mapping.
 *
 * In-app, a topic is shown as a single (possibly tall) image. For download we
 * can instead serve a multi-page A4 PDF so a long sheet prints at a readable
 * size: TOPIC_SUMMARY_PDF_PAGES lists the per-page masters, stamped and
 * assembled by the /learn/summary/[topicId]/pdf route. A topic without a PDF
 * entry simply downloads its single image.
 */
const TOPIC_SUMMARY_FILES: Record<string, string> = {
  // Pure Biology · Cell Structure and Organisation
  "d68d5046-49f0-4bc9-b226-3a490d2ace3f": "cell-structure-and-organisation.png",
  // Respiration in Humans (Pure Biology + Combined Science share the sheet)
  "010586ac-1766-4ddc-ad9b-7c2c6f6aac23": "respiration-in-humans.png",
  "dd6bcdf2-3c48-454e-8c15-62380a133197": "respiration-in-humans.png",
  // Pure Biology · Biological Molecules
  "e5cf8781-5b55-4b87-9bcb-6b7ce4b305f6": "biological-molecules.png",
  // Nutrition in Humans (Pure Biology + Combined Science share the sheet)
  "83825cbf-2598-4b22-9033-8b404325cf5b": "nutrition-in-humans.png",
  "f10538b5-b552-494b-b3da-aa3ef6e2f459": "nutrition-in-humans.png",
  // Movement of Substances (Pure Biology + Combined Science share the sheet)
  "2db5a461-038c-4b10-aba6-45adb651657f": "movement-of-substances.png",
  "f13eeb66-e051-4b81-ad69-e632cf4cd5ed": "movement-of-substances.png",
};

/**
 * Per-page A4 masters for the downloadable PDF, in order. Only topics whose
 * single sheet is too tall to print at a readable size need this; others fall
 * back to downloading the single image.
 */
const TOPIC_SUMMARY_PDF_PAGES: Record<string, string[]> = {
  // Nutrition in Humans — two A4 pages (shared by both syllabuses).
  "83825cbf-2598-4b22-9033-8b404325cf5b": [
    "nutrition-in-humans-p1.png",
    "nutrition-in-humans-p2.png",
  ],
  "f10538b5-b552-494b-b3da-aa3ef6e2f459": [
    "nutrition-in-humans-p1.png",
    "nutrition-in-humans-p2.png",
  ],
};

/** Server-only master filename for a topic's single in-app image, or null. */
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

/** Ordered per-page masters for a topic's downloadable PDF, or null if none. */
export function summaryPdfPagesForTopic(topicId: string): string[] | null {
  return TOPIC_SUMMARY_PDF_PAGES[topicId] ?? null;
}

/** Whether a topic has a dedicated multi-page PDF download. */
export function hasSummaryPdf(topicId: string): boolean {
  return summaryPdfPagesForTopic(topicId) !== null;
}

/** The Pro-gated, per-student PDF download endpoint for a topic's summary. */
export function summaryPdfUrl(topicId: string): string {
  return `/learn/summary/${topicId}/pdf`;
}
