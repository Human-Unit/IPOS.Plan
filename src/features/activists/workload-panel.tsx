"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Person } from "@/lib/schema/person";
import { membershipLabels } from "@/lib/schema/person";
import { statusLabels } from "@/lib/labels";
import { useLocalDate } from "@/features/plans/use-local-date";
import { taskHref } from "./task-assignments";
import {
  assignmentRows,
  emptyWorkloadFilter,
  filterAssignmentRows,
  workSummary,
} from "./workload";

export function WorkloadPanel({
  people,
  personId,
}: {
  people: Person[];
  personId?: string;
}) {
  const plans = useLiveQuery(() => db.plans.toArray());
  const today = useLocalDate();
  const allRows = useMemo(() => assignmentRows(plans ?? []), [plans]);
  const baseRows = personId
    ? allRows.filter((row) => row.personIds.includes(personId))
    : allRows;
  const [filter, setFilter] = useState(emptyWorkloadFilter);
  const visible = filterAssignmentRows(baseRows, filter, today);
  const summary = workSummary(baseRows, today);
  const displayedPeople =
    filter.personId === "all"
      ? people
      : people.filter((p) => p.id === filter.personId);
  const [shown, setShown] = useState(50);
  const change = (key: keyof typeof filter, value: string) => {
    setFilter((f) => ({ ...f, [key]: value }));
    setShown(50);
  };
  return (
    <section
      className="workload-section"
      aria-label={personId ? "Задания профиля" : "Нагрузка команды"}
    >
      <h2>
        {personId ? "Работа в сохранённых планах" : "Распределение заданий"}
      </h2>
      {personId && (
        <dl className="work-summary" aria-label="Сводка всех заданий профиля">
          {[
            ["Всего", summary.total],
            ["Не завершено", summary.unfinished],
            ["В работе", summary.inProgress],
            ["На проверке", summary.review],
            ["Готово", summary.completed],
            ["Просрочено", summary.overdue],
          ].map(([label, count]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{count}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="people-footnote">
        Это текущие состояния сохранённых задач, а не часы работы или рейтинг
        людей. Совместное задание учитывается у каждого участника. Период ниже
        относится к дедлайну, не к дате завершения.
      </p>
      <div
        className="workload-filters"
        role="group"
        aria-label="Фильтры заданий"
      >
        {!personId && (
          <label>
            Участник
            <select
              aria-label="Участник в нагрузке"
              value={filter.personId}
              onChange={(e) => change("personId", e.target.value)}
            >
              <option value="all">Все участники</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} · {p.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Статус задачи
          <select
            aria-label="Статус задач в нагрузке"
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
        </label>
        <label>
          План
          <select
            aria-label="План в нагрузке"
            value={filter.planId}
            onChange={(e) => change("planId", e.target.value)}
          >
            <option value="all">Все планы</option>
            {plans?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Срок
          <select
            aria-label="Срок в нагрузке"
            value={filter.deadline}
            onChange={(e) => change("deadline", e.target.value)}
          >
            <option value="all">Любой дедлайн</option>
            <option value="overdue">Просрочено</option>
            <option value="today">Сегодня</option>
            <option value="week">В ближайшие 7 дней</option>
            <option value="none">Без дедлайна</option>
          </select>
        </label>
        <label>
          Дедлайн с
          <Input
            aria-label="Дедлайн с"
            type="date"
            value={filter.from}
            onChange={(e) => change("from", e.target.value)}
          />
        </label>
        <label>
          Дедлайн по
          <Input
            aria-label="Дедлайн по"
            type="date"
            value={filter.to}
            onChange={(e) => change("to", e.target.value)}
          />
        </label>
        <Button
          variant="ghost"
          onClick={() => {
            setFilter(emptyWorkloadFilter);
            setShown(50);
          }}
        >
          Сбросить срез
        </Button>
      </div>
      {filter.from && filter.to && filter.from > filter.to && (
        <p role="alert" className="person-error">
          Начальная дата должна быть не позже конечной.
        </p>
      )}
      {!personId && (
        <>
          <p className="people-count" role="status">
            Срез: {visible.length} / {baseRows.length} уникальных заданий. Ниже
            — подтверждённые привязки людей.
          </p>
          <div className="workload-table-wrap">
            <table className="workload-table">
              <caption className="sr-only">
                Нагрузка по текущим фильтрам
              </caption>
              <thead>
                <tr>
                  <th>Участник</th>
                  <th>Всего</th>
                  <th>В работе</th>
                  <th>На проверке</th>
                  <th>Готово</th>
                  <th>Просрочено</th>
                </tr>
              </thead>
              <tbody>
                {displayedPeople.map((p) => {
                  const stats = workSummary(
                    visible.filter((r) => r.personIds.includes(p.id)),
                    today,
                  );
                  return (
                    <tr key={p.id}>
                      <th scope="row">
                        <Link href={`/activists/${p.id}`}>{p.displayName}</Link>
                        <small>
                          {membershipLabels[p.membershipStatus]} ·{" "}
                          {p.id.slice(0, 8)}
                        </small>
                      </th>
                      {[
                        ["Всего", stats.total],
                        ["В работе", stats.inProgress],
                        ["На проверке", stats.review],
                        ["Готово", stats.completed],
                        ["Просрочено", stats.overdue],
                      ].map(([label, count]) => (
                        <td key={label} data-label={label}>
                          {count}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <details className="workload-tasks" open={Boolean(personId)}>
        <summary>Задания · {visible.length}</summary>
        {!visible.length && (
          <p className="people-empty">
            {baseRows.length
              ? "Нет заданий по выбранным условиям."
              : "Нет подтверждённых привязок к заданиям. Совпадения имён в старых текстах не считаются назначением."}
          </p>
        )}
        <ul className="person-task-list" aria-label="Назначенные задания">
          {visible.slice(0, shown).map((row) => (
            <li key={`${row.planId}:${row.task.id}`}>
              <div>
                <Link href={taskHref(row.planId, row.task.id)}>
                  {row.task.title || "Без названия"}
                </Link>
                <small>{row.planTitle}</small>
                <small>{row.task.assignee || "Не назначены"}</small>
              </div>
              <span>{statusLabels[row.task.status]}</span>
              <time dateTime={row.task.deadline}>
                {row.task.deadline?.split("-").reverse().join(".") ||
                  "Без дедлайна"}
              </time>
            </li>
          ))}
        </ul>
        {visible.length > shown && (
          <Button variant="ghost" onClick={() => setShown((n) => n + 50)}>
            Показать ещё задания
          </Button>
        )}
      </details>
    </section>
  );
}
