"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, FilePlus2, FileText, LogOut } from "lucide-react";
import { db } from "@/lib/db/database";
import { createPlan } from "@/features/plans/repository";
import { ThemeControl } from "@/components/theme/theme-control";
import { Brand } from "@/components/plan/brand";
import { Button } from "@/components/ui/button";

export function AdminWorkspace() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const plans = useLiveQuery(() => db.plans.orderBy("updatedAt").reverse().toArray());

  async function create() {
    setError(""); setBusy(true);
    try {
      const plan = await createPlan();
      router.push("/plan/" + encodeURIComponent(plan.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать план.");
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Не удалось выйти.");
      router.replace("/admin/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выйти.");
      setBusy(false);
    }
  }

  return <>
    <header className="app-bar">
      <Brand />
      <nav className="app-bar-tools" aria-label="Управление">
        <ThemeControl />
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void logout()}>
          <LogOut data-icon="inline-start" /> Выйти
        </Button>
      </nav>
    </header>
    <main className="admin-workspace">
      <div className="admin-workspace-head">
        <div>
          <h1>Мои планы</h1>
          <p>Создавайте контент-планы и работайте над ними в редакторе IPOS.Plan.</p>
        </div>
        <Button disabled={busy} onClick={() => void create()}>
          <FilePlus2 data-icon="inline-start" /> Новый план
        </Button>
      </div>
      <p className="admin-storage-note">Сейчас редактор сохраняет планы локально в этом браузере. Для работы с теми же черновиками на других устройствах понадобится облачная синхронизация.</p>
      {error && <p role="alert" className="admin-error">{error}</p>}
      <section className="admin-plan-panel" aria-label="Планы в этом браузере">
        <div className="admin-plan-panel-head">
          <h2>Сохранённые планы</h2>
          <span>{plans ? plans.length : "…"}</span>
        </div>
        {plans && plans.length === 0 && <div className="admin-empty">
          <FileText size={26} aria-hidden="true" />
          <h3>Пока нет планов</h3>
          <p>Создайте первый контент-план — он сразу откроется в редакторе.</p>
          <Button disabled={busy} onClick={() => void create()}>Создать план</Button>
        </div>}
        {plans?.map(plan => <Link className="admin-plan-row" href={`/plan/${encodeURIComponent(plan.id)}`} key={plan.id}>
          <span className="admin-plan-icon"><FileText aria-hidden="true" size={19} /></span>
          <span className="admin-plan-info">
            <strong>{plan.title}</strong>
            <small>{Object.keys(plan.tasks).length} задач · Изменён {new Date(plan.updatedAt).toLocaleDateString("ru-RU")}</small>
          </span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>)}
      </section>
      <p className="admin-return"><Link href="/">← Вернуться на главную</Link></p>
    </main>
  </>;
}
