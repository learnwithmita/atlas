"use client";

import { useRef, useState } from "react";
import { ArrowUp, FileText, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "model"; text: string; grounded?: boolean };

const QUICK = [
  "Quiz me on this",
  "Give me a mnemonic",
  "Explain more simply",
  "Why is my answer wrong?",
];

export function TutorChat({ topic }: { topic?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "model",
      text: topic
        ? `Let's work on ${topic}. Tell me what you already understand, or ask me anything — I'll give you a hint before the full answer.`
        : "Hi, I'm Atlas. Ask me anything in Biology or Chemistry. I'll nudge you toward the answer the way an examiner would.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, text: m.text })),
          topic,
        }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "model",
          text: data.text ?? data.error ?? "Something went wrong.",
          grounded: data.grounded,
        },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "model", text: "Network error — please try again." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        })
      );
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 sm:px-8 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3.5 animate-fade-up",
                m.role === "user" && "justify-end"
              )}
            >
              {m.role === "model" && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft grid place-items-center mt-0.5">
                  <LogoMark size={18} />
                </div>
              )}
              <div className={cn("max-w-[80%]", m.role === "user" && "order-1")}>
                <div
                  className={cn(
                    "px-4 py-3 rounded-[18px] leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-accent text-white rounded-br-md"
                      : "bg-surface border border-hairline text-ink rounded-bl-md"
                  )}
                >
                  {m.text}
                </div>
                {m.role === "model" && m.grounded && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
                    <FileText size={12} />
                    Grounded in SEAB syllabus materials
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3.5">
              <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft grid place-items-center">
                <LogoMark size={18} />
              </div>
              <div className="px-4 py-3.5 rounded-[18px] bg-surface border border-hairline">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-ink-3 animate-bounce"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-hairline bg-surface/80 backdrop-blur-xl px-5 sm:px-8 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-surface-2 text-sm text-ink-2 hover:text-ink border border-hairline transition-colors disabled:opacity-50"
              >
                <Sparkles size={13} className="text-accent" />
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 rounded-[20px] border border-hairline bg-surface focus-within:border-accent p-2 pl-4 transition-colors"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask Atlas about Biology or Chemistry…"
              className="flex-1 bg-transparent outline-none resize-none text-[15px] text-ink placeholder:text-ink-3 max-h-32 py-2"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-9 w-9 shrink-0 grid place-items-center rounded-full bg-accent text-white disabled:opacity-30 hover:bg-accent-strong transition-colors"
            >
              <ArrowUp size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
