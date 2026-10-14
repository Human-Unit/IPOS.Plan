"use client";
import { Badge } from "@/components/ui/badge";
import { usePlanContext } from "@/components/editor/plan-context";
import { SelectableBlock } from "@/components/editor/selectable-block";
import {
  ReferenceContent,
  ImageContent,
} from "@/components/editor/media-content";
import { statusLabels, priorityLabels } from "@/lib/labels";
import { flattenBlocks } from "@/lib/schema/plan";

export function TaskCard({
  taskId,
  blockId,
}: {
  taskId: string;
  blockId: string;
}) {
  const { plan, companions } = usePlanContext();
  const task = plan.tasks[taskId];
  if (!task) return <p role="alert">Задача недоступна: {taskId}</p>;
  const media = companions[blockId] ?? [];
  const images = media.filter((b) => b.type === "image");
  const references = media.filter((b) => b.type === "reference");
  const deadline = task.deadline?.split("-").reverse().join(".");
  const number =
    flattenBlocks(plan.blocks)
      .filter((b) => b.type === "task")
      .findIndex(
        (b) => b.id === blockId || (!b.id && b.props.taskId === taskId),
      ) + 1;

  return (
    <SelectableBlock
      id={blockId}
      label={`Задача: ${task.title}`}
      className="task-brief"
    >
      <div className="brief-heading">
        <h3>
          {number > 0 && (
            <span className="brief-number" aria-hidden="true">
              {String(number).padStart(2, "0")}
            </span>
          )}
          {task.title || "Без названия"}
        </h3>
        <Badge
          variant="secondary"
          className={`brief-status brief-status-${task.status}`}
        >
          {statusLabels[task.status]}
        </Badge>
      </div>

      <div className={`brief-body${images.length ? " has-media" : ""}`}>
        <div className="brief-copy">
          {task.description && (
            <div className="brief-description">
              <span className="brief-label">Описание</span>
              <p>{task.description}</p>
            </div>
          )}

          {references.length > 0 && (
            <div className="brief-references">
              <span className="brief-label">Референсы</span>
              {references.map((b) => (
                <ReferenceContent key={b.id} block={b} />
              ))}
            </div>
          )}

          <div className="brief-facts">
            <div className="brief-fact brief-fact-deadline">
              <span className="brief-label">Дедлайн</span>
              <strong>{deadline || "не указан"}</strong>
            </div>
            <div className="brief-fact">
              <span className="brief-label">Ответственные</span>
              <strong>{task.assignee || "не назначены"}</strong>
            </div>
            <div className="brief-fact brief-fact-priority">
              <span className="brief-label">Приоритет</span>
              <strong>{priorityLabels[task.priority]}</strong>
            </div>
          </div>
        </div>

        {images.length > 0 && (
          <div className="brief-media">
            {images.map((b) => (
              <ImageContent key={b.id} block={b} />
            ))}
          </div>
        )}
      </div>
    </SelectableBlock>
  );
}
