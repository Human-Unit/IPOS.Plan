"use client";
import { Badge } from "@/components/ui/badge";
import { usePlanContext } from "@/components/editor/plan-context";
import { SelectableBlock } from "@/components/editor/selectable-block";
import {
  ReferenceContent,
  ImageContent,
} from "@/components/editor/media-content";
import { statusLabels, priorityLabels } from "@/lib/labels";

function taskTitleParts(title: string) {
  const match = title.match(/^\s*([^–—-]+?)\s*[–—-]\s*(.+)$/);
  if (!match) return { kind: title || "Контент", topic: "" };
  return { kind: match[1].trim(), topic: match[2].trim() };
}

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
  const { kind, topic } = taskTitleParts(task.title);

  return (
    <SelectableBlock
      id={blockId}
      label={`Задача: ${task.title}`}
      className="task-brief docx-brief"
    >
      <div className="brief-heading docx-brief-heading">
        <div className="docx-heading-copy">
          <p className="docx-line docx-kind-line">
            <strong>Вид контента – </strong>
            <span>{kind || "не указан"}</span>
          </p>
          {topic && <p className="docx-topic">{topic}</p>}
        </div>
        <Badge
          variant="secondary"
          className={`brief-status brief-status-${task.status}`}
        >
          {statusLabels[task.status]}
        </Badge>
      </div>

      <div className={`brief-body${images.length ? " has-media" : ""}`}>
        <div className="brief-copy docx-copy">
          {task.description && (
            <p className="docx-line docx-description">
              <strong>Описание – </strong>
              <span>{task.description}</span>
            </p>
          )}

          {references.length > 0 && (
            <div className="brief-references docx-references">
              {references.map((b) => (
                <ReferenceContent key={b.id} block={b} />
              ))}
            </div>
          )}

          {deadline && (
            <p className="docx-deadline">
              <strong>Дедлайн: Видео должно быть готовым к {deadline}</strong>
            </p>
          )}

          <p className="docx-assignee">
            <strong>
              Ответственное лицо – {task.assignee || "не назначено"}
            </strong>
          </p>

          <p className="docx-priority" aria-label="Приоритет задачи">
            Приоритет: {priorityLabels[task.priority]}
          </p>
        </div>

        {images.length > 0 && (
          <div className="brief-media docx-media">
            {images.map((b) => (
              <ImageContent key={b.id} block={b} />
            ))}
          </div>
        )}
      </div>
    </SelectableBlock>
  );
}
