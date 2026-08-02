import { getQuestionBank } from "@/lib/data";
import { BankView } from "@/components/curriculum/BankView";

export const metadata = { title: "Question Bank · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBankPage() {
  const topics = await getQuestionBank();
  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <p className="text-sm text-ink-3">Platform</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">Question bank</h1>
        <p className="text-ink-2 mt-1">Questions available per topic.</p>
      </header>
      <BankView topics={topics} base="/admin/bank" />
    </div>
  );
}
