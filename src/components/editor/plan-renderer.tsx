"use client";
import { useMemo } from "react";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
  type PartialBlock,
} from "@blocknote/core";
import { ru } from "@blocknote/core/locales";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  CheckSquare,
  Heading,
  List,
  ListOrdered,
  Text,
  Link2,
  ImageIcon,
  Info,
  Minus,
  Quote,
} from "lucide-react";
import type { Block, PortablePlan } from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
import { uid } from "@/features/plans/repository";
import { PlanContext } from "./plan-context";
import { editorSchema } from "./schema";
import { Button } from "@/components/ui/button";
type Props = {
  plan: PortablePlan;
  editable?: boolean;
  onBlocksChange?: (blocks: Block[]) => void;
  onTaskChange?: (task: Task) => void;
};
export default function PlanRenderer({
  plan,
  editable = false,
  onBlocksChange,
  onTaskChange,
}: Props) {
  const editor = useCreateBlockNote({
    schema: editorSchema,
    dictionary: ru,
    initialContent: plan.blocks.length
      ? (plan.blocks as PartialBlock<typeof editorSchema.blockSchema>[])
      : undefined,
    trailingBlock: editable,
  });
  const context = useMemo(
    () => ({ plan, editable, updateTask: onTaskChange }),
    [plan, editable, onTaskChange],
  );
  const add = (type: keyof typeof editorSchema.blockSchema) => {
    if (type === "task") {
      const id = uid();
      onTaskChange?.({
        id,
        title: "Новая задача",
        status: "todo",
        priority: "medium",
      });
      insertOrUpdateBlockForSlashMenu(editor, {
        type: "task",
        props: { taskId: id },
      });
    } else insertOrUpdateBlockForSlashMenu(editor, { type });
  };
  const items = [
    { title: "Текст", type: "paragraph", icon: Text, aliases: ["text"] },
    {
      title: "Заголовок",
      type: "heading",
      icon: Heading,
      aliases: ["heading"],
    },
    { title: "Список", type: "bulletListItem", icon: List, aliases: ["list"] },
    {
      title: "Нумерованный список",
      type: "numberedListItem",
      icon: ListOrdered,
      aliases: ["numbered"],
    },
    { title: "Цитата", type: "quote", icon: Quote, aliases: ["quote"] },
    { title: "Задача", type: "task", icon: CheckSquare, aliases: ["task"] },
    {
      title: "Референс",
      type: "reference",
      icon: Link2,
      aliases: ["reference", "link"],
    },
    {
      title: "Изображение",
      type: "image",
      icon: ImageIcon,
      aliases: ["image"],
    },
    { title: "Заметка", type: "callout", icon: Info, aliases: ["callout"] },
    {
      title: "Разделитель",
      type: "divider",
      icon: Minus,
      aliases: ["divider"],
    },
  ] as const;
  return (
    <PlanContext.Provider value={context}>
      {editable && (
        <div className="block-toolbar" aria-label="Добавить блок">
          <Button size="sm" variant="outline" onClick={() => add("task")}>
            <CheckSquare data-icon="inline-start" />
            Задача
          </Button>
          <Button size="sm" variant="outline" onClick={() => add("reference")}>
            <Link2 data-icon="inline-start" />
            Референс
          </Button>
          <span>Введите / для других блоков</span>
        </div>
      )}
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        slashMenu={false}
        sideMenu={editable}
        formattingToolbar={editable}
        linkToolbar={editable}
        filePanel={false}
        onChange={() => {
          if (editable) onBlocksChange?.(editor.document as Block[]);
        }}
      >
        {editable && (
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(
                items.map((item) => ({
                  title: item.title,
                  aliases: [...item.aliases],
                  group: "Блоки",
                  icon: <item.icon size={18} />,
                  onItemClick: () => add(item.type),
                })),
                query,
              )
            }
          />
        )}
      </BlockNoteView>
    </PlanContext.Provider>
  );
}
