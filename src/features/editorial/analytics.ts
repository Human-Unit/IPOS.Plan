import type { Activity } from "@/lib/db/database";
import type { Plan } from "@/lib/schema/plan";
import { productionStages, stageLabels, type ProductionStage } from "@/lib/schema/editorial";
import { assignmentRows, workloadByPerson } from "@/features/activists/workload";
import { deadlineInfo, localDate, taskStats } from "@/features/plans/productivity";
import { productionStage } from "./stages";

function dayFrom(today: string, offset: number) {
  const date = new Date(today + "T00:00:00");
  date.setDate(date.getDate() + offset);
  return date;
}

export function activityPeriod(today: string) {
  return {
    from: dayFrom(today, -6).toISOString(),
    to: dayFrom(today, 1).toISOString(),
  };
}

export function activityDays(events: Activity[], today: string) {
  const counts = new Map(Array.from({ length: 7 }, (_, index) => [
    localDate(dayFrom(today, index - 6)), 0,
  ]));
  for (const event of events) {
    if (!event.type.startsWith("TASK_")) continue;
    const day = localDate(new Date(event.createdAt));
    const count = counts.get(day);
    if (count !== undefined) counts.set(day, count + 1);
  }
  return Array.from(counts, ([day, count]) => ({ day, count }));
}

export function editorialMetrics(plans: Plan[], today: string) {
  const rows = assignmentRows(plans);
  const cutoff = localDate(dayFrom(today, 7));
  const stageCounts = new Map<ProductionStage | null, number>();
  let legacyDone = 0;
  for (const row of rows) {
    const stage = productionStage(row.task, row.editorial, row.personIds.length > 0);
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
    if (stage === "published" && row.editorial?.stage !== "published") legacyDone++;
  }
  const stages = [...productionStages, null].map((stage) => ({
    id: stage ?? "cancelled",
    label: stage ? stageLabels[stage] : "Отменено",
    count: stageCounts.get(stage) ?? 0,
  }));
  const late = rows
    .filter((row) => deadlineInfo(row.task, today).kind === "overdue")
    .sort((a, b) => a.task.deadline!.localeCompare(b.task.deadline!));
  const upcoming = rows.flatMap((row) => {
    const day = row.editorial?.publicationDate;
    return day && day >= today && day <= cutoff && row.task.status !== "cancelled"
      && row.editorial?.stage !== "published" ? [{ row, day }] : [];
  }).sort((a, b) => a.day.localeCompare(b.day));
  return {
    total: rows.length,
    stats: taskStats(rows.map(({ task }) => task), today),
    stages,
    legacyDone,
    late,
    upcoming,
    workload: workloadByPerson(rows, today),
  };
}
