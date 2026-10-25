import type { Metadata } from "next";
import { PublishedViewer } from "@/features/sharing/published-viewer";

export const metadata: Metadata = {
  title: "Опубликованный план · IPOS.Plan",
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublishedViewer id={id} />;
}
