import { getBankCounts, getTopicQuestions } from "@/lib/data";
import { TopicQuestions } from "@/components/curriculum/TopicQuestions";
import { BankBuilder } from "@/components/curriculum/BankBuilder";

export const metadata = { title: "Topic · Atlas" };
export const dynamic = "force-dynamic";

export default async function TeachBankTopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const [{ topicName, subject, questions }, counts] = await Promise.all([
    getTopicQuestions(topicId),
    getBankCounts([topicId]),
  ]);
  return (
    <TopicQuestions
      topicName={topicName}
      subject={subject}
      questions={questions}
      backHref="/teach/bank"
      builder={<BankBuilder topicId={topicId} count={counts.get(topicId) ?? 0} />}
      printHref={`/teach/bank/${topicId}/print`}
    />
  );
}
