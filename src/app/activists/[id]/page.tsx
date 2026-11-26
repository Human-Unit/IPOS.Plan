import { PersonScreen } from "@/features/activists/person-screen";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PersonScreen id={id} />;
}
