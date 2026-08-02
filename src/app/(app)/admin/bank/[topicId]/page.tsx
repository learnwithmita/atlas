import { getTopicQuestions } from "@/lib/data";
import { TopicQuestions } from "@/components/curriculum/TopicQuestions";

export const metadata = { title: "Topic · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBankTopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const { topicName, subject, questions } = await getTopicQuestions(topicId);
  return (
    <TopicQuestions
      topicName={topicName}
      subject={subject}
      questions={questions}
      backHref="/admin/bank"
    />
  );
}
