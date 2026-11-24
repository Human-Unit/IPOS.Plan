"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { ChangingNumber } from "@/components/ui/changing-number";
import { motionEase, motionTiming } from "@/lib/motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Copy, Trash2, ArrowUpRight, Upload, FileText, ChevronDown, ShieldCheck, Bot } from "lucide-react";
import { toast } from "@/lib/notifications";
import { db } from "@/lib/db/database";
import { createPlan, deletePlan, duplicatePlan } from "./repository";
import { seedDemo } from "./demo";
import { formatDate, errorMessage } from "@/lib/labels";
import type { Plan } from "@/lib/schema/plan";
import { ThemeControl } from "@/components/theme/theme-control";
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
  DialogBody,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImportDialog } from "@/features/import/import-dialog";
import { AiCloudImportDialog } from "@/features/ai-sync/ai-cloud-import-dialog";
import { BackupMenu } from "@/features/backup/backup-menu";
import { Input } from "@/components/ui/input";
import { dashboardMatches, tasksInPlan, taskStats, type PlanFilter } from "./productivity";
import { useLocalDate } from "./use-local-date";
import {
  ACTIVIST_PREFIX,
  directoryNames,
  syncDirectoryFromPlans,
} from "@/features/activists/directory";
export function Dashboard() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const heroAnimation = useAnimationControls();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    heroAnimation.set({ opacity: 0.8, y: 4 });
    void heroAnimation.start({ opacity: 1, y: 0 });
  }, [heroAnimation]);
  const plans = useLiveQuery(() =>
    db.plans.orderBy("updatedAt").reverse().toArray(),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Plan>();
  const [importing, setImporting] = useState(false);
  const [importingCloud, setImportingCloud] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlanFilter>("all");
  const today = useLocalDate();
  const rosterRows = useLiveQuery(
    () =>
      db.settings
        .filter((row) => row.key.startsWith(ACTIVIST_PREFIX))
        .toArray(),
    [],
  );
  const rememberedPeople = directoryNames(rosterRows ?? []);

  const library = plans?.map(plan => ({ plan, tasks: tasksInPlan(plan) }));
  const visiblePlans = library?.flatMap(({ plan, tasks }) => {
    const matches = dashboardMatches(plan, tasks, query, filter, today);
    return matches === null ? [] : [{ plan, tasks, matches }];
  });
  const stats = taskStats(
    (library ?? []).flatMap(entry => entry.tasks),
    today,
  );
  useEffect(() => {
    void seedDemo()
      .then(() => syncDirectoryFromPlans())
      .catch((e) => setError(errorMessage(e)));
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
        <div className="app-bar-tools"><Link className="admin-entry" href="/admin"><ShieldCheck size={16} aria-hidden="true" /><span>Админка</span></Link><span className="local-indicator">
          <span />
          Локальное пространство
        </span><ThemeControl /></div>
      </header>
      <main className="dashboard">
        <motion.section
          initial={false}
          animate={heroAnimation}
          transition={{ duration: motionTiming.entrance, ease: motionEase }}
          className="dashboard-heading dashboard-hero"
          aria-labelledby="dashboard-title"
        >
          <div className="dashboard-hero-copy">
            <h1 id="dashboard-title">Контент-планы</h1>
            <p className="dashboard-hero-description">
              От идеи и задания — к готовому медиапроекту.
            </p>
          </div>
          <div className="dashboard-actions">
            <Button data-primary-action disabled={busy} onClick={create}>
              <Plus data-icon="inline-start" />
              Новый план
            </Button>
          </div>
        </motion.section>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="library-stats" role="group" aria-label="Задачи во всей библиотеке">
          <button type="button" aria-pressed={filter === "unfinished"} onClick={() => setFilter(filter === "unfinished" ? "all" : "unfinished")}>
            <ChangingNumber value={stats.unfinished} ready={plans !== undefined} />
            <span>Не завершено</span>
          </button>
          <button type="button" data-warning={stats.overdue > 0 || undefined} aria-pressed={filter === "overdue"} onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}>
            <ChangingNumber value={stats.overdue} ready={plans !== undefined} />
            <span>Просрочено</span>
          </button>
          <button type="button" aria-pressed={filter === "upcoming"} onClick={() => setFilter(filter === "upcoming" ? "all" : "upcoming")}>
            <ChangingNumber value={stats.upcoming} ready={plans !== undefined} />
            <span>В ближайшие 7 дней</span>
          </button>
          <button type="button" aria-pressed={filter === "completed"} onClick={() => setFilter(filter === "completed" ? "all" : "completed")}>
            <ChangingNumber value={stats.completed} ready={plans !== undefined} />
            <span>Готово</span>
          </button>
        </div>
        <section className="plan-list" data-filtered={Boolean(query || filter !== "all")} aria-label="Сохранённые планы">
          <div className="library-heading">
            <div className="list-label">
              <h2>
                Сохранённые планы{" "}
                <span role="status" aria-label="Найдено планов">
                  {visiblePlans?.length ?? "…"} / {plans?.length ?? "…"}
                </span>
              </h2>
              <span>Черновики в этом браузере</span>
            </div>
            <div className="library-utilities">
              <BackupMenu />
              <Button variant="outline" disabled={busy} onClick={() => setImportingCloud(true)}>
                <Bot data-icon="inline-start" />
                Из GPT
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setImporting(true)}>
                <Upload data-icon="inline-start" />
                Импорт JSON
              </Button>
            </div>
          </div>
        <div
          className="library-search"
          role="search"
          aria-label="Поиск по библиотеке"
        >
          <Input
            type="search"
            aria-label="Поиск планов"
            placeholder="План, задача или ответственный…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Фильтр планов"
            value={filter}
            onChange={(e) => setFilter(e.target.value as PlanFilter)}
          >
            <option value="all">Все планы</option>
            <option value="unfinished">С незавершёнными задачами</option>
            <option value="overdue">С просроченными задачами</option>
            <option value="upcoming">С задачами на ближайшие 7 дней</option>
            <option value="completed">С выполненными задачами</option>
            <option value="recent">Изменены за 7 дней</option>
          </select>
          {(query || filter !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Сбросить поиск
            </Button>
          )}
        </div>
          {!plans && !error && <Skeleton className="h-28 w-full" />}
          {/* Search replaces the result set immediately. Retaining old results
              through rapid filter resets can leave invisible live actions. IDs
              remain stable within each result set and across Dexie updates. */}
          <AnimatePresence key={`${filter}:${query}`} initial={false} mode="popLayout">
          {visiblePlans?.map(({ plan, tasks, matches }) => {
            const { completed: done, overdue, upcoming } = taskStats(tasks, today);
            return (
              <motion.article className="plan-row" key={plan.id}
                layout={reducedMotion ? false : "position"}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -3 }}
                transition={{ duration: reducedMotion ? 0 : motionTiming.surface, ease: motionEase }}
                whileHover={reducedMotion ? undefined : { y: -1 }}
              >
                <span className="plan-row-icon" aria-hidden="true">
                  <FileText size={24} />
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
                  {(overdue > 0 || upcoming > 0) && (
                    <div className="plan-row-deadlines" aria-label="Сроки задач">
                      {overdue > 0 && <span data-overdue>Просрочено: {overdue}</span>}
                      {upcoming > 0 && <span>На ближайшие 7 дней: {upcoming}</span>}
                    </div>
                  )}
                  {matches.length > 0 ? (
                    <ul className="plan-task-matches" aria-label="Найденные задачи">
                      {matches.map(task => (
                        <li key={task.id}>
                          <Link href={{ pathname: `/plan/${plan.id}`, query: { task: task.id } }}>
                            <strong>{task.title || "Без названия"}</strong>
                            <span>{task.assignee || "Ответственный не назначен"} · {task.deadline
                              ? <time dateTime={task.deadline}>{task.deadline.split("-").reverse().join(".")}</time>
                              : "Без дедлайна"}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : <p
                    className="plan-row-summary"
                    title={tasks.map((task) => task.title).join(" · ")}
                  >
                    {tasks.length
                      ? tasks
                          .slice(0, 2)
                          .map((task) => task.title)
                          .join(" · ") +
                        (tasks.length > 2 ? ` · ещё ${tasks.length - 2}` : "")
                      : "Добавьте первое задание или начните с текста"}
                  </p>}
                  <div
                    className="plan-progress"
                    role="progressbar"
                    aria-label={`Готовность ${plan.title}`}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, tasks.length)}
                    aria-valuenow={done}
                    aria-valuetext={`${done} из ${tasks.length} задач готово`}
                  >
                    <motion.span
                      initial={false}
                      animate={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }}
                      transition={{ duration: reducedMotion ? 0 : motionTiming.surface }}
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
              </motion.article>
            );
          })}
          </AnimatePresence>
          {Boolean(plans?.length) && visiblePlans?.length === 0 && (
            <div className="search-empty" role="status">
              <p>Планы не найдены. Измените запрос или фильтр.</p>
              <Button
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Сбросить поиск
              </Button>
            </div>
          )}
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
        <details className="activist-directory">
          <summary>
            <span>Имена из назначений</span>
            <small>{rememberedPeople.length} сохранено локально</small>
            <ChevronDown aria-hidden="true" />
          </summary>
          <p>
            Справочник для следующих заданий. Это имена из поручений, а не
            подтверждённый список активистов. Они остаются здесь даже после
            завершения задачи.
          </p>
          {rememberedPeople.length ? (
            <ul aria-label="Сохранённые ответственные">
              {rememberedPeople.map((name) => <li key={name}>{name}</li>)}
            </ul>
          ) : (
            <p>Назначьте человека в свойствах задачи — имя запомнится после ввода.</p>
          )}
        </details>
        <footer className="dashboard-footer">
          <p>
            Планы сохраняются в этом браузере. «Резервная копия» скачивает всю
            библиотеку с историей. Перед копированием дождитесь сохранения в
            открытых вкладках.
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
            </DialogHeader>
            <DialogBody>
              <DialogDescription>
                «{deleting.title}» и его локальная история будут удалены из
                этого браузера.
              </DialogDescription>
            </DialogBody>
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
      {importingCloud && (
        <AiCloudImportDialog
          onClose={() => setImportingCloud(false)}
          onImported={(localId) => { setImportingCloud(false); router.push(`/plan/${localId}`); }}
        />
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
