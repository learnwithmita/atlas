import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Render an admin-authored markdown note document to HTML. Content is authored
 * by staff only (RLS-gated), so it is trusted; callers wrap the output in the
 * `.notes-prose` container for styling. Returns an empty string for empty input.
 */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return marked.parse(md, { async: false }) as string;
}
