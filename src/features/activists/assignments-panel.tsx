"use client";
import type { Block, PortablePlan } from "@/lib/schema/plan";
import { flattenBlocks } from "@/lib/schema/plan";
import { assigneeNames } from "./directory";
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
  const tasks = flattenBlocks(blocks)
    .filter((block) => block.type === "task" && block.id)
    .map((block) => ({
      blockId: block.id!,
      task: block.type === "task" ? plan.tasks[block.props.taskId] : undefined,
    }))
    .filter((item) => Boolean(item.task));
  const assigned = tasks.filter((item) => assigneeNames(item.task?.assignee).length > 0).length;

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
            <button
              type="button"
              key={blockId}
              className="assignment-row"
              aria-current={selectedId === blockId ? "location" : undefined}
              onClick={() => select(blockId)}
              title={task?.title || "Без названия"}
            >
              <span className="assignment-row-title">
                <small>{String(index + 1).padStart(2, "0")}</small>
                <span>{task?.title || "Без названия"}</span>
              </span>
              <span className="assignment-row-people">
                {assigneeNames(task?.assignee).length
                  ? assigneeNames(task?.assignee).join(", ")
                  : "Не назначены"}
                {" · "}{task && statusLabels[task.status]}
              </span>
            </button>
          ))}
        </nav>
      )}
    </details>
  );
}
