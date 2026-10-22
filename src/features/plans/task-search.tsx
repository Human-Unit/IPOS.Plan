"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flattenBlocks, type PortablePlan } from "@/lib/schema/plan";
import { statusLabels, priorityLabels } from "@/lib/labels";
import {
  deadlineFilters,
  deadlineInfo,
  emptyTaskFilter,
  matchesTask,
  type TaskFilter,
} from "./productivity";
import { useLocalDate } from "./use-local-date";

/** Search navigation, never a filtered editor document. Exports/undo keep every block. */
export function TaskSearch({
  plan,
  select,
  focusRequest,
}: {
  plan: PortablePlan;
  select: (id: string) => void;
  focusRequest: number;
}) {
  const [filter, setFilter] = useState<TaskFilter>(emptyTaskFilter);
  const input = useRef<HTMLInputElement>(null);
  const today = useLocalDate();
  useEffect(() => {
    if (focusRequest) input.current?.focus();
  }, [focusRequest]);
  const taskBlocks = flattenBlocks(plan.blocks).filter(
    (b) => b.type === "task",
  );
  const referenced = new Set(taskBlocks.map((b) => b.props.taskId));
  const tasks = Object.values(plan.tasks).filter((t) => referenced.has(t.id));
  const active =
    filter.query ||
    filter.status !== "all" ||
    filter.priority !== "all" ||
    filter.assignee !== "all" ||
    filter.deadline !== "all";
  const results = tasks.filter((t) => matchesTask(t, filter, today));
  const change = <K extends keyof TaskFilter>(key: K, value: TaskFilter[K]) =>
    setFilter((f) => ({ ...f, [key]: value }));
  return (
    <section className="task-search" aria-label="Поиск заданий">
      <Input
        ref={input}
        type="search"
        aria-label="Поиск задач"
        placeholder="Найти задание…"
        value={filter.query}
        onChange={(e) => change("query", e.target.value)}
      />
      <div className="task-search-filters">
        <select
          aria-label="Статус в поиске"
          value={filter.status}
          onChange={(e) => change("status", e.target.value)}
        >
          <option value="all">Любой статус</option>
          {Object.entries(statusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Приоритет в поиске"
          value={filter.priority}
          onChange={(e) => change("priority", e.target.value)}
        >
          <option value="all">Любой приоритет</option>
          {Object.entries(priorityLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Ответственный в поиске"
          value={filter.assignee}
          onChange={(e) => change("assignee", e.target.value)}
        >
          <option value="all">Все ответственные</option>
          {[
            ...new Set(
              tasks
                .map((t) => t.assignee)
                .filter((s): s is string => Boolean(s)),
            ),
          ]
            .sort((a, b) => a.localeCompare(b, "ru"))
            .map((s) => (
              <option key={s}>{s}</option>
            ))}
        </select>
        <select
          aria-label="Дедлайн в поиске"
          value={filter.deadline}
          onChange={(e) =>
            change("deadline", e.target.value as TaskFilter["deadline"])
          }
        >
          {Object.entries(deadlineFilters).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="task-search-shortcuts" aria-label="Быстрые фильтры задач">
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={filter.deadline === "overdue"}
          onClick={() => setFilter({ ...emptyTaskFilter, deadline: "overdue" })}
        >
          Просрочено
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={filter.deadline === "thisWeek"}
          onClick={() =>
            setFilter({ ...emptyTaskFilter, deadline: "thisWeek" })
          }
        >
          На этой неделе
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={filter.status === "review"}
          onClick={() => setFilter({ ...emptyTaskFilter, status: "review" })}
        >
          На проверке
        </Button>
      </div>
      {active && (
        <>
          <div className="task-search-count">
            <span role="status">Найдено задач: {results.length}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFilter(emptyTaskFilter)}
            >
              Сбросить
            </Button>
          </div>
          <p className="search-hint">
            Выберите результат, чтобы перейти к брифу. Документ показан целиком.
          </p>
          {!results.length && (
            <p className="search-hint" role="status">
              Задачи не найдены
            </p>
          )}
          <nav aria-label="Результаты поиска задач">
            {results.map((task) => {
              const b = taskBlocks.find(
                (b) => b.type === "task" && b.props.taskId === task.id,
              );
              return (
                b?.id && (
                  <button
                    key={task.id}
                    className="task-search-result"
                    onClick={() => select(b.id!)}
                  >
                    <strong>{task.title || "Без названия"}</strong>
                    <small>
                      {task.assignee || "Не назначены"} ·{" "}
                      {statusLabels[task.status]}
                    </small>
                    <small>{deadlineInfo(task, today).label}</small>
                  </button>
                )
              );
            })}
          </nav>
        </>
      )}
    </section>
  );
}
