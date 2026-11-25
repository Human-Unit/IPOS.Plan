"use client";
import { useEffect, useRef, useState } from "react";
import "./dashboard.css";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChangingNumber } from "@/components/ui/changing-number";
import { motionEase, motionTiming } from "@/lib/motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Copy, Trash2, ArrowUpRight, Upload, FileText, ChevronDown, FolderOpen, Search, ShieldCheck, X } from "lucide-react";
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
import { BackupMenu } from "@/features/backup/backup-menu";
import { Input } from "@/components/ui/input";
import { deadlineInfo, matchPlan, nextUnfinishedTask, taskStats, type PlanFilter } from "./productivity";
import { useLocalDate } from "./use-local-date";
import { DashboardOpening } from "./dashboard-opening";
import {
  ACTIVIST_PREFIX,
  directoryNames,
  syncDirectoryFromPlans,
} from "@/features/activists/directory";
const planFilters = [
  { value: "all", label: "Все планы", compactLabel: "Все" },
  { value: "unfinished", label: "Не завершено", compactLabel: "Не готовы" },
  { value: "overdue", label: "Просрочено", compactLabel: "Просрочка" },
  { value: "recent", label: "Недавние", compactLabel: "Недавние" },
] as const satisfies ReadonlyArray<{ value: PlanFilter; label: string; compactLabel: string }>;

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
  const [filesOpen, setFilesOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const filesToggle = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlanFilter>("all");
  const today = useLocalDate();
  const resetFilters = () => {
    setQuery("");
    setFilter("all");
    searchInput.current?.focus();
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
    const match = matchPlan(plan, query, filter, today);
    return match ? [{ plan, match }] : [];
  });
  const canClearResults = Boolean((query || filter !== "all") && visiblePlans?.length);
  const overdueOnly = filter === "overdue" && !query.trim();
  const stats = taskStats(
    (plans ?? []).flatMap((p) => Object.values(p.tasks)),
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
        <header className="dashboard-titlebar">
          <h1>Контент-планы</h1>
          <Button disabled={busy} onClick={create}>
            <Plus data-icon="inline-start" /> Новый план
          </Button>
        </header>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="dashboard-workspace">
          {(!plans || plans.length > 0) && (
            <aside className="dashboard-overview" aria-label="Продолжение работы и задачи">
              {plans?.[0]
                ? <DashboardOpening plan={plans[0]} />
                : <Skeleton className="dashboard-resume-loading" />}
              <div className="library-stats" role="group" aria-label="Задачи во всей библиотеке">
                <h2>Задачи</h2>
                <Button
                  className="library-stats-toggle"
                  variant="ghost"
                  aria-expanded={statsOpen}
                  aria-controls="dashboard-task-totals"
                  onClick={() => setStatsOpen((open) => !open)}
                >
                  Задачи <ChevronDown data-icon="inline-end" />
                </Button>
                <button
                  className="library-stat library-overdue"
                  type="button"
                  data-warning={stats.overdue > 0 || undefined}
                  aria-label={`Просроченные задачи во всех планах: ${stats.overdue}`}
                  aria-pressed={overdueOnly}
                  aria-controls="plan-library"
                  disabled={!plans}
                  onClick={() => {
                    setQuery("");
                    setFilter(overdueOnly ? "all" : "overdue");
                  }}
                >
                  <span>Просрочено</span>
                  <ChangingNumber value={stats.overdue} ready={plans !== undefined} />
                </button>
                <div className="library-stat-rows" id="dashboard-task-totals" data-open={statsOpen}>
                  <div className="library-stat">
                    <span>Не завершено</span>
                    <ChangingNumber value={stats.unfinished} ready={plans !== undefined} />
                  </div>
                  <div className="library-stat">
                    <span>В ближайшие 7 дней</span>
                    <ChangingNumber value={stats.upcoming} ready={plans !== undefined} />
                  </div>
                  <div className="library-stat">
                    <span>Готово</span>
                    <ChangingNumber value={stats.completed} ready={plans !== undefined} />
                  </div>
                </div>
              </div>
            </aside>
          )}
          <div className="dashboard-library">
            <section id="plan-library" tabIndex={-1} className="plan-list" data-filtered={Boolean(query || filter !== "all")} aria-label="Сохранённые планы">
              <div className="library-heading">
                <div className="list-label">
                  <div className="library-title-line">
                    <h2 aria-label="Сохранённые планы">
                      <span className="library-title-wide" aria-hidden="true">Сохранённые планы</span>
                      <span className="library-title-compact" aria-hidden="true">Планы</span>
                    </h2>
                    <span role="status" aria-label="Найдено планов">
                      {visiblePlans?.length ?? "…"} / {plans?.length ?? "…"}
                    </span>
                  </div>
                </div>
                <div
                  className="dashboard-library-tools"
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && !event.defaultPrevented && filesOpen) {
                      setFilesOpen(false);
                      filesToggle.current?.focus();
                    }
                  }}
                >
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
                    <Button variant="outline" disabled={busy} onClick={() => setImporting(true)}>
                      <Upload data-icon="inline-start" />
                      Импорт JSON
                    </Button>
                  </div>
                </div>
              </div>
              <div className="dashboard-library-surface">
                <div className="dashboard-library-controls">
                  <div className="library-search" role="search" aria-label="Поиск по библиотеке" data-can-clear={canClearResults}>
                    <label className="sr-only" htmlFor="dashboard-plan-search">Поиск планов</label>
                    <Search size={16} aria-hidden="true" />
                    <Input
                      ref={searchInput}
                      type="search"
                      id="dashboard-plan-search"
                      placeholder="Название, задача или имя"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    {canClearResults && (
                      <Button
                        className="dashboard-reset"
                        size="icon"
                        variant="ghost"
                        aria-label="Сбросить фильтры"
                        title="Сбросить фильтры"
                        onClick={resetFilters}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <nav className="dashboard-filters" aria-label="Фильтры планов">
                    {planFilters.map(({ value, label, compactLabel }) => (
                      <button
                        type="button"
                        className="dashboard-filter"
                        key={value}
                        aria-pressed={filter === value}
                        onClick={() => setFilter(value)}
                      >
                        <span className="filter-label-wide">{label}</span>
                        <span className="filter-label-compact">{compactLabel}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              {!plans && !error && <Skeleton className="h-28 w-full" />}
              {/* Search replaces the result set immediately. Retaining old results
                  through rapid filter resets can leave invisible live actions. IDs
                  remain stable within each result set and across Dexie updates. */}
              <AnimatePresence key={`${filter}:${query}`} initial={false} mode="popLayout">
              {visiblePlans?.map(({ plan, match }) => {
                const tasks = Object.values(plan.tasks);
                const done = tasks.filter((task) => task.status === "done").length;
                const next = nextUnfinishedTask(tasks);
                const overdue = next?.deadline && deadlineInfo(next, today).kind === "overdue" ? next : null;
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
                      {overdue?.deadline && (
                        <p className="plan-row-context">
                          <strong>Просрочено:</strong> {overdue.title || "Задача без названия"}
                          {" · "}<time dateTime={overdue.deadline}>{overdue.deadline.split("-").reverse().join(".")}</time>
                          {overdue.assignee && ` · ${overdue.assignee}`}
                        </p>
                      )}
                      {match.task && (
                        <p className="plan-row-context">
                          {match.field === "assignee" ? `Ответственные: ${match.task.assignee} · `
                            : match.field === "description" ? "Совпадение в описании задачи: " : "Задача: "}
                          {match.task.title || "Без названия"}
                        </p>
                      )}
                      {!overdue && !match.task && (
                        <p className="plan-row-summary" title={tasks.map((task) => task.title).join(" · ")}>
                          {tasks.length
                            ? tasks.slice(0, 2).map((task) => task.title).join(" · ") +
                              (tasks.length > 2 ? ` · ещё ${tasks.length - 2}` : "")
                            : "Добавьте первое задание или начните с текста"}
                        </p>
                      )}
                    </div>
                    <div className="plan-row-meta">
                      <time dateTime={plan.updatedAt} title="Последнее изменение">{formatDate(plan.updatedAt)}</time>
                      {tasks.length > 0 ? (
                        <div className="dashboard-row-progress">
                          <div
                            className="plan-progress"
                            role="progressbar"
                            aria-label={`Готовность ${plan.title}`}
                            aria-valuemin={0}
                            aria-valuemax={tasks.length}
                            aria-valuenow={done}
                            aria-valuetext={`${done} из ${tasks.length} задач готово`}
                          >
                            <motion.span
                              initial={false}
                              animate={{ width: `${(done / tasks.length) * 100}%` }}
                              transition={{ duration: reducedMotion ? 0 : motionTiming.surface }}
                            />
                          </div>
                          <span aria-hidden="true">{done} из {tasks.length} готово</span>
                        </div>
                      ) : <span>Без задач</span>}
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
                    Сбросить фильтры
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
          </div>
        </div>
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
