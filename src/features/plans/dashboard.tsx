"use client";
import { useEffect, useRef, useState } from "react";
import "./dashboard.css";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChangingNumber } from "@/components/ui/changing-number";
import { motionEase, motionTiming } from "@/lib/motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Copy, Trash2, ArrowUpRight, Upload, FileText, ChevronDown, FolderOpen, Search, ShieldCheck, Bot } from "lucide-react";
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
import { DashboardOpening } from "./dashboard-opening";
import {
  ACTIVIST_PREFIX,
  directoryNames,
  syncDirectoryFromPlans,
} from "@/features/activists/directory";
const planFilters = [
  { value: "all", label: "Все планы" },
  { value: "unfinished", label: "Не завершено" },
  { value: "overdue", label: "Просрочено" },
  { value: "upcoming", label: "На этой неделе" },
  { value: "completed", label: "Готово" },
  { value: "recent", label: "Недавние" },
] as const satisfies ReadonlyArray<{ value: PlanFilter; label: string }>;

export function Dashboard() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const plans = useLiveQuery(() =>
    db.plans.orderBy("updatedAt").reverse().toArray(),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Plan>();
  const [importing, setImporting] = useState(false);
  const [importingCloud, setImportingCloud] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const filesToggle = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlanFilter>("all");
  const today = useLocalDate();
  const resetFilters = () => {
    setQuery("");
    setFilter("all");
  };
  const rosterRows = useLiveQuery(
    () =>
      db.settings
        .filter((row) => row.key.startsWith(ACTIVIST_PREFIX))
        .toArray(),
    [],
  );
  const rememberedPeople = directoryNames(rosterRows ?? []);

  const visiblePlans = plans?.flatMap((plan) => {
    const tasks = tasksInPlan(plan);
    const matches = dashboardMatches(plan, tasks, query, filter, today);
    return matches === null ? [] : [{ plan, tasks, matches }];
  });
  const stats = taskStats(
    (plans ?? []).flatMap(tasksInPlan),
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
      <header className="app-bar dashboard-app-bar">
        <a className="skip-link dashboard-skip-link" href="#plan-library">Перейти к планам</a>
        <Brand />
        <div className="app-bar-tools"><Link className="admin-entry" href="/admin" aria-label="Админка"><ShieldCheck size={16} aria-hidden="true" /><span>Админка</span></Link><span className="local-indicator">
          <span />
          Локальное пространство
        </span><ThemeControl /></div>
      </header>
      <main className="dashboard dashboard-main">
        <DashboardOpening recentPlan={plans?.[0]} busy={busy} onCreate={create} />
          <div className="library-stats" role="group" aria-label="Задачи во всей библиотеке">
            <button type="button" aria-pressed={filter === "unfinished"} onClick={() => setFilter(filter === "unfinished" ? "all" : "unfinished")}>
              <ChangingNumber value={stats.unfinished} ready={plans !== undefined} /> Не завершено
            </button>
            <button type="button" data-warning={stats.overdue > 0 || undefined} aria-pressed={filter === "overdue"} onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}>
              <ChangingNumber value={stats.overdue} ready={plans !== undefined} /> Просрочено
            </button>
            <button type="button" aria-pressed={filter === "upcoming"} onClick={() => setFilter(filter === "upcoming" ? "all" : "upcoming")}>
              <ChangingNumber value={stats.upcoming} ready={plans !== undefined} /> В ближайшие 7 дней
            </button>
            <button type="button" aria-pressed={filter === "completed"} onClick={() => setFilter(filter === "completed" ? "all" : "completed")}>
              <ChangingNumber value={stats.completed} ready={plans !== undefined} /> Готово
            </button>
          </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <section id="plan-library" tabIndex={-1} className="plan-list" data-filtered={Boolean(query || filter !== "all")} aria-label="Сохранённые планы">
          <div className="library-heading">
            <div className="list-label">
              <div className="library-title-line">
                <h2>Сохранённые планы</h2>
                <span role="status" aria-label="Найдено планов">
                  {visiblePlans?.length ?? "…"} / {plans?.length ?? "…"}
                </span>
              </div>
            </div>
            <div
              className="dashboard-library-tools"
              onKeyDown={(event) => {
                if (event.key === "Escape" && !event.defaultPrevented && filesOpen &&
                    event.target instanceof Node && event.currentTarget.contains(event.target)) {
                  setFilesOpen(false);
                  filesToggle.current?.focus();
                }
              }}
            >
              <div className="library-search" role="search" aria-label="Поиск по библиотеке">
                <label htmlFor="dashboard-plan-search">Поиск планов</label>
                <Search size={16} aria-hidden="true" />
                <Input
                  type="search"
                  id="dashboard-plan-search"
                  placeholder="Поиск"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button
                ref={filesToggle}
                className="dashboard-files-toggle"
                variant="outline"
                aria-expanded={filesOpen}
                aria-controls="dashboard-file-actions"
                onClick={() => setFilesOpen((open) => !open)}
              >
                <FolderOpen data-icon="inline-start" />
                Файлы
              </Button>
              <div className="library-utilities" id="dashboard-file-actions" data-open={filesOpen}>
                <BackupMenu />
                <Button variant="outline" disabled={busy} onClick={() => { setFilesOpen(false); setImportingCloud(true); }}>
                  <Bot data-icon="inline-start" />
                  Из GPT
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => { setFilesOpen(false); setImporting(true); }}> 
                  <Upload data-icon="inline-start" />
                  Импорт JSON
                </Button>
              </div>
            </div>
          </div>
          <div className="dashboard-library-surface">
            <nav className="dashboard-filters" aria-label="Фильтры планов">
              <select
                className="dashboard-filter-select"
                aria-label="Фильтр планов"
                value={filter}
                onChange={(event) => setFilter(event.target.value as PlanFilter)}
              >
                {planFilters.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {planFilters.map(({ value, label }) => (
                <button
                  type="button"
                  className="dashboard-filter"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
              {(query || filter !== "all") && Boolean(visiblePlans?.length) && (
                <Button className="dashboard-reset" variant="ghost" onClick={resetFilters}>
                  Сбросить поиск
                </Button>
              )}
            </nav>
          {!plans && !error && <Skeleton className="h-28 w-full" />}
          {/* Search replaces the result set immediately. Retaining old results
              through rapid filter resets can leave invisible live actions. IDs
              remain stable within each result set and across Dexie updates. */}
          <AnimatePresence key={`${filter}:${query}`} initial={false} mode="popLayout">
          {visiblePlans?.map(({ plan, tasks, matches }) => {
            const done = tasks.filter((task) => task.status === "done").length;
            return (
              <motion.article className="plan-row" key={plan.id}
                layout={reducedMotion ? false : "position"}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -3 }}
                transition={{ duration: reducedMotion ? 0 : motionTiming.surface, ease: motionEase }}
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
                  {(() => {
                    const { overdue, upcoming } = taskStats(tasks, today);
                    return (overdue > 0 || upcoming > 0) ? (
                      <div className="plan-row-deadlines" aria-label="Сроки задач">
                        {overdue > 0 && <span data-overdue>Просрочено: {overdue}</span>}
                        {upcoming > 0 && <span>На ближайшие 7 дней: {upcoming}</span>}
                      </div>
                    ) : null;
                  })()}
                  {matches.length > 0 ? (
                    <ul className="plan-task-matches" aria-label="Найденные задачи">
                      {matches.slice(0, 3).map((task) => (
                        <li key={task.id}>
                          <Link href={{ pathname: `/plan/${plan.id}`, query: { task: task.id } }}>
                            <strong>{task.title || "Без названия"}</strong>
                            <span>{task.assignee || "Ответственный не назначен"} · {task.deadline || "Без дедлайна"}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p
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
                    </p>
                  )}
                </div>
                <time className="dashboard-row-date" dateTime={plan.updatedAt}>{formatDate(plan.updatedAt)}</time>
                <div className="dashboard-row-progress">
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
                  <span aria-hidden="true">{done} из {tasks.length}</span>
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
              <Button variant="ghost" onClick={resetFilters}>
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
          </div>
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
