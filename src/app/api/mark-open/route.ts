import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, markOpenEnded } from "@/lib/gemini";

export const runtime = "nodejs";

/** Mark an answer to an assignment question (no stored scheme — Gemini derives one). */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const { questionId, answer } = (await req.json()) as {
    questionId: string;
    answer: string;
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS ensures the student can only read a question assigned to them.
  const { data: q } = await supabase
    .from("assignment_questions")
    .select("stem, marks")
    .eq("id", questionId)
    .single();
  if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  try {
    const result = await markOpenEnded({
      stem: q.stem,
      marks: q.marks ?? 3,
      studentAnswer: answer,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
}
