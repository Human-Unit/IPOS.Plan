import type { AssignmentRow } from "@/features/activists/workload";
import { deadlineInfo } from "@/features/plans/productivity";

export type CalendarMode = "week" | "month";
export type CalendarEvent = { day: string; kind: "deadline" | "publication"; row: AssignmentRow };

const utcDate = (day: string) => new Date(day + "T00:00:00Z");
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const weekOffset = (date: Date) => (date.getUTCDay() + 6) % 7;
const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export const displayDay = (day: string) => dayName.format(utcDate(day));
function sentenceCase(label: string) {
  return label.charAt(0).toLocaleUpperCase("ru-RU") + label.slice(1);
}
export const displayFullDay = (day: string) => sentenceCase(fullDay.format(utcDate(day)));

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function calendarDays(anchor: string, mode: CalendarMode) {
  const day = utcDate(anchor);
  if (mode === "week") {
    const start = addDays(day, -weekOffset(day));
    return Array.from({ length: 7 }, (_, index) => dateKey(addDays(start, index)));
  }
  day.setUTCDate(1);
  const start = addDays(day, -weekOffset(day));
  const next = new Date(day);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const count = Math.ceil((weekOffset(day) + (next.getTime() - day.getTime()) / 86400000) / 7) * 7;
  return Array.from({ length: count }, (_, index) => dateKey(addDays(start, index)));
}

export function moveCalendar(anchor: string, mode: CalendarMode, direction: -1 | 1) {
  const date = utcDate(anchor);
  if (mode === "week") return dateKey(addDays(date, direction * 7));
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return dateKey(date);
}

export function calendarLabel(anchor: string, mode: CalendarMode, days: string[]) {
  return mode === "month"
    ? sentenceCase(monthName.format(utcDate(anchor)))
    : displayDay(days[0]) + " — " + displayDay(days[days.length - 1]);
}

export function calendarEvents(rows: AssignmentRow[]): CalendarEvent[] {
  return rows.flatMap((row) => {
    const events: CalendarEvent[] = [];
    if (row.task.deadline) events.push({ day: row.task.deadline, kind: "deadline", row });
    if (row.editorial?.publicationDate) {
      events.push({ day: row.editorial.publicationDate, kind: "publication", row });
    }
    return events;
  }).sort((a, b) => a.day.localeCompare(b.day) || a.row.task.title.localeCompare(b.row.task.title, "ru"));
}

export function deadlineHighlights(events: CalendarEvent[], today: string) {
  const deadlines = events.filter((entry) => entry.kind === "deadline");
  const overdue: CalendarEvent[] = [];
  const upcoming: CalendarEvent[] = [];
  for (const entry of deadlines) {
    const info = deadlineInfo(entry.row.task, today);
    if (info.kind === "overdue") overdue.push(entry);
    else if (info.days !== undefined && info.days <= 7) upcoming.push(entry);
  }
  return { overdue, upcoming };
}
