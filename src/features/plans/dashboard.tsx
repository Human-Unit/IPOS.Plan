"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Copy, Trash2, ArrowUpRight, Upload } from "lucide-react";
import { toast } from "@/lib/notifications";
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
import { BackupMenu } from "@/features/backup/backup-menu";
import { Input } from "@/components/ui/input";
import { matchesPlan, taskStats, type PlanFilter } from "./productivity";
import { useLocalDate } from "./use-local-date";
import { ACTIVIST_PREFIX, directoryNames, syncDirectoryFromPlans } from "@/features/activists/directory";
export function Dashboard() {
  const router = useRouter();
  const plans = useLiveQuery(() =>
    db.plans.orderBy("updatedAt").reverse().toArray(),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Plan>();
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlanFilter>("all");
  const today = useLocalDate();
  const rosterRows = useLiveQuery(
    () => db.settings.filter((row) => row.key.startsWith(ACTIVIST_PREFIX)).toArray(),
    [],
  );
  const rememberedPeople = directoryNames(rosterRows ?? []);

  const visiblePlans = plans?.filter(plan => matchesPlan(plan, query, filter, today));
  const stats = taskStats((plans ?? []).flatMap(p => Object.values(p.tasks)), today);
  useEffect(() => {
    void seedDemo().then(() => syncDirectoryFromPlans()).catch((e) => setError(errorMessage(e)));
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
          <div className="dashboard-hero-content">
            <p className="dashboard-hero-kicker">ИПОС / РАБОЧЕЕ ПРОСТРАНСТВО</p>
            <h1>Контент-планы</h1>
            <p className="dashboard-hero-description">
              От идеи до готового медиапроекта. Собирайте брифы, распределяйте
              задачи и делитесь планами с командой.
            </p>
          </div>
          <div className="dashboard-actions">
            <BackupMenu />
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
        <div className="library-stats" aria-label="Задачи во всей библиотеке">
          <span>Не завершено <strong>{stats.unfinished}</strong></span>
          <span data-warning={stats.overdue > 0 || undefined}>Просрочено <strong>{stats.overdue}</strong></span>
          <span>В ближайшие 7 дней <strong>{stats.upcoming}</strong></span>
          <span>Готово <strong>{stats.completed}</strong></span>
        </div>
        <div className="library-search" role="search" aria-label="Поиск по библиотеке">
          <Input type="search" aria-label="Поиск планов" placeholder="План, задача или ответственный…" value={query} onChange={e => setQuery(e.target.value)} />
          <select aria-label="Фильтр планов" value={filter} onChange={e => setFilter(e.target.value as PlanFilter)}>
            <option value="all">Все планы</option><option value="unfinished">С незавершёнными задачами</option><option value="overdue">С просроченными задачами</option><option value="recent">Изменены за 7 дней</option>
          </select>
          {(query || filter !== "all") && <Button variant="ghost" onClick={() => { setQuery(""); setFilter("all"); }}>Сбросить поиск</Button>}
        </div>
        <details className="activist-directory">
          <summary>
            <span>Имена из назначений</span>
            <small>{rememberedPeople.length} сохранено локально</small>
          </summary>
          <p>Справочник для следующих заданий. Это имена из поручений, а не подтверждённый список активистов. Они остаются здесь даже после завершения задачи.</p>
          {rememberedPeople.length ? (
            <ul aria-label="Сохранённые ответственные">
              {rememberedPeople.map((name) => <li key={name}>{name}</li>)}
            </ul>
          ) : <p>Назначьте человека в свойствах задачи — имя запомнится после ввода.</p>}
        </details>
        <section className="plan-list" aria-label="Сохранённые планы">
          <div className="list-label">
            <h2>
              Найдено планов <span role="status">{visiblePlans?.length ?? "…"} / {plans?.length ?? "…"}</span>
            </h2>
            <span>Обновлены недавно</span>
          </div>
          {!plans && !error && <Skeleton className="h-28 w-full" />}
          {visiblePlans?.map((plan) => {
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
                  <p className="plan-row-summary" title={tasks.map(task=>task.title).join(' · ')}>{tasks.length ? tasks.slice(0,2).map(task=>task.title).join(' · ') + (tasks.length>2 ? ` · ещё ${tasks.length-2}` : '') : 'Добавьте первое задание или начните с текста'}</p>
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
          {Boolean(plans?.length) && visiblePlans?.length === 0 && <div className="search-empty" role="status"><p>Планы не найдены. Измените запрос или фильтр.</p><Button variant="ghost" onClick={() => { setQuery(""); setFilter("all"); }}>Сбросить поиск</Button></div>}
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
            Планы сохраняются в этом браузере. «Резервная копия» скачивает всю библиотеку с историей. Перед копированием дождитесь сохранения в открытых вкладках.
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
