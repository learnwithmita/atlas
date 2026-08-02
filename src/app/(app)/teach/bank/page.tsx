import { getQuestionBank } from "@/lib/data";
import { BankView } from "@/components/curriculum/BankView";

export const metadata = { title: "Question Bank · Atlas" };
export const dynamic = "force-dynamic";

export default async function TeachBankPage() {
  const topics = await getQuestionBank();
  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-ink">Question bank</h1>
        <p className="text-ink-2 mt-1">
          How many questions exist for each topic — curated plus those extracted
          from your uploaded papers.
        </p>
      </header>
      <BankView topics={topics} base="/teach/bank" />
    </div>
  );
}
