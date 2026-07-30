"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClassroom } from "@/app/(app)/teach/actions";

export function CreateClassroom({
  subjects,
}: {
  subjects: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createClassroom, {});

  if (state?.ok && open) setOpen(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={17} /> New class
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-[18px] border border-hairline bg-surface p-5 shadow-sm w-full max-w-md"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink">New class</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-3 hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>
      <input
        name="name"
        placeholder="Class name (e.g. Sec 4 Biology · Mon 4pm)"
        required
        className="w-full h-11 px-4 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-[15px] text-ink mb-3"
      />
      <select
        name="subject_id"
        className="w-full h-11 px-3 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-[15px] text-ink mb-4"
      >
        <option value="">Any subject</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {state?.error && <p className="text-sm text-danger mb-3">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create class"}
      </Button>
    </form>
  );
}
