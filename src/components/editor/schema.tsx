"use client";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { Info } from "lucide-react";
import { TaskCard } from "@/components/task/task-card";
import { usePlanContext } from "./plan-context";
import { ReferenceContent, ImageContent } from "./media-content";
import { SelectableBlock } from "./selectable-block";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { webUrl } from "@/lib/schema/plan";
const task = createReactBlockSpec(
  { type: "task", propSchema: { taskId: { default: "" } }, content: "none" },
  {
    render: ({ block }) => (
      <TaskCard taskId={block.props.taskId} blockId={block.id} />
    ),
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
    render: function Reference({ block }) {
      const { embeddedIds } = usePlanContext();
      return embeddedIds.has(block.id) ? (
        <div className="embedded-placeholder" contentEditable={false} />
      ) : (
        <ReferenceContent block={block} />
      );
    },
  },
)();
const callout = createReactBlockSpec(
  { type: "callout", propSchema: {}, content: "inline" },
  {
    render: function Callout({ block, contentRef }) {
      const { editable, selectedId, selectBlock } = usePlanContext();
      return (
        <Alert
          className="callout-block"
          data-plan-block={block.id}
          data-selected={
            editable && selectedId === block.id ? "true" : undefined
          }
          onClick={editable ? () => selectBlock?.(block.id, false) : undefined}
        >
          <Info aria-hidden="true" />
          <AlertDescription>
            <div ref={contentRef} />
          </AlertDescription>
        </Alert>
      );
    },
  },
)();
const divider = createReactBlockSpec(
  { type: "divider", propSchema: {}, content: "none" },
  {
    render: ({ block }) => (
      <SelectableBlock
        id={block.id}
        label="Разделитель"
        className="divider-block"
      >
        <Separator />
      </SelectableBlock>
    ),
  },
)();
// The URL-only image schema and all persisted properties are unchanged.
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
    render: function ImageBlock({ block }) {
      const { embeddedIds } = usePlanContext();
      return embeddedIds.has(block.id) ? (
        <div className="embedded-placeholder" contentEditable={false} />
      ) : (
        <ImageContent block={block} />
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
