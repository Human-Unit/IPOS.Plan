import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin, isAdminConfigured } from "@/lib/admin/auth";
import { AdminLogin } from "@/features/admin/admin-login";
import { PlanEmblem } from "@/components/plan/plan-emblem";

export const dynamic = "force-dynamic";
export const metadata = { title: "Вход в админку · IPOS.Plan", robots: { index: false, follow: false } };

export default async function Page() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="admin-auth-shell">
      <div className="admin-auth-card">
        <div className="admin-login-brand">
          <span aria-hidden="true"><PlanEmblem size={30} /></span>
          <span>IPOS.Plan</span>
        </div>
        <h1>Вход в админку</h1>
        <p>Пароль защищает доступ к админке. Черновики планов остаются в этом браузере.</p>
        {isAdminConfigured()
          ? <AdminLogin />
          : <p role="alert" className="admin-error">Для входа необходимо настроить пароль администратора на сервере.</p>}
        <Link href="/" className="admin-back-link">← К контент-планам</Link>
      </div>
    </main>
  );
}
