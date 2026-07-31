import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { TopicalPractice } from "@/components/practice/TopicalPractice";

export const metadata = { title: "Topic practice · Atlas" };
export const dynamic = "force-dynamic";

export default async function TopicPracticePage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  if (!isSupabaseConfigured) notFound();

  const supabase = await createClient();
  const { data: topic } = await supabase
    .from("topics")
    .select("name")
    .eq("id", topicId)
    .single();
  if (!topic) notFound();

  return <TopicalPractice topicId={topicId} topicName={topic.name} />;
}
