import Link from "next/link";
import { ArrowUpRight, History } from "lucide-react";
import type { Plan } from "@/lib/schema/plan";
import { nextUnfinishedTask } from "./productivity";

export function DashboardOpening({ plan }: { plan: Plan }) {
  const title = plan.title || "Без названия";
  const tasks = Object.values(plan.tasks);
  const done = tasks.filter((task) => task.status === "done").length;
  const nextTask = nextUnfinishedTask(tasks);

  return (
    <Link
      className="recent-plan"
      href={`/plan/${plan.id}`}
      aria-label={`Открыть последний изменённый план: ${title}`}
      aria-describedby="recent-plan-context"
    >
      <span className="recent-plan-label"><History size={16} aria-hidden="true" /> Продолжить работу</span>
      <ArrowUpRight className="recent-plan-arrow" size={20} aria-hidden="true" />
      <strong>{title}</strong>
      <span className="recent-plan-context" id="recent-plan-context">
        {nextTask?.title
          ? `Далее: ${nextTask.title}`
          : tasks.length ? `${done} из ${tasks.length} задач готово` : "Пока без задач"}
      </span>
    </Link>
  );
}
