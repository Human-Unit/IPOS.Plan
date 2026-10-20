"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Copy, Trash2, ArrowUpRight, Upload } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/database";
import { createPlan, deletePlan, duplicatePlan } from "./repository";
import { seedDemo } from "./demo";
import { formatDate, errorMessage } from "@/lib/labels";
import type { Plan } from "@/lib/schema/plan";
import { Brand } from "@/components/plan/brand";
import { PlanEmblem } from "@/components/plan/plan-emblem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImportDialog } from "@/features/import/import-dialog";
export function Dashboard() {
  const router = useRouter();
  const plans = useLiveQuery(() =>
    db.plans.orderBy("updatedAt").reverse().toArray(),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Plan>();
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    void seedDemo().catch((e) => setError(errorMessage(e)));
  }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const create = () =>
    void run(async () => {
      const plan = await createPlan();
      router.push(`/plan/${plan.id}`);
    });
  return (
    <>
      <header className="app-bar">
        <Brand />
        <span className="local-indicator">
          <span />
          Локальное пространство
        </span>
      </header>
      <main className="dashboard">
        <div className="dashboard-heading">
          <div>
            <h1>Контент-планы</h1>
            <p className="muted">
              Планируйте, создавайте и организуйте медиапроекты.
            </p>
          </div>
          <div className="dashboard-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setImporting(true)}
            >
              <Upload data-icon="inline-start" />
              Импорт JSON
            </Button>
            <Button disabled={busy} onClick={create}>
              <Plus data-icon="inline-start" />
              Новый план
            </Button>
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <section className="plan-list" aria-label="Сохранённые планы">
          <div className="list-label">
            <h2>
              Все планы <span>{plans?.length ?? "…"}</span>
            </h2>
            <span>Обновлены недавно</span>
          </div>
          {!plans && !error && <Skeleton className="h-28 w-full" />}
          {plans?.map((plan) => {
            const tasks = Object.values(plan.tasks);
            const done = tasks.filter((task) => task.status === "done").length;
            return (
              <article className="plan-row" key={plan.id}>
                <span className="plan-row-icon" aria-hidden="true">
                  <PlanEmblem size={32} />
                </span>
                <div className="plan-row-content">
                  <Link className="plan-title" href={`/plan/${plan.id}`}>
                    <span>{plan.title}</span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                  <div className="plan-row-meta">
                    <time dateTime={plan.updatedAt}>
                      Обновлён {formatDate(plan.updatedAt)}
                    </time>
                    <span>Задач: {tasks.length}</span>
                    <span>Готово: {done}</span>
                  </div>
                  <div
                    className="plan-progress"
                    role="progressbar"
                    aria-label={`Готовность ${plan.title}`}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, tasks.length)}
                    aria-valuenow={done}
                    aria-valuetext={`${done} из ${tasks.length} задач готово`}
                  >
                    <span
                      style={{
                        width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="plan-row-actions">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Дублировать ${plan.title}`}
                    title="Дублировать план"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await duplicatePlan(plan);
                        toast.success("Копия создана");
                      })
                    }
                  >
                    <Copy />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Удалить ${plan.title}`}
                    title="Удалить план"
                    disabled={busy}
                    onClick={() => setDeleting(plan)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            );
          })}
          {plans?.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PlanEmblem size={40} />
                </EmptyMedia>
                <EmptyTitle>Начните с первого плана</EmptyTitle>
                <EmptyDescription>
                  Добавьте задачи, тексты и референсы. Всё автоматически
                  сохранится в этом браузере.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button disabled={busy} onClick={create}>
                  <Plus data-icon="inline-start" />
                  Новый план
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </section>
        <footer className="dashboard-footer">
          <p>
            Планы сохраняются на этом устройстве. Экспортируйте JSON для
            резервной копии.
          </p>
        </footer>
      </main>
      {deleting && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setDeleting(undefined);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Trash2 aria-hidden="true" />
                Удалить план?
              </DialogTitle>
              <DialogDescription>
                «{deleting.title}» и его локальная история будут удалены из
                этого браузера.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDeleting(undefined)}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await deletePlan(deleting.id);
                    setDeleting(undefined);
                    toast.success("План удалён");
                  })
                }
              >
                Удалить план
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onConfirm={async (data) => {
            const plan = await createPlan(data, "PLAN_IMPORTED");
            router.push(`/plan/${plan.id}`);
          }}
        />
      )}
    </>
  );
}
