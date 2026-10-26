import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { AdminWorkspace } from "@/features/admin/admin-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админка · IPOS.Plan", robots: { index: false, follow: false } };

export default async function Page() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <AdminWorkspace />;
}
