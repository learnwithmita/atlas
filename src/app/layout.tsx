import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas — Your AI Science Tutor",
  description:
    "A personal Biology & Chemistry tutor built on the SEAB syllabus. Marks like an examiner, adapts to what you keep getting wrong.",
  metadataBase: new URL("https://atlas.sg"),
};

// Apply persisted / system theme before paint to avoid a flash.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('atlas-theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
