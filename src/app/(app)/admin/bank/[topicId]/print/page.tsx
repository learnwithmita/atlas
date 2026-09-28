import { getPrintableQuestions } from "@/lib/data";
import { QuestionPrintSheet } from "@/components/curriculum/QuestionPrintSheet";

export const metadata = { title: "Print questions · Atlas" };
export const dynamic = "force-dynamic";

export default async function AdminBankPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ answers?: string }>;
}) {
  const { topicId } = await params;
  const { answers } = await searchParams;
  const { topicName, subject, questions } = await getPrintableQuestions(topicId);
  return (
    <QuestionPrintSheet
      topicName={topicName}
      subject={subject}
      questions={questions}
      withAnswers={answers === "1"}
      backHref={`/admin/bank/${topicId}`}
    />
  );
}
