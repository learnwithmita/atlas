import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateExamQuestions } from "@/lib/gemini";

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
  const n = Math.min(25, Math.max(1, Number(count) || 10));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name")
    .in("id", topicIds ?? []);
  const names = (topics ?? []).map((t) => t.name);
  const idByName = new Map((topics ?? []).map((t) => [t.name.toLowerCase(), t.id]));
  if (names.length === 0) {
    return NextResponse.json({ error: "Pick at least one topic." }, { status: 400 });
  }

  try {
    const generated = await generateExamQuestions(names, n);
    if (generated.length === 0) {
      return NextResponse.json({ error: "Couldn't generate questions. Try again." }, { status: 502 });
    }
    const questions = generated.map((q) => ({
      id: randomUUID(),
      topicId: idByName.get(q.topic.toLowerCase()) ?? null,
      ...q,
    }));
    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
}
