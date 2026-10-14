"use client";
import { useId } from "react";
import { MousePointer2, Trash2, Type, RotateCcw } from "lucide-react";
import type { Block, BlockTypography } from "@/lib/schema/plan";
import { webUrl } from "@/lib/schema/plan";
import { usePlanContext } from "./plan-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { statuses, priorities, type Task } from "@/lib/schema/task";
import { statusLabels, priorityLabels } from "@/lib/labels";

const textBlockTypes = new Set([
  "paragraph",
  "heading",
  "quote",
  "bulletListItem",
  "numberedListItem",
  "callout",
]);

const suggestedFonts = [
  "Inter",
  "Roboto",
  "Montserrat",
  "Merriweather",
  "Georgia",
  "Arial",
  "Verdana",
  "Trebuchet MS",
  "Times New Roman",
  "system-ui",
];

export function BlockInspector({
  block,
  updateProps,
  remove,
  typography,
  updateTypography,
}: {
  block?: Block;
  updateProps: (props: Record<string, string>) => void;
  remove: () => void;
  typography?: BlockTypography;
  updateTypography?: (value: BlockTypography) => void;
}) {
  const id = useId();
  const { plan, updateTask } = usePlanContext();
  const task =
    block?.type === "task" ? plan.tasks[block.props.taskId] : undefined;
  const tasks = Object.values(plan.tasks);
  const done = tasks.filter((item) => item.status === "done").length;
  const isTextBlock = Boolean(block && textBlockTypes.has(block.type));
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

  const typographyControls = isTextBlock && updateTypography && (
    <div className="typography-controls">
      <div className="typography-heading">
        <span>
          <Type size={15} aria-hidden="true" />
          Типографика
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => updateTypography({})}
          disabled={!typography || Object.keys(typography).length === 0}
        >
          <RotateCcw size={14} />
          Сбросить
        </Button>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-font-family`}>Шрифт</FieldLabel>
          <Input
            id={`${id}-font-family`}
            list={`${id}-font-options`}
            value={typography?.fontFamily ?? ""}
            maxLength={120}
            placeholder="По умолчанию"
            onChange={(e) =>
              updateTypography({
                ...typography,
                fontFamily: e.target.value || undefined,
              })
            }
          />
          <datalist id={`${id}-font-options`}>
            {suggestedFonts.map((font) => (
              <option key={font} value={font} />
            ))}
          </datalist>
          <p className="inspector-hint">
            Можно вписать свой font-family. На другом устройстве он отобразится,
            только если этот шрифт там установлен.
          </p>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-font-size`}>Размер</FieldLabel>
          <select
            id={`${id}-font-size`}
            value={typography?.fontSize ?? ""}
            onChange={(e) =>
              updateTypography({
                ...typography,
                fontSize: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">По умолчанию</option>
            {[14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48].map(
              (size) => (
                <option value={size} key={size}>
                  {size} px
                </option>
              ),
            )}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-font-weight`}>Насыщенность</FieldLabel>
          <select
            id={`${id}-font-weight`}
            value={typography?.fontWeight ?? ""}
            onChange={(e) =>
              updateTypography({
                ...typography,
                fontWeight: (e.target.value || undefined) as
                  | BlockTypography["fontWeight"]
                  | undefined,
              })
            }
          >
            <option value="">По умолчанию</option>
            <option value="300">Light · 300</option>
            <option value="400">Regular · 400</option>
            <option value="500">Medium · 500</option>
            <option value="600">SemiBold · 600</option>
            <option value="700">Bold · 700</option>
            <option value="800">ExtraBold · 800</option>
          </select>
        </Field>
      </FieldGroup>
    </div>
  );

  return (
    <div className="block-inspector">
      <p className="panel-eyebrow">{block ? "СВОЙСТВА БЛОКА" : "ПЛАН"}</p>
      {!block ? (
        <div className="inspector-empty inspector-plan-summary">
          <div className="inspector-stats" aria-label="Сводка плана">
            <div>
              <strong>{tasks.length}</strong>
              <span>задач</span>
            </div>
            <div>
              <strong>{done}</strong>
              <span>готово</span>
            </div>
          </div>
          <MousePointer2 size={22} aria-hidden="true" />
          <h2>Выберите элемент</h2>
          <p>
            Нажмите на задачу, референс, изображение или текстовый блок, чтобы
            открыть его свойства.
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
                Текст редактируется прямо в документе. Здесь можно изменить
                шрифт, размер и насыщенность выбранного блока.
              </p>
            )}
          </FieldGroup>
          {typographyControls}
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
