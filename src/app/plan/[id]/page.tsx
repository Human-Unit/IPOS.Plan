import { EditorScreen } from "@/features/plans/editor-screen";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorScreen key={id} id={id} />;
}
