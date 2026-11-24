import Link from "next/link";
import { ArrowUpRight, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/schema/plan";
import { nextUnfinishedTask } from "./productivity";

type Props = {
  recentPlan?: Plan;
  busy: boolean;
  onCreate: () => void;
};

export function DashboardOpening({ recentPlan, busy, onCreate }: Props) {
  const tasks = recentPlan ? Object.values(recentPlan.tasks) : [];
  const done = tasks.filter((task) => task.status === "done").length;
  const nextTask = nextUnfinishedTask(tasks);
  const progress = tasks.length ? (done / tasks.length) * 100 : 0;

  return (
    <section className="dashboard-opening" data-enter aria-labelledby="dashboard-title">
      <div className="council-paper-scene" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="dashboard-opening-inner dashboard-wrap">
        <div className="dashboard-overview-heading">
          <div className="dashboard-hero-copy">
            <h1 id="dashboard-title">Контент-планы</h1>
          </div>
          <div className="dashboard-actions">
            <Button data-primary-action disabled={busy} onClick={onCreate}>
              <Plus data-icon="inline-start" />
              Новый план
            </Button>
          </div>
        </div>
        {recentPlan && (
          <div className="recent-plan-stack">
            <Link className="recent-plan" aria-label={`Открыть последний изменённый план: ${recentPlan.title || "Без названия"}`} aria-describedby={nextTask?.title ? "recent-plan-next-task" : undefined} href={`/plan/${recentPlan.id}`}>
              <span className="recent-plan-label">
                <History size={15} aria-hidden="true" /> Продолжить работу
              </span>
              <strong>{recentPlan.title || "Без названия"}</strong>
              {nextTask?.title && (
                <span id="recent-plan-next-task" className="recent-plan-task">Следующая задача: {nextTask.title}</span>
              )}
              <span className="recent-plan-details">
                <span className="recent-plan-progress">
                  <span className="recent-plan-track" aria-hidden="true">
                    <span style={{ width: `${progress}%` }} />
                  </span>
                  {tasks.length ? `${done} из ${tasks.length} готово` : "Пока без задач"}
                </span>
                <span className="recent-plan-open">
                  Открыть <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
