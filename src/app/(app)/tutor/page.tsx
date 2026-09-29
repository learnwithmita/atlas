import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import { TutorChat } from "@/components/tutor/TutorChat";

export const metadata = { title: "AI Tutor · Atlas" };

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  // The AI tutor chat is not offered to students.
  const profile = await getProfile();
  if (profile?.role === "student") redirect("/learn");

  const { topic } = await searchParams;
  return <TutorChat topic={topic} />;
}
