import katex from "katex";
import "katex/dist/contrib/mhchem.js"; // enables \ce{...} for chemistry
import { cn } from "@/lib/utils";

/**
 * Repair LaTeX whose backslash-escapes were eaten by a JSON round-trip: a
 * command like `\text` or `\rightarrow` can arrive with its `\t` / `\r` turned
 * into a real tab / carriage-return character (and `\f` `\b` `\v` similarly).
 * Inside math these control chars are never meaningful, so restore the command.
 */
function repairEscapes(tex: string): string {
  return tex
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(/\f/g, "\\f")
    .replace(/\x08/g, "\\b")
    .replace(/\x0b/g, "\\v");
}

function render(tex: string, display: boolean) {
  try {
    return katex.renderToString(repairEscapes(tex), {
      displayMode: display,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return tex;
  }
}

/**
 * From `start` (the index of `{`), return the index just past the matching
 * closing `}`, honouring nested braces. Returns -1 if unbalanced.
 */
function matchBrace(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Render a plain-text run, but still catch bare chemistry commands
 * (`\ce{…}`, `\pu{…}`) that the model emitted WITHOUT `$…$` delimiters.
 * Without this, `\ce{Cu2O}` leaks to the page as literal "\ce" text.
 */
function pushPlain(run: string, parts: React.ReactNode[], keyRef: { k: number }) {
  const cmd = /\\(ce|pu)\s*\{/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = cmd.exec(run)) !== null) {
    const braceOpen = m.index + m[0].length - 1;
    const end = matchBrace(run, braceOpen);
    if (end === -1) break; // unbalanced — leave the rest as text
    if (m.index > last) parts.push(run.slice(last, m.index));
    const tex = run.slice(m.index, end); // includes \ce{ … }
    parts.push(
      <span
        key={`c${keyRef.k++}`}
        dangerouslySetInnerHTML={{ __html: render(tex, false) }}
      />
    );
    last = end;
    cmd.lastIndex = end;
  }
  if (last < run.length) parts.push(run.slice(last));
}

/**
 * Renders a string with inline `$...$` and block `$$...$$` LaTeX (incl. \ce{}
 * chemistry), and also renders bare `\ce{}` / `\pu{}` that arrive without
 * dollar delimiters. Everything else is plain text. Safe as a server component.
 */
export function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const text = children ?? "";
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  const parts: React.ReactNode[] = [];
  const keyRef = { k: 0 };
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) pushPlain(text.slice(last, m.index), parts, keyRef);
    const display = m[1] != null;
    const tex = (m[1] ?? m[2]) as string;
    parts.push(
      <span
        key={`m${keyRef.k++}`}
        dangerouslySetInnerHTML={{ __html: render(tex, display) }}
      />
    );
    last = re.lastIndex;
  }
  if (last < text.length) pushPlain(text.slice(last), parts, keyRef);

  return <span className={cn("[&_.katex]:text-[1.05em]", className)}>{parts}</span>;
}
