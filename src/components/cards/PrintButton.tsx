"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Opens the browser print dialog — the user picks "Save as PDF" or a printer. */
export function PrintButton() {
  return (
    <Button size="sm" variant="secondary" className="no-print" onClick={() => window.print()}>
      <Printer size={15} /> Print / Save as PDF
    </Button>
  );
}
