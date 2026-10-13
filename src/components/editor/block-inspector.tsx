"use client";
import { useId } from "react";
import { MousePointer2, Trash2 } from "lucide-react";
import type { Block } from "@/lib/schema/plan";
import { webUrl } from "@/lib/schema/plan";
import { usePlanContext } from "./plan-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { statuses, priorities, type Task } from "@/lib/schema/task";
import { statusLabels, priorityLabels } from "@/lib/labels";

export function BlockInspector({
  block,
  updateProps,
  remove,
}: {
  block?: Block;
  updateProps: (props: Record<string, string>) => void;
  remove: () => void;
}) {
  const id = useId();
  const { plan, updateTask } = usePlanContext();
  const task =
    block?.type === "task" ? plan.tasks[block.props.taskId] : undefined;
  const change = (patch: Partial<Task>) =>
    task && updateTask?.({ ...task, ...patch });
  const field = (
    key: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options?: { multiline?: boolean; type?: string; max?: number },
  ) => (
    <Field key={key}>
      <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
      {options?.multiline ? (
        <Textarea
          id={`${id}-${key}`}
          value={value}
          maxLength={options.max ?? 10000}
          rows={5}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={`${id}-${key}`}
          type={options?.type ?? "text"}
          value={value}
          maxLength={options?.max ?? 500}
          aria-invalid={
            options?.type === "url" &&
            Boolean(value && !webUrl.safeParse(value).success)
          }
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
  return (
    <div className="block-inspector">
      <p className="panel-eyebrow">СВОЙСТВА БЛОКА</p>
      {!block ? (
        <div className="inspector-empty">
          <MousePointer2 size={24} aria-hidden="true" />
          <h2>Выберите блок</h2>
          <p>
            Нажмите на задачу, референс или изображение в документе, чтобы
            изменить свойства.
          </p>
        </div>
      ) : (
        <>
          <h2>
            {task
              ? "Задача"
              : block.type === "reference"
                ? "Референс"
                : block.type === "image"
                  ? "Изображение"
                  : "Текстовый блок"}
          </h2>
          <FieldGroup>
            {task ? (
              <>
                {field("title", "Название задачи", task.title, (value) =>
                  change({ title: value }),
                )}
                {field(
                  "description",
                  "Описание",
                  task.description ?? "",
                  (value) => change({ description: value || undefined }),
                  { multiline: true },
                )}
                <p className="inspector-hint">
                  Формат, разрешение и FPS можно указать в описании.
                </p>
                {field(
                  "assignee",
                  "Ответственные",
                  task.assignee ?? "",
                  (value) => change({ assignee: value || undefined }),
                  { max: 200 },
                )}
                {field(
                  "deadline",
                  "Дедлайн",
                  task.deadline ?? "",
                  (value) => change({ deadline: value || undefined }),
                  { type: "date" },
                )}
                <Field>
                  <FieldLabel htmlFor={`${id}-status`}>Статус</FieldLabel>
                  <select
                    id={`${id}-status`}
                    value={task.status}
                    onChange={(e) =>
                      change({ status: e.target.value as Task["status"] })
                    }
                  >
                    {statuses.map((s) => (
                      <option value={s} key={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-priority`}>Приоритет</FieldLabel>
                  <select
                    id={`${id}-priority`}
                    value={task.priority}
                    onChange={(e) =>
                      change({ priority: e.target.value as Task["priority"] })
                    }
                  >
                    {priorities.map((p) => (
                      <option value={p} key={p}>
                        {priorityLabels[p]}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : block.type === "reference" ? (
              <>
                {field(
                  "url",
                  "Ссылка",
                  block.props.url,
                  (value) => updateProps({ url: value }),
                  { type: "url", max: 4000 },
                )}
                {field(
                  "title",
                  "Название референса",
                  block.props.title,
                  (value) => updateProps({ title: value }),
                )}
                {field(
                  "note",
                  "Примечание",
                  block.props.note,
                  (value) => updateProps({ note: value }),
                  { multiline: true },
                )}
              </>
            ) : block.type === "image" ? (
              <>
                {field(
                  "url",
                  "URL изображения",
                  block.props.url,
                  (value) => updateProps({ url: value }),
                  { type: "url", max: 4000 },
                )}
                {field(
                  "caption",
                  "Подпись изображения",
                  block.props.caption,
                  (value) => updateProps({ caption: value }),
                  { max: 2000 },
                )}
              </>
            ) : (
              <p className="inspector-hint">
                Редактируйте текст в документе. Выделите фрагмент для
                форматирования.
              </p>
            )}
          </FieldGroup>
          <Button
            size="sm"
            variant="ghost"
            className="remove-block"
            onClick={remove}
          >
            <Trash2 size={15} />
            Удалить блок
          </Button>
        </>
      )}
    </div>
  );
}
