import type { Metadata } from "next";
import { PublishedViewer } from "@/features/sharing/published-viewer";
import { publicationId, readPublication } from "@/lib/publications/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let title = "Опубликованный план";
  try {
    if (publicationId.test(id)) {
      const page = await readPublication(id);
      if (page) title = page.record.title;
    }
  } catch { /* The viewer shows the actual storage error. */ }
  return {
    title: title + " · IPOS.Plan",
    description: "Опубликованный контент-план · Только просмотр",
    robots: { index: false, follow: false },
    openGraph: { title, description: "Контент-план IPOS.Plan · Только просмотр", type: "article" },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <PublishedViewer id={id} />;
}
