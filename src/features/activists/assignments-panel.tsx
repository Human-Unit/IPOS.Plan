"use client";
import type { Block, PortablePlan } from "@/lib/schema/plan";
import { liveTasks, confirmedAssignment } from "./task-assignments";
import { usePlanContext } from "@/components/editor/plan-context";
import { AssignedPeople } from "./assigned-people";
import { statusLabels } from "@/lib/labels";

/** Read-only navigation: never filter or mutate the BlockNote document. */
export function AssignmentsPanel({
  plan, blocks, selectedId, select,
}: {
  plan: PortablePlan;
  blocks: Block[];
  selectedId?: string;
  select: (id: string) => void;
}) {
  const context = usePlanContext();
  const local = { ...plan, blocks, assignments: context.plan.assignments };
  const tasks = liveTasks(local).filter(item => item.blockId);
  const assigned = tasks.filter(item => Boolean(item.task.assignee?.trim())).length;

  return (
    <details className="assignments-panel" open>
      <summary>
        <span>Назначения</span>
        <small>{assigned} / {tasks.length}</small>
      </summary>
      {!tasks.length ? (
        <p className="search-hint">Добавьте первое задание, чтобы видеть назначения.</p>
      ) : (
        <nav aria-label="Быстрый переход к заданиям" className="assignments-list">
          {tasks.map(({ blockId, task }, index) => (
            <div key={blockId} className="assignment-entry">
            <button
              type="button"
              key={blockId}
              className="assignment-row"
              aria-current={selectedId === blockId ? "location" : undefined}
              onClick={() => select(blockId!)}
              title={task?.title || "Без названия"}
            >
              <span className="assignment-row-title">
                <small>{String(index + 1).padStart(2, "0")}</small>
                <span>{task?.title || "Без названия"}</span>
              </span>
              <span className="assignment-row-people">
                {confirmedAssignment(local, task.id) ? "Профили ниже" : task.assignee || "Не назначены"}
                {" · "}{task && statusLabels[task.status]}
              </span>
            </button>
            {confirmedAssignment(local, task.id) && <div className="assignment-profile-links"><AssignedPeople assignment={confirmedAssignment(local, task.id)!} text={task.assignee || ""} openPerson={context.openPerson} /></div>}
            </div>
          ))}
        </nav>
      )}
    </details>
  );
}
