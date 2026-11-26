"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/database";
import { errorMessage } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { EditorialHeader } from "@/components/plan/editorial-header";
import { usePeople } from "@/features/activists/people-hooks";
import { assignmentRows } from "@/features/activists/workload";
import { taskHref } from "@/features/activists/task-assignments";
import { deadlineInfo } from "@/features/plans/productivity";
import { useLocalDate } from "@/features/plans/use-local-date";
import { defaultEditorialFilter, EditorialFilters, editorialMatches } from "./editorial-filters";
import {
  calendarDays, calendarEvents, calendarLabel, deadlineHighlights, displayDay,
  displayFullDay, moveCalendar, type CalendarEvent, type CalendarMode,
} from "./calendar";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const eventKey = ({ row, kind }: CalendarEvent) => JSON.stringify([row.planId, row.task.id, kind]);

function CalendarEntry({ entry, today, showDate = false }: {
  entry: CalendarEvent;
  today: string;
  showDate?: boolean;
}) {
  const { row, kind, day } = entry;
  const late = kind === "deadline" && deadlineInfo(row.task, today).kind === "overdue";
  const Icon = kind === "deadline" ? Clock3 : CalendarDays;
  return (
    <li className="calendar-entry" data-kind={kind} data-overdue={late || undefined}>
      <Link href={taskHref(row.planId, row.task.id)}>
        <span className="calendar-entry-kind">
          <Icon size={14} aria-hidden="true" />
          {kind === "publication" ? "Плановая публикация" : late ? "Просрочен" : "Дедлайн"}
          {showDate && <time dateTime={day}>{displayDay(day)}</time>}
        </span>
        <strong>{row.task.title || "Задача без названия"}</strong>
        <small>{row.planTitle}</small>
      </Link>
    </li>
  );
}

export function CalendarScreen() {
  const today = useLocalDate();
  const roster = usePeople();
  const library = useLiveQuery(async () => {
    try { return { plans: await db.plans.orderBy("updatedAt").reverse().toArray(), error: "" }; }
    catch (error) { return { plans: [], error: errorMessage(error) }; }
  });
  const [mode, setMode] = useState<CalendarMode>("month");
  const [date, setDate] = useState("");
  const [filter, setFilter] = useState(defaultEditorialFilter);
  const anchor = date || today;
  const events = useMemo(() => calendarEvents(assignmentRows(library?.plans ?? [])
    .filter((row) => editorialMatches(row, filter))), [library, filter]);
  const days = anchor ? calendarDays(anchor, mode) : [];
  const month = anchor.slice(0, 7);
  const grouped = new Map<string, CalendarEvent[]>();
  for (const entry of events) {
    if (entry.day < days[0] || entry.day > days[days.length - 1]) continue;
    const bucket = grouped.get(entry.day) ?? [];
    bucket.push(entry);
    grouped.set(entry.day, bucket);
  }
  const groups = deadlineHighlights(events, today);
  const error = library?.error || roster.error;
  return (
    <>
      <EditorialHeader backHref="/" backLabel="К планам" />
      <main className="people-page editorial-calendar">
        <div className="people-heading">
          <div>
            <h1>Календарь</h1>
            <p className="muted">Дедлайны задач и плановые публикации. Даты редактируются в свойствах брифа.</p>
          </div>
        </div>
        {error && <p className="person-error" role="alert">{error}</p>}
        <EditorialFilters plans={library?.plans ?? []} people={roster.people} filter={filter} onChange={setFilter} />
        <section className="calendar-period" aria-labelledby="calendar-period-title">
          <div className="calendar-toolbar">
            <h2 id="calendar-period-title" aria-live="polite">{anchor ? calendarLabel(anchor, mode, days) : "Загрузка календаря…"}</h2>
            <div className="calendar-controls">
              <Button variant="outline" aria-label="Предыдущий период" disabled={!anchor} onClick={() => setDate(moveCalendar(anchor, mode, -1))}><ChevronLeft aria-hidden="true" /></Button>
              <Button variant="outline" onClick={() => setDate("")}>Сегодня</Button>
              <Button variant="outline" aria-label="Следующий период" disabled={!anchor} onClick={() => setDate(moveCalendar(anchor, mode, 1))}><ChevronRight aria-hidden="true" /></Button>
            </div>
            <div className="calendar-controls" role="group" aria-label="Вид календаря">
              <Button variant={mode === "month" ? "default" : "outline"} aria-pressed={mode === "month"} onClick={() => setMode("month")}>Месяц</Button>
              <Button variant={mode === "week" ? "default" : "outline"} aria-pressed={mode === "week"} onClick={() => setMode("week")}>Неделя</Button>
            </div>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {days.map((day) => {
              const entries = grouped.get(day) ?? [];
              return (
                <section className="calendar-day" key={day} data-empty={!entries.length || undefined} data-outside={mode === "month" && !day.startsWith(month) || undefined} aria-label={displayFullDay(day)}>
                  <h3><time dateTime={day} aria-current={today === day ? "date" : undefined}>
                    <span className="calendar-desktop-day">{Number(day.slice(-2))}</span>
                    <span className="calendar-mobile-day">{displayFullDay(day)}</span>
                  </time></h3>
                  {!!entries.length && <ul>{entries.map((entry) => <CalendarEntry key={eventKey(entry)} entry={entry} today={today} />)}</ul>}
                </section>
              );
            })}
          </div>
          {!!library && !grouped.size && <p className="calendar-empty">В этом периоде нет задач с выбранными условиями.</p>}
        </section>
        <div className="calendar-highlights">
          {([["Просроченные дедлайны", groups.overdue], ["Дедлайны на 7 дней", groups.upcoming]] as const).map(([label, entries]) => (
            <section key={label}>
              <h2>{label}</h2>
              {entries.length ? <ul>{entries.map((entry) => <CalendarEntry key={eventKey(entry)} entry={entry} today={today} showDate />)}</ul>
                : <p className="muted">Нет задач</p>}
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
