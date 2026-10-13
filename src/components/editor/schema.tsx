"use client";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import Image from "next/image";
import { createReactBlockSpec } from "@blocknote/react";
import { Link2, Info, ImageIcon } from "lucide-react";
import { TaskCard } from "@/components/task/task-card";
import { usePlanContext } from "./plan-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { webUrl } from "@/lib/schema/plan";
const task = createReactBlockSpec(
  { type: "task", propSchema: { taskId: { default: "" } }, content: "none" },
  {
    render: ({ block }) => <TaskCard taskId={block.props.taskId} />,
    // Clipboard conversion uses a detached React root, without PlanContext.
    toExternalHTML: () => (
      <p>Задача · используйте экспорт JSON для переноса всех полей</p>
    ),
  },
)();
const reference = createReactBlockSpec(
  {
    type: "reference",
    propSchema: {
      url: { default: "" },
      title: { default: "" },
      note: { default: "" },
    },
    content: "none",
  },
  {
    toExternalHTML: ({ block }) => (
      <div>
        {block.props.url && webUrl.safeParse(block.props.url).success ? (
          <a href={block.props.url}>{block.props.title || block.props.url}</a>
        ) : (
          <strong>{block.props.title || "Референс"}</strong>
        )}
        <p>{block.props.note}</p>
      </div>
    ),
    render: function Reference({ block, editor }) {
      const { editable } = usePlanContext();
      const { url, title, note } = block.props;
      return (
        <section className="reference-block" contentEditable={false}>
          <div className="block-caption">
            <Link2 aria-hidden="true" />
            Референс
          </div>
          {editable ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${block.id}-url`}>Ссылка</FieldLabel>
                <Input
                  id={`${block.id}-url`}
                  type="url"
                  aria-invalid={Boolean(url && !webUrl.safeParse(url).success)}
                  placeholder="https://…"
                  value={url}
                  onChange={(e) =>
                    editor.updateBlock(block, {
                      props: { url: e.target.value },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${block.id}-title`}>
                  Название референса
                </FieldLabel>
                <Input
                  id={`${block.id}-title`}
                  maxLength={500}
                  value={title}
                  onChange={(e) =>
                    editor.updateBlock(block, {
                      props: { title: e.target.value },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${block.id}-note`}>Примечание</FieldLabel>
                <Textarea
                  id={`${block.id}-note`}
                  maxLength={10000}
                  value={note}
                  onChange={(e) =>
                    editor.updateBlock(block, {
                      props: { note: e.target.value },
                    })
                  }
                />
              </Field>
            </FieldGroup>
          ) : (
            <>
              {url && webUrl.safeParse(url).success ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  {title || url}
                </a>
              ) : (
                <strong>{title || "Ссылка не указана"}</strong>
              )}
              {note && <p>{note}</p>}
            </>
          )}
        </section>
      );
    },
  },
)();
const callout = createReactBlockSpec(
  { type: "callout", propSchema: {}, content: "inline" },
  {
    render: ({ contentRef }) => (
      <Alert className="callout-block">
        <Info aria-hidden="true" />
        <AlertDescription>
          <div ref={contentRef} />
        </AlertDescription>
      </Alert>
    ),
  },
)();
const divider = createReactBlockSpec(
  { type: "divider", propSchema: {}, content: "none" },
  {
    render: () => (
      <div className="divider-block" contentEditable={false}>
        <Separator />
      </div>
    ),
  },
)();
// URL-only image schema prevents upload/base64/blob content entering portable plans.
const image = createReactBlockSpec(
  {
    type: "image",
    propSchema: {
      url: { default: "" },
      caption: { default: "" },
      textColor: { default: "default" },
      backgroundColor: { default: "default" },
      textAlignment: {
        default: "left",
        values: ["left", "center", "right", "justify"] as const,
      },
    },
    content: "none",
  },
  {
    toExternalHTML: ({ block }) => (
      <div>
        {webUrl.safeParse(block.props.url).success ? (
          <a href={block.props.url}>{block.props.caption || "Изображение"}</a>
        ) : (
          "Изображение"
        )}
      </div>
    ),
    render: function ImageBlock({ block, editor }) {
      const { editable } = usePlanContext();
      const { url, caption } = block.props;
      const safe = webUrl.safeParse(url).success;
      return (
        <figure className="image-block" contentEditable={false}>
          {editable && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${block.id}-image`}>
                  URL изображения
                </FieldLabel>
                <Input
                  id={`${block.id}-image`}
                  type="url"
                  value={url}
                  placeholder="https://…"
                  aria-invalid={Boolean(url && !safe)}
                  onChange={(e) =>
                    editor.updateBlock(block, {
                      props: { url: e.target.value },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${block.id}-caption`}>
                  Подпись изображения
                </FieldLabel>
                <Input
                  id={`${block.id}-caption`}
                  maxLength={2000}
                  value={caption}
                  onChange={(e) =>
                    editor.updateBlock(block, {
                      props: { caption: e.target.value },
                    })
                  }
                />
              </Field>
            </FieldGroup>
          )}
          {safe ? (
            <Image
              unoptimized
              width={1200}
              height={800}
              src={url}
              alt={caption || "Изображение контент-плана"}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <p className="block-caption">
              <ImageIcon aria-hidden="true" />
              {url
                ? "Укажите корректный URL изображения"
                : "Изображение по ссылке"}
            </p>
          )}
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    },
  },
)();
export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    quote: defaultBlockSpecs.quote,
    task,
    reference,
    callout,
    divider,
    image,
  },
});
