import { notFound } from "next/navigation";
import { getPaper } from "@/lib/data";
import { PaperView } from "@/components/admin/PaperView";

export const metadata = { title: "Paper · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPaperPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const { resourceId } = await params;
  const paper = await getPaper(resourceId);
  if (!paper) notFound();
  return <PaperView paper={paper} backHref="/admin/content" />;
}
