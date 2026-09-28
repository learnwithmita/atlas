"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Two separate actions:
 *  - Print → the browser print dialog (choose a printer).
 *  - Download PDF → renders the `.print-sheet` to a PDF file and downloads it
 *    directly (no dialog), ignoring on-screen controls (`.no-print`).
 */
export function PrintButton() {
  const [busy, setBusy] = useState(false);

  async function downloadPdf() {
    if (busy) return;
    const el = document.querySelector(".print-sheet") as HTMLElement | null;
    if (!el) {
      window.print();
      return;
    }
    setBusy(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const name = (document.title || "atlas").replace(/[·\s]+/g, "-").replace(/[^\w-]/g, "");
      await html2pdf()
        .set({
          margin: 10,
          filename: `${name}.pdf`,
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            ignoreElements: (node: Element) => node.classList?.contains("no-print"),
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "avoid-all"] },
        })
        .from(el)
        .save();
    } catch {
      window.print(); // fall back to the print dialog if PDF generation fails
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print flex items-center gap-2">
      <Button size="sm" variant="secondary" onClick={() => window.print()}>
        <Printer size={15} /> Print
      </Button>
      <Button size="sm" onClick={downloadPdf} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {busy ? "Preparing…" : "Download PDF"}
      </Button>
    </div>
  );
}
