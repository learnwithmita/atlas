import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ServiceWorker } from "@/components/app/ServiceWorker";

export const metadata: Metadata = {
  title: "Atlas — Your SEAB Biology & Chemistry Tutor",
  description:
    "A Biology & Chemistry revision companion built on the SEAB syllabus. Every question, flashcard and note is reviewed by an experienced tutor — AI-assisted, never AI-alone — and marks your answers against the mark scheme.",
  metadataBase: new URL("https://atlas.sg"),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Atlas",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e12" },
  ],
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
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
