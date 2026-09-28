"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  addFlashcard,
  deleteFlashcard,
  updateFlashcard,
} from "@/app/(app)/actions";
import type { EditableCard } from "@/lib/data";

const field =
  "w-full rounded-[12px] bg-surface-2 border border-hairline px-3 py-2 text-[15px] text-ink outline-none focus:border-accent";

export function DeckEditor({
  subtopicId,
  cards,
  role,
  classrooms,
}: {
  subtopicId: string;
  cards: EditableCard[];
  role: "student" | "tutor" | "admin";
  classrooms: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const isTutor = role === "tutor" || role === "admin";
  const isAdmin = role === "admin";
  const classById = new Map(classrooms.map((c) => [c.id, c.name]));
  const [imgBusy, setImgBusy] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState<string | null>(null);

  async function makeDiagram(id: string) {
    setImgBusy(id);
    setImgErr(null);
    try {
      const res = await fetch("/api/flashcards/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: id }),
      });
      const data = await res.json();
      if (res.ok) router.refresh();
      else setImgErr(data.error ?? "Couldn't generate the diagram.");
    } catch {
      setImgErr("Network error.");
    } finally {
      setImgBusy(null);
    }
  }

  function add() {
    setError(null);
    start(async () => {
      const res = await addFlashcard({
        subtopicId,
        front,
        back,
        classroomId: isTutor ? classroomId || null : null,
      });
      if (res.error) setError(res.error);
      else {
        setFront("");
        setBack("");
        router.refresh();
      }
    });
  }

  function saveEdit(id: string) {
    start(async () => {
      const res = await updateFlashcard({ id, subtopicId, front: editFront, back: editBack });
      if (res.error) setError(res.error);
      else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteFlashcard(id, subtopicId);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-xl px-5 sm:px-8 pb-24 md:pb-12">
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-ink">
            {isTutor ? "Add a card to this deck" : "Add your own card"}
          </h2>
        </div>

        <div className="space-y-2">
          <input
            className={field}
            placeholder="Term / front (e.g. Mitochondrion)"
            value={front}
            onChange={(e) => setFront(e.target.value)}
          />
          <textarea
            className={field}
            rows={2}
            placeholder="Definition / back (e.g. Site of aerobic respiration; releases energy)"
            value={back}
            onChange={(e) => setBack(e.target.value)}
          />

          {isTutor && classrooms.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <Users size={15} className="text-ink-3" />
              Assign to
              <select
                className="flex-1 rounded-[10px] bg-surface-2 border border-hairline px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
              >
                <option value="">Just me (private)</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button
            onClick={add}
            disabled={pending || !front.trim() || !back.trim()}
            className="w-full"
          >
            <Plus size={16} /> Add card
          </Button>
          {isTutor && (
            <p className="text-xs text-ink-3">
              Cards assigned to a class appear in that subtopic&apos;s deck for
              every student in the class.
            </p>
          )}
        </div>
      </Card>

      {cards.length > 0 && (
        <>
          <p className="text-sm font-medium text-ink-2 mb-2 px-1">
            {isAdmin ? "Cards" : "Your cards"} ({cards.length})
          </p>
          {imgErr && <p className="text-sm text-danger mb-2 px-1">{imgErr}</p>}
          <div className="space-y-2">
            {cards.map((c) => (
              <Card key={c.id} className="p-4">
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <input
                      className={field}
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                    />
                    <textarea
                      className={field}
                      rows={2}
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(c.id)} disabled={pending}>
                        <Check size={14} /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        <X size={14} /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      {c.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.imageUrl}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg border border-hairline object-cover bg-white"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{c.front}</p>
                        <p className="text-sm text-ink-2 mt-0.5">{c.back}</p>
                        {c.classroomId && (
                          <Badge tone="mint" className="mt-2">
                            Assigned · {classById.get(c.classroomId) ?? "class"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isAdmin && (
                        <button
                          aria-label="Generate diagram"
                          title={c.imageUrl ? "Regenerate diagram" : "Generate diagram"}
                          disabled={imgBusy !== null}
                          onClick={() => makeDiagram(c.id)}
                          className="p-2 rounded-lg text-ink-3 hover:text-accent hover:bg-surface-2 disabled:opacity-50"
                        >
                          {imgBusy === c.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <ImagePlus size={15} />
                          )}
                        </button>
                      )}
                      <button
                        aria-label="Edit card"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditFront(c.front);
                          setEditBack(c.back);
                        }}
                        className="p-2 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        aria-label="Delete card"
                        onClick={() => remove(c.id)}
                        className="p-2 rounded-lg text-ink-3 hover:text-danger hover:bg-surface-2"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
