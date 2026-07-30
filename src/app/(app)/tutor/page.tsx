import { TutorChat } from "@/components/tutor/TutorChat";

export const metadata = { title: "AI Tutor · Atlas" };

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  return <TutorChat topic={topic} />;
}
