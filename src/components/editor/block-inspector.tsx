"use client";
import { useId, useState } from "react";
import Image from "next/image";
import { Trash2, ArrowUpRight, Type, RotateCcw } from "lucide-react";
import type { Block, BlockTypography, FontSource } from "@/lib/schema/plan";
import { webUrl, imageSourceSchema } from "@/lib/schema/plan";
import { usePlanContext } from "./plan-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { statuses, priorities, type Task } from "@/lib/schema/task";
import { statusLabels, priorityLabels } from "@/lib/labels";
import { PlanInspector } from "./plan-inspector";
import { DeadlinePicker } from "./deadline-picker";
import { AssigneePicker } from "@/features/activists/assignee-picker";
import { confirmedAssignment } from "@/features/activists/task-assignments";

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
  "NT Somin",
  "Golos Text",
  "Noto Sans",
  "Noto Serif",
  "PT Sans",
  "PT Serif",
  "Rubik",
  "Manrope",
  "Lora",
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
  onTitleChange,
  watermark,
  setWatermark,
  typography,
  updateTypography,
  fontSources = [],
  updateFontSources,
}: {
  block?: Block;
  updateProps: (props: Record<string, string>) => void;
  remove: () => void;
  onTitleChange?: (title: string) => void;
  watermark: boolean;
  setWatermark?: (value: boolean) => void;
  typography?: BlockTypography;
  updateTypography?: (value: BlockTypography) => void;
  fontSources?: FontSource[];
  updateFontSources?: (fonts: FontSource[]) => void;
}) {
  const id = useId();
  const [fontUrl, setFontUrl] = useState("");
  const [fontError, setFontError] = useState("");
  const [failedImage, setFailedImage] = useState("");
  const { plan, updateTask, replaceImage, updateAssignment, openPerson } = usePlanContext();
  const task =
    block?.type === "task" ? plan.tasks[block.props.taskId] : undefined;
  const isTextBlock = Boolean(block && textBlockTypes.has(block.type));
  const supportsAlignment = Boolean(
    block &&
    [
      "paragraph",
      "heading",
      "quote",
      "bulletListItem",
      "numberedListItem",
    ].includes(block.type),
  );
  const change = (patch: Partial<Task>) =>
    task && updateTask?.({ ...task, ...patch });
  if (!block)
    return (
      <PlanInspector
        onTitleChange={onTitleChange}
        watermark={watermark}
        setWatermark={setWatermark}
      />
    );
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

  const fontName = (typography?.fontFamily ?? "").trim();
  const savedFont = fontSources.find(
    (font) => font.family.toLowerCase() === fontName.toLowerCase(),
  );
  const registerFont = () => {
    if (
      !updateFontSources ||
      !fontName ||
      !/^[a-zA-Z0-9 _-]{1,80}$/.test(fontName)
    ) {
      setFontError(
        "Сначала укажите простое название семейства, например NT Somin.",
      );
      return;
    }
    if (!webUrl.safeParse(fontUrl).success || !fontUrl.startsWith("https://")) {
      setFontError(
        "Укажите прямой HTTPS-адрес файла .woff2, .woff, .ttf или .otf.",
      );
      return;
    }
    const pathname = new URL(fontUrl).pathname.toLowerCase();
    if (!/\.(woff2?|ttf|otf)$/.test(pathname)) {
      setFontError(
        "Нужна прямая ссылка на файл шрифта, а не страница скачивания.",
      );
      return;
    }
    updateFontSources([
      ...fontSources.filter(
        (font) => font.family.toLowerCase() !== fontName.toLowerCase(),
      ),
      { family: fontName, url: fontUrl },
    ]);
    setFontUrl("");
    setFontError("");
  };
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
            Выберите шрифт из списка или подключите свой файл ниже.
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
                  BlockTypography["fontWeight"] | undefined,
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
        {supportsAlignment && (
          <Field>
            <FieldLabel htmlFor={`${id}-alignment`}>Выравнивание</FieldLabel>
            <select
              id={`${id}-alignment`}
              value={String(
                ("props" in block &&
                  (block.props as Record<string, unknown> | undefined)
                    ?.textAlignment) ||
                  "left",
              )}
              onChange={(event) =>
                updateProps({ textAlignment: event.target.value })
              }
            >
              <option value="left">Слева</option>
              <option value="center">По центру</option>
              <option value="right">Справа</option>
              <option value="justify">По ширине</option>
            </select>
          </Field>
        )}
      </FieldGroup>
      {updateFontSources && (
        <details className="font-source-editor">
          <summary>Подключить внешний шрифт</summary>
          <p className="inspector-hint">
            Montserrat и Inter уже подключены. Для других шрифтов укажите прямую
            HTTPS-ссылку на файл с разрешённым использованием. Источник должен
            поддерживать CORS, чтобы шрифт работал по общей ссылке.
          </p>
          {savedFont && (
            <div className="font-source-saved">
              <span>Подключён: {savedFont.family}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateFontSources(
                    fontSources.filter((item) => item !== savedFont),
                  )
                }
              >
                Отключить
              </Button>
            </div>
          )}
          <Field>
            <FieldLabel htmlFor={`${id}-external-font`}>
              Ссылка на .woff2/.woff/.ttf/.otf
            </FieldLabel>
            <Input
              id={`${id}-external-font`}
              type="url"
              placeholder="https://example.org/fonts/NT-Somin.woff2"
              value={fontUrl}
              onChange={(event) => {
                setFontUrl(event.target.value);
                setFontError("");
              }}
              aria-invalid={Boolean(fontError)}
            />
          </Field>
          {fontError && (
            <p role="alert" className="font-source-error">
              {fontError}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!fontName}
            onClick={registerFont}
          >
            Подключить к плану
          </Button>
        </details>
      )}
    </div>
  );
  return (
    <div className="block-inspector">
      <p className="panel-eyebrow">СВОЙСТВА БЛОКА</p>
      {
        <>
          <h2>
            {task
              ? "Задача"
              : block.type === "reference"
                ? "Референс"
                : block.type === "image"
                  ? "Изображение"
                  : block.type === "heading"
                    ? "Заголовок"
                    : block.type === "callout"
                      ? "Заметка"
                      : block.type === "quote"
                        ? "Цитата"
                        : block.type === "divider"
                          ? "Разделитель"
                          : "Текст"}
          </h2>
          <FieldGroup>
            {task ? (
              <>
                {field("title", "Название задачи", task.title, (value) =>
                  change({ title: value }),
                )}
                <FieldGroup className="field-pair">
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
                    <FieldLabel htmlFor={`${id}-priority`}>
                      Приоритет
                    </FieldLabel>
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
                </FieldGroup>
                <AssigneePicker
                  key={task.id}
                  value={task.assignee ?? ""}
                  onChange={(value) => change({ assignee: value || undefined })}
                  assignment={confirmedAssignment(plan, task.id)}
                  onApply={updateAssignment ? (value, text) => updateAssignment(task.id, value, text) : undefined}
                  onOpenPerson={openPerson}
                />
                <DeadlinePicker id={`${id}-deadline`} value={task.deadline} onChange={(deadline) => change({ deadline })} />
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
                {block.props.url &&
                  imageSourceSchema.safeParse(block.props.url).success &&
                  failedImage !== block.props.url && (
                    <Image
                      unoptimized
                      src={block.props.url}
                      alt="Предпросмотр выбранного изображения"
                      width={220}
                      height={220}
                      style={{
                        width: "auto",
                        height: "auto",
                        maxHeight: 180,
                        objectFit: "contain",
                      }}
                      onError={() => setFailedImage(block.props.url)}
                    />
                  )}
                {field(
                  "url",
                  "URL изображения",
                  block.props.url,
                  (value) => updateProps({ url: value }),
                  { max: 90000 },
                )}
                {block.props.url.startsWith("data:image/") && (
                  <p className="inspector-hint">
                    Изображение встроено в план · до 64 КБ. Сохраняется в JSON и
                    снимке; для длинной ссылки используйте JSON.
                  </p>
                )}
                {block.id && replaceImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => replaceImage(block.id!)}
                  >
                    Заменить файлом
                  </Button>
                )}
                {!imageSourceSchema.safeParse(block.props.url).success && (
                  <p role="alert">
                    Укажите HTTP-ссылку или выберите файл PNG, JPEG, WebP.
                  </p>
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
          {typographyControls}
          {(block.type === "reference" || block.type === "image") &&
            (block.type === "image"
              ? Boolean(
                  block.props.url &&
                  imageSourceSchema.safeParse(block.props.url).success,
                )
              : webUrl.safeParse(block.props.url).success) && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={block.props.url}
                  download={
                    block.props.url.startsWith("data:")
                      ? "ipos-image.webp"
                      : undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  <ArrowUpRight data-icon="inline-start" />
                  {block.type === "reference"
                    ? "Открыть референс"
                    : block.props.url.startsWith("data:")
                      ? "Скачать изображение"
                      : "Открыть оригинал"}
                </a>
              </Button>
            )}
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
      }
    </div>
  );
}
