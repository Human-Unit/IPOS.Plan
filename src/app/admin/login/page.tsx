import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin, isAdminConfigured } from "@/lib/admin/auth";
import { AdminLogin } from "@/features/admin/admin-login";

export const dynamic = "force-dynamic";
export const metadata = { title: "Вход в админку · IPOS.Plan", robots: { index: false, follow: false } };

export default async function Page() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="admin-auth-shell">
      <div className="admin-auth-card">
        <Link href="/" className="admin-back-link">← К контент-планам</Link>
        <div className="admin-eyebrow">IPOS.Plan / Управление</div>
        <h1>Вход в админку</h1>
        <p>Закрытое пространство для управления вашими планами.</p>
        {isAdminConfigured()
          ? <AdminLogin />
          : <p role="alert" className="admin-error">Для входа необходимо настроить пароль администратора на сервере.</p>}
      </div>
    </main>
  );
}
