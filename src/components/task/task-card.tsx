"use client";
import {
  Circle,
  CircleDot,
  CircleCheck,
  CircleX,
  LoaderCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePlanContext } from "@/components/editor/plan-context";
import { SelectableBlock } from "@/components/editor/selectable-block";
import {
  ReferenceContent,
  ImageContent,
} from "@/components/editor/media-content";
import { statusLabels, priorityLabels } from "@/lib/labels";
import { flattenBlocks } from "@/lib/schema/plan";

const statusIcons = {
  todo: Circle,
  in_progress: LoaderCircle,
  review: CircleDot,
  done: CircleCheck,
  cancelled: CircleX,
};

export function TaskCard({
  taskId,
  blockId,
}: {
  taskId: string;
  blockId: string;
}) {
  const { plan, companions, embeddedIds, editable } = usePlanContext();
  const task = plan.tasks[taskId];
  if (!task) return <p role="alert">Задача недоступна: {taskId}</p>;
  const media = (companions[blockId] ?? []).filter(
    (block) => block.id && embeddedIds.has(block.id),
  );
  const images = media.filter((block) => block.type === "image");
  const references = media.filter((block) => block.type === "reference");
  const number =
    flattenBlocks(plan.blocks)
      .filter((block) => block.type === "task")
      .findIndex(
        (block) =>
          block.id === blockId || (!block.id && block.props.taskId === taskId),
      ) + 1;
  const StatusIcon = statusIcons[task.status];
  const deadline = task.deadline?.split("-").reverse().join(".");

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
          <span>{task.title || "Без названия"}</span>
        </h3>
        <Badge
          variant="secondary"
          className="task-status"
          data-status={task.status}
        >
          <StatusIcon aria-hidden="true" />
          {statusLabels[task.status]}
        </Badge>
      </div>
      <div className={`brief-body${images.length ? " has-media" : ""}`}>
        <div className="brief-copy">
          {task.description ? (
            <div className="brief-description">
              <span className="brief-label">Описание</span>
              <p>{task.description}</p>
            </div>
          ) : editable ? (
            <p className="brief-label">Добавьте описание в свойствах задачи.</p>
          ) : null}
        </div>
        {images.length > 0 && (
          <div className="brief-media">
            {images.map((block) => (
              <ImageContent key={block.id} block={block} />
            ))}
          </div>
        )}
      </div>
      {references.length > 0 && (
        <div className="brief-references">
          <span className="brief-label">Референсы</span>
          {references.map((block) => (
            <ReferenceContent key={block.id} block={block} />
          ))}
        </div>
      )}
      <dl className="brief-facts">
        <div className="brief-fact-deadline">
          <dt>Дедлайн</dt>
          <dd>{deadline || "Не указан"}</dd>
        </div>
        <div>
          <dt>Ответственные</dt>
          <dd>{task.assignee || "Не назначены"}</dd>
        </div>
      </dl>
      <p className="brief-priority">
        Приоритет: {priorityLabels[task.priority]}
      </p>
    </SelectableBlock>
  );
}
