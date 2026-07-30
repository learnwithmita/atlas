import katex from "katex";
import "katex/dist/contrib/mhchem.js"; // enables \ce{...} for chemistry
import { cn } from "@/lib/utils";

function render(tex: string, display: boolean) {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return tex;
  }
}

/**
 * Renders a string with inline `$...$` and block `$$...$$` LaTeX (incl. \ce{}
 * chemistry). Everything else is plain text. Safe as a server component.
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
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const display = m[1] != null;
    const tex = (m[1] ?? m[2]) as string;
    parts.push(
      <span
        key={`m${key++}`}
        dangerouslySetInnerHTML={{ __html: render(tex, display) }}
      />
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <span className={cn("[&_.katex]:text-[1.05em]", className)}>{parts}</span>;
}
