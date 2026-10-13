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
        <Badge variant="secondary">{statusLabels[task.status]}</Badge>
      </div>
      <div className={`brief-body${images.length ? " has-media" : ""}`}>
        <div className="brief-copy">
          {task.description && (
            <div className="brief-description">
              <span className="brief-label">Описание и требования</span>
              <p>{task.description}</p>
            </div>
          )}
          {media
            .filter((b) => b.type === "reference")
            .map((b) => (
              <ReferenceContent key={b.id} block={b} />
            ))}
          <p className="brief-deadline">Дедлайн — {deadline || "не указан"}</p>
          <p className="brief-assignee">
            Ответственные — {task.assignee || "не назначены"}
          </p>
          <p className="brief-priority">
            Приоритет: {priorityLabels[task.priority]}
          </p>
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
