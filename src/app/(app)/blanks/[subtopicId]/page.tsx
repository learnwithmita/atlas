import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getClozeItems } from "@/lib/data";
import { ClozeStudy } from "@/components/cards/ClozeStudy";

export const metadata = { title: "Fill the blanks · Atlas" };
export const dynamic = "force-dynamic";

export default async function BlanksStudyPage({
  params,
}: {
  params: Promise<{ subtopicId: string }>;
}) {
  const { subtopicId } = await params;
  const { subtopicName, items } = await getClozeItems(subtopicId);

  return (
    <div className="pt-6">
      <div className="mx-auto max-w-xl px-5 sm:px-8">
        <Link
          href="/blanks"
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft size={16} /> Sets
        </Link>
      </div>
      <ClozeStudy subtopicName={subtopicName} items={items} />
    </div>
  );
}
