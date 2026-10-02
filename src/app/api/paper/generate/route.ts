import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateBankBatch } from "@/lib/gemini";
import { getEntitlement } from "@/lib/entitlements";
import {
  bumpTimesServed,
  getTopicGenerationContext,
  insertBankQuestions,
  serveBankQuestions,
  type ServedQuestion,
} from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const { topicIds, count } = (await req.json()) as {
    topicIds: string[];
    count: number;
  };
  const ids = topicIds ?? [];
  const n = Math.min(25, Math.max(1, Number(count) || 10));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (ids.length === 0) {
    return NextResponse.json({ error: "Pick at least one topic." }, { status: 400 });
  }

  // Students never trigger AI generation — they only ever draw from the vetted
  // shared bank. Only staff (admin/tutor) top it up when it runs short.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isStaff = profile?.role === "admin" || profile?.role === "tutor";

  // Building a multi-topic custom paper is a Pro feature. Single-topic practice
  // stays free. (No-op while BILLING_ENABLED is off — everyone is Pro.)
  if (ids.length > 1) {
    const ent = await getEntitlement();
    if (!ent.isPro) {
      return NextResponse.json(
        {
          error:
            "Building custom papers from multiple topics is a Pro feature. Upgrade to mix any topics into one paper.",
          upgrade: true,
        },
        { status: 402 }
      );
    }
  }

  // 1) Serve from the shared bank first — no AI cost. Reuses questions across
  //    students (excluding ones this student has already attempted).
  const served: ServedQuestion[] = await serveBankQuestions(ids, n);
  bumpTimesServed(served.map((q) => q.bankId).filter((x): x is string => !!x));

  let notice: string | null = null;
  let source: "bank" | "ai" | "mixed" = "bank";

  // 2) Only if the bank is short, generate the shortfall with the admin's key
  //    and write it back to the bank so it's reused next time. Staff only.
  const shortfall = n - served.length;
  if (shortfall > 0 && isStaff) {
    const context = await getTopicGenerationContext(ids);
    const subjectByTopic = new Map<string, string | null>();
    {
      const { data: topics } = await supabase
        .from("topics")
        .select("id, subject_id")
        .in("id", ids);
      for (const t of topics ?? []) subjectByTopic.set(t.id, t.subject_id ?? null);
    }
    const idByName = new Map(context.map((t) => [t.name.toLowerCase(), t.id]));

    try {
      const batch = await generateBankBatch(
        context.map((t) => ({ name: t.name, outcomes: t.outcomes, examples: t.examples })),
        shortfall
      );
      const inserted = await insertBankQuestions(
        batch.map((q) => {
          const topicId = idByName.get(q.topic.toLowerCase()) ?? ids[0] ?? null;
          return {
            topicId,
            subjectId: topicId ? subjectByTopic.get(topicId) ?? null : null,
            stem: q.stem,
            marks: q.marks,
            type: q.type,
            commandWords: q.commandWords,
            markScheme: q.markScheme,
            modelAnswer: q.modelAnswer,
            createdBy: user.id,
          };
        })
      );
      const topicName = new Map(context.map((t) => [t.id, t.name]));
      for (const r of inserted) {
        served.push({
          id: r.id,
          bankId: r.id,
          stem: r.stem,
          marks: r.marks,
          type: r.type,
          commandWords: r.commandWords,
          topic: r.topicId ? topicName.get(r.topicId) ?? "" : "",
          topicId: r.topicId,
          source: null,
          imageUrl: null,
        });
      }
      if (inserted.length > 0) source = served.length > inserted.length ? "mixed" : "ai";
    } catch (e) {
      // Generation failed (e.g. all models overloaded). If the bank had nothing
      // either, surface a friendly error; otherwise just serve what we have.
      if (served.length === 0) {
        return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
      }
      notice =
        "Gemini is busy, so here are questions from the shared bank. Tap “New set” shortly for fresh ones.";
    }
  }

  if (served.length === 0) {
    return NextResponse.json(
      {
        error: isStaff
          ? "No questions yet for these topics. Build the bank, or try again in a moment."
          : "No questions for these topics yet — your tutor is still adding them. Check back soon.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ questions: served, source, notice });
}
