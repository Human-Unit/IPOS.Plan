"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
  type PartialBlock,
} from "@blocknote/core";
import { ru } from "@blocknote/core/locales";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  List,
  ListOrdered,
  Text,
  Quote,
  PanelLeft,
  SlidersHorizontal,
} from "lucide-react";
import type {
  Block,
  BlockTypography,
  PortablePlan,
} from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
import { uid } from "@/features/plans/repository";
import { PlanContext } from "./plan-context";
import { editorSchema } from "./schema";
import { taskCompanions } from "./document-structure";
import { PlanCover } from "./plan-cover";
import { PlanOutline, insertItems, type InsertType } from "./plan-outline";
import { BlockInspector } from "./block-inspector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  plan: PortablePlan;
  editable?: boolean;
  showCover?: boolean;
  onTitleChange?: (title: string) => void;
  onBlocksChange?: (blocks: Block[]) => void;
  onTaskChange?: (task: Task) => void;
  onTypographyChange?: (blockId: string, value: BlockTypography) => void;
  watermark?: boolean;
  onWatermarkChange?: (value: boolean) => void;
  focusMode?: boolean;
};

const inspectableTypes = new Set([
  "task",
  "reference",
  "image",
  "paragraph",
  "heading",
  "quote",
  "bulletListItem",
  "numberedListItem",
  "callout",
]);

function subscribeWidth(callback: () => void) {
  const query = window.matchMedia("(min-width: 1200px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export default function PlanRenderer({
  plan,
  editable = false,
  showCover = false,
  onTitleChange,
  onBlocksChange,
  onTaskChange,
  onTypographyChange,
  watermark = true,
  onWatermarkChange,
  focusMode = false,
}: Props) {
  const editor = useCreateBlockNote({
    schema: editorSchema,
    dictionary: ru,
    initialContent: plan.blocks.length
      ? (plan.blocks as PartialBlock<typeof editorSchema.blockSchema>[])
      : undefined,
    trailingBlock: editable,
  });
  const [blocks, setBlocks] = useState(() => editor.document as Block[]);
  const [selectedId, setSelectedId] = useState<string>();
  const [panel, setPanel] = useState<"outline" | "inspector">();
  const root = useRef<HTMLDivElement>(null);
  const wide = useSyncExternalStore(
    subscribeWidth,
    () => window.matchMedia("(min-width: 1200px)").matches,
    () => false,
  );
  const selected = selectedId ? editor.getBlock(selectedId) : undefined;
  const inspectable = Boolean(selected && inspectableTypes.has(selected.type));
  const inspectorOpen = editable && wide && !focusMode && inspectable;

  const selectBlock = (id: string, openProperties = true) => {
    setSelectedId(id);
    if (!wide && openProperties) setPanel("inspector");
  };

  const grouping = useMemo(() => taskCompanions(blocks), [blocks]);
  const context = {
    plan: { ...plan, blocks },
    editable,
    updateTask: onTaskChange,
    selectedId,
    selectBlock,
    ...grouping,
  };

  useEffect(() => {
    if (!editable) return;
    return editor.onSelectionChange(() => {
      // Typing in the inspector must not replace the selected custom block.
      if (
        root.current
          ?.querySelector(".bn-editor")
          ?.contains(document.activeElement)
      )
        setSelectedId(editor.getTextCursorPosition().block.id);
    });
  }, [editor, editable]);

  useEffect(() => {
    if (focusMode) setPanel(undefined);
  }, [focusMode]);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;

    scope
      .querySelectorAll<HTMLElement>('[data-ipos-typography="true"]')
      .forEach((element) => {
        element.removeAttribute("data-ipos-typography");
        element.style.removeProperty("--ipos-block-font-family");
        element.style.removeProperty("--ipos-block-font-size");
        element.style.removeProperty("--ipos-block-font-weight");
      });

    for (const [blockId, style] of Object.entries(plan.typography ?? {})) {
      const escaped = CSS.escape(blockId);
      scope
        .querySelectorAll<HTMLElement>(
          `.bn-block-outer[data-id="${escaped}"], [data-plan-block="${escaped}"]`,
        )
        .forEach((element) => {
          element.dataset.iposTypography = "true";
          if (style.fontFamily)
            element.style.setProperty(
              "--ipos-block-font-family",
              style.fontFamily,
            );
          if (style.fontSize)
            element.style.setProperty(
              "--ipos-block-font-size",
              `${style.fontSize}px`,
            );
          if (style.fontWeight)
            element.style.setProperty(
              "--ipos-block-font-weight",
              style.fontWeight,
            );
        });
    }
  }, [plan.typography, blocks]);

  const locate = (id?: string) => {
    setPanel(undefined);
    setSelectedId(id);
    if (!id) {
      root.current
        ?.querySelector(".plan-cover")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    const target = Array.from(
      root.current?.querySelectorAll<HTMLElement>(
        "[data-plan-block],.bn-block-outer[data-id]",
      ) ?? [],
    ).find(
      (el) =>
        (el.dataset.planBlock === id || el.dataset.id === id) &&
        el.getClientRects().length,
    );
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    const block = editor.getBlock(id);
    if (
      block &&
      !["task", "reference", "image", "divider"].includes(block.type)
    ) {
      editor.setTextCursorPosition(id, "start");
      editor.focus();
    } else target?.focus({ preventScroll: true });
  };

  const add = (type: keyof typeof editorSchema.blockSchema, slash = false) => {
    const partial: PartialBlock<typeof editorSchema.blockSchema> =
      type === "task" ? { type: "task", props: { taskId: uid() } } : { type };
    if (partial.type === "task")
      onTaskChange?.({
        id: partial.props!.taskId!,
        title: "Новая задача",
        status: "todo",
        priority: "medium",
      });
    let created;
    if (slash) created = insertOrUpdateBlockForSlashMenu(editor, partial);
    else {
      const anchor =
        selectedId && editor.getBlock(selectedId)
          ? selectedId
          : editor.getTextCursorPosition().block.id;
      created = editor.insertBlocks([partial], anchor, "after")[0];
    }
    setPanel(undefined);
    if (created) {
      if (["task", "reference", "image"].includes(type))
        selectBlock(created.id);
      else {
        setSelectedId(created.id);
        editor.setTextCursorPosition(created.id, "start");
        editor.focus();
      }
      requestAnimationFrame(() => {
        Array.from(
          root.current?.querySelectorAll<HTMLElement>(
            "[data-plan-block],.bn-block-outer[data-id]",
          ) ?? [],
        )
          .find(
            (el) =>
              (el.dataset.planBlock === created.id ||
                el.dataset.id === created.id) &&
              el.getClientRects().length,
          )
          ?.scrollIntoView({ block: "nearest" });
      });
    }
  };

  const items = [
    { title: "Текст", type: "paragraph", icon: Text },
    { title: "Список", type: "bulletListItem", icon: List },
    {
      title: "Нумерованный список",
      type: "numberedListItem",
      icon: ListOrdered,
    },
    { title: "Цитата", type: "quote", icon: Quote },
    ...insertItems,
  ] as const;

  const outline = (
    <PlanOutline
      plan={plan}
      blocks={blocks}
      selectedId={selectedId}
      select={locate}
      add={(type: InsertType) => add(type)}
      watermark={watermark}
      setWatermark={(value) => onWatermarkChange?.(value)}
    />
  );

  const inspector = (
    <BlockInspector
      block={selected as Block | undefined}
      typography={selectedId ? plan.typography?.[selectedId] : undefined}
      updateTypography={
        selectedId && onTypographyChange
          ? (value) => onTypographyChange(selectedId, value)
          : undefined
      }
      updateProps={(props) => {
        if (
          selected &&
          (selected.type === "reference" || selected.type === "image")
        )
          editor.updateBlock(selected, { props });
      }}
      remove={() => {
        if (selected) editor.removeBlocks([selected]);
        if (selectedId) onTypographyChange?.(selectedId, {});
        setSelectedId(undefined);
        setPanel(undefined);
      }}
    />
  );

  return (
    <PlanContext.Provider value={context}>
      <div
        ref={root}
        className={`${editable ? "editor-workspace" : "readonly-workspace"}${showCover ? "" : " embedded-document"}${inspectorOpen ? " inspector-open" : ""}${focusMode ? " focus-mode" : ""}`}
      >
        {editable && !focusMode && (
          <>
            {wide ? (
              <aside className="workspace-outline" aria-label="Навигация плана">
                {outline}
              </aside>
            ) : (
              <div className="workspace-mobile-bar">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanel("outline")}
                >
                  <PanelLeft size={16} />
                  Структура
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!inspectable}
                  onClick={() => setPanel("inspector")}
                >
                  <SlidersHorizontal size={16} />
                  Свойства
                </Button>
              </div>
            )}
          </>
        )}

        <article className="plan-paper" aria-label="Документ плана">
          {watermark && showCover && (
            <Image
              className="plan-watermark"
              src="/icon.svg"
              width={480}
              height={480}
              alt=""
              aria-hidden="true"
            />
          )}
          {showCover && (
            <PlanCover
              plan={plan}
              editable={editable}
              onTitleChange={onTitleChange}
            />
          )}
          <div
            className="paper-content"
            onClickCapture={
              editable
                ? (event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("[data-plan-block]")) return;
                    const id = target.closest<HTMLElement>(
                      ".bn-block-outer[data-id]",
                    )?.dataset.id;
                    if (id) setSelectedId(id);
                  }
                : undefined
            }
          >
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
                const next = editor.document as Block[];
                setBlocks(next);
                if (selectedId && !editor.getBlock(selectedId))
                  setSelectedId(undefined);
                if (editable) onBlocksChange?.(next);
              }}
            >
              {editable && (
                <SuggestionMenuController
                  triggerCharacter="/"
                  getItems={async (query) =>
                    filterSuggestionItems(
                      items.map((item) => ({
                        title: item.title,
                        aliases: [item.type],
                        group: "Блоки",
                        icon: <item.icon size={18} />,
                        onItemClick: () => add(item.type, true),
                      })),
                      query,
                    )
                  }
                />
              )}
            </BlockNoteView>
          </div>
        </article>

        {inspectorOpen && (
          <aside
            className="workspace-inspector"
            aria-label="Свойства выбранного блока"
          >
            {inspector}
          </aside>
        )}

        {editable && !wide && !focusMode && (
          <Dialog
            open={Boolean(panel)}
            onOpenChange={(open) => {
              if (!open) setPanel(undefined);
            }}
          >
            <DialogContent
              className={`workspace-drawer translate-x-0 translate-y-0 ${panel === "outline" ? "outline-drawer" : "inspector-drawer"}`}
            >
              <DialogTitle className="sr-only">
                {panel === "outline" ? "Структура плана" : "Свойства блока"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {panel === "outline"
                  ? "Навигация и вставка блоков"
                  : "Редактирование выбранного блока"}
              </DialogDescription>
              {panel === "outline" ? outline : inspector}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PlanContext.Provider>
  );
}
