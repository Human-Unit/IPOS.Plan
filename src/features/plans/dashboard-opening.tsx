import Link from "next/link";
import { ArrowUpRight, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/schema/plan";

type Props = {
  recentPlan?: Plan;
  busy: boolean;
  onCreate: () => void;
};

export function DashboardOpening({ recentPlan, busy, onCreate }: Props) {
  const tasks = recentPlan ? Object.values(recentPlan.tasks) : [];
  const done = tasks.filter((task) => task.status === "done").length;
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
            <p>Брифы, съёмки и задачи медиасектора в одной библиотеке.</p>
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
            <Link className="recent-plan" aria-label={`Открыть последний изменённый план: ${recentPlan.title || "Без названия"}`} href={`/plan/${recentPlan.id}`}>
              <span className="recent-plan-label">
                <History size={15} aria-hidden="true" /> Последнее изменение
              </span>
              <strong>{recentPlan.title || "Без названия"}</strong>
              {tasks[0] && <span className="recent-plan-task">{tasks[0].title}</span>}
              <span className="recent-plan-details">
                <span className="recent-plan-progress">
                  <span className="recent-plan-track" aria-hidden="true">
                    <span style={{ width: `${progress}%` }} />
                  </span>
                  {done} из {tasks.length} готово
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
