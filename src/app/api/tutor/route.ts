import { NextResponse } from "next/server";
import { tutorReply, type ChatMessage } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { messages, topic } = (await req.json()) as {
      messages: ChatMessage[];
      topic?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }
    const reply = await tutorReply(messages.slice(-12), topic);
    return NextResponse.json(reply);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tutor error" },
      { status: 500 }
    );
  }
}
