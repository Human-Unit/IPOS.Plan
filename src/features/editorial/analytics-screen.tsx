"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { EditorialHeader } from "@/components/plan/editorial-header";
import { db } from "@/lib/db/database";
import { errorMessage } from "@/lib/labels";
import { usePeople } from "@/features/activists/people-hooks";
import { taskHref } from "@/features/activists/task-assignments";
import { useLocalDate } from "@/features/plans/use-local-date";
import { activityDays, activityPeriod, editorialMetrics } from "./analytics";
import { displayDay } from "./calendar";
import { publicationReady } from "./review";
import { useEditorialPlans } from "./use-editorial-plans";

function Bars({ values }: { values: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...values.map((value) => value.count));
  return (
    <ul className="analytics-bars">
      {values.map(({ key, label, count }) => (
        <li key={key}>
          <span>{label}</span>
          <span className="analytics-bar" aria-hidden="true"><span style={{ width: count / max * 100 + "%" }} /></span>
          <strong>{count}</strong>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsScreen() {
  const today = useLocalDate();
  const library = useEditorialPlans();
  const roster = usePeople();
  const history = useLiveQuery(async () => {
    if (!today) return undefined;
    try {
      const { from, to } = activityPeriod(today);
      const events = await db.activity.where("createdAt").between(from, to, true, false).toArray();
      return { events, error: "" };
    } catch (error) {
      return { events: [], error: errorMessage(error) };
    }
  }, [today]);
  const metrics = useMemo(() => today && library ? editorialMetrics(library.plans, today) : undefined, [library, today]);
  const week = useMemo(() => today && history ? activityDays(history.events, today) : [], [history, today]);
  const error = library?.error || roster.error || history?.error;
  return (
    <>
      <EditorialHeader backHref="/" backLabel="К планам" />
      <main className="people-page editorial-analytics">
        <div className="people-heading">
          <div>
            <h1>Аналитика редакции</h1>
            <p className="muted">Сводка по сохранённым задачам и событиям в этом браузере.</p>
          </div>
        </div>
        {error && <p role="alert" className="person-error">{error}</p>}
        {!metrics || !roster.ready || !history ? <p role="status">Загрузка сводки…</p> :
          <>
            <dl className="analytics-totals" aria-label="Сводка задач">
              {[
                ["completed", "Завершены", metrics.stats.completed],
                ["outstanding", "Не завершены", metrics.stats.unfinished],
                ["overdue", "Просрочены", metrics.stats.overdue],
                ["upcoming", "Публикации на 7 дней", metrics.upcoming.length],
              ].map(([id, label, count]) => <div key={id} data-metric={id}><dt>{label}</dt><dd>{count}</dd></div>)}
            </dl>
            {!metrics.total && <p className="muted">Добавьте задания в план, чтобы увидеть показатели.</p>}
            <div className="analytics-grid">
              <section aria-labelledby="analytics-workflow-title">
                <h2 id="analytics-workflow-title">Этапы производства</h2>
                <Bars values={metrics.stages.map((stage) => ({ ...stage, key: stage.id }))} />
                {metrics.legacyDone > 0 && <p className="analytics-note">
                  В колонку «Опубликовано» входят задачи с прежним статусом «Готово»: {metrics.legacyDone}.
                </p>}
              </section>
              <section aria-labelledby="analytics-week-title">
                <h2 id="analytics-week-title">Активность за 7 дней</h2>
                <Bars values={week.map(({ day, count }) => ({ key: day, label: displayDay(day), count }))} />
                <p className="analytics-note">Количество сохранённых событий по задачам за каждый день.</p>
              </section>
              <section aria-labelledby="analytics-overdue-title">
                <h2 id="analytics-overdue-title">Просроченные дедлайны</h2>
                {metrics.late.length ? <ul className="analytics-links">
                  {metrics.late.map((row) => {
                    const href = taskHref(row.planId, row.task.id);
                    return <li key={href}>
                      <Link href={href}>{row.task.title || "Задача без названия"}</Link>
                      <span>{row.planTitle}</span>
                      <time dateTime={row.task.deadline}>{displayDay(row.task.deadline!)}</time>
                    </li>;
                  })}
                </ul> : <p className="muted">Нет просроченных задач.</p>}
              </section>
              <section aria-labelledby="analytics-publications-title">
                <h2 id="analytics-publications-title">Ближайшие публикации</h2>
                {metrics.upcoming.length ? <ul className="analytics-links">
                  {metrics.upcoming.map(({ row, day }) => {
                    const href = taskHref(row.planId, row.task.id);
                    return <li key={href}>
                      <Link href={href}>{row.task.title || "Задача без названия"}</Link>
                      <span>{row.planTitle}{publicationReady(row.task, row.editorial?.review) && " · Готово к публикации"}</span>
                      <time dateTime={day}>{displayDay(day)}</time>
                    </li>;
                  })}
                </ul> : <p className="muted">Нет плановых публикаций на ближайшие 7 дней.</p>}
              </section>
            </div>
            <section className="analytics-workload" aria-labelledby="analytics-workload-title">
              <h2 id="analytics-workload-title">Нагрузка участников</h2>
              <p className="analytics-note">Совместная задача учитывается у каждого явно назначенного участника.</p>
              {roster.people.length ? <table className="workload-table">
                <thead><tr><th scope="col">Участник</th><th scope="col">Всего</th><th scope="col">Не завершены</th><th scope="col">Просрочены</th><th scope="col">Завершены</th></tr></thead>
                <tbody>
                  {roster.people.map((person) => {
                    const workload = metrics.workload.get(person.id);
                    return <tr key={person.id}>
                      <th scope="row"><Link href={"/activists/" + person.id}>{person.displayName}</Link>
                        <small>{person.role ? person.role + " · " : ""}{person.id.slice(0, 8)}</small>
                      </th>
                      <td data-label="Всего">{workload?.total ?? 0}</td>
                      <td data-label="Не завершены">{workload?.unfinished ?? 0}</td>
                      <td data-label="Просрочены">{workload?.overdue ?? 0}</td>
                      <td data-label="Завершены">{workload?.completed ?? 0}</td>
                    </tr>;
                  })}
                </tbody>
              </table> : <p className="muted">В локальном справочнике пока нет участников.</p>}
            </section>
          </>}
      </main>
    </>
  );
}
