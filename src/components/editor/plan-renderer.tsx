"use client";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { OfficialBrand } from "@/components/plan/official-brand";
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
  X,
} from "lucide-react";
import type {
  Block,
  BlockTypography,
  FontSource,
  PortablePlan,
} from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
import { uid } from "@/features/plans/repository";
import { cn } from "@/lib/utils";
import { PlanContext } from "./plan-context";
import { editorSchema } from "./schema";
import { taskCompanions, duplicateTitleHeading } from "./document-structure";
import { PlanCover } from "./plan-cover";
import { PlanOutline, insertItems, type InsertType } from "./plan-outline";
import { BlockInspector } from "./block-inspector";
import { ExternalFontLoader } from "./external-font-loader";
import { WorkspaceResizeHandle } from "./workspace-resize-handle";
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
  onFontSourcesChange?: (sources: FontSource[]) => void;
  watermark?: boolean;
  onWatermarkChange?: (value: boolean) => void;
  focusMode?: boolean;
};
function subscribeWidth(callback: () => void) {
  const query = window.matchMedia("(min-width: 1440px)");
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
  onFontSourcesChange,
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
  const [outlineVisible, setOutlineVisible] = useState(true);
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [outlineWidth, setOutlineWidth] = useState(208);
  const [inspectorWidth, setInspectorWidth] = useState(280);
  const [widthsLoaded, setWidthsLoaded] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const outline = Number(localStorage.getItem("ipos:outline-width"));
        const inspector = Number(localStorage.getItem("ipos:inspector-width"));
        if (outline >= 160 && outline <= 320) setOutlineWidth(outline);
        if (inspector >= 260 && inspector <= 400) setInspectorWidth(inspector);
      } catch {
        // Resizing remains available when browser storage is disabled.
      }
      setWidthsLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!widthsLoaded) return;
    try {
      localStorage.setItem("ipos:outline-width", String(outlineWidth));
      localStorage.setItem("ipos:inspector-width", String(inspectorWidth));
    } catch {
      // Keep the current width even when it cannot be persisted.
    }
  }, [outlineWidth, inspectorWidth, widthsLoaded]);
  const rendererId = useId();
  const wide = useSyncExternalStore(
    subscribeWidth,
    () => window.matchMedia("(min-width: 1440px)").matches,
    () => false,
  );
  const selected = selectedId ? editor.getBlock(selectedId) : undefined;
  const selectBlock = (id: string, openProperties = true) => {
    setSelectedId(id);
    if (openProperties) setInspectorVisible(true);
    if (!wide && openProperties) setPanel("inspector");
  };
  const grouping = useMemo(() => taskCompanions(blocks), [blocks]);
  const duplicateId = duplicateTitleHeading(blocks, plan.title);
  const presentationStyle = useMemo(() => {
    const scope = `[data-document-renderer="${CSS.escape(rendererId)}"]`;
    const selector = (id: string) =>
      `${scope} .bn-block-outer[data-id="${CSS.escape(id)}"]`;
    const rules: string[] = [];
    // Every task and the following requirements/notes are one visual brief.
    // All blocks stay in their original BlockNote positions and remain editable;
    // only scoped presentation CSS changes, including in preview and viewer.
    for (const [id, owner] of Object.entries(grouping.sectionById)) {
      if (grouping.embeddedIds.has(id)) continue; // media already in task brief
      const start = id === owner;
      const end = grouping.endIds.has(id);
      const properties = [
        "box-sizing:border-box",
        "min-width:0",
        "background:#f9faff",
        "border-left:1px solid #dce3f6",
        "border-right:1px solid #dce3f6",
        "box-shadow:inset 3px 0 0 var(--primary)",
        "padding:3px 12px",
        ...(start ? [
          "margin-top:14px",
          "padding-top:15px",
          "border-top:1px solid #dce3f6",
          "border-top-left-radius:8px",
          "border-top-right-radius:8px",
        ] : []),
        ...(end ? [
          "margin-bottom:16px",
          "padding-bottom:15px",
          "border-bottom:1px solid #dce3f6",
          "border-bottom-left-radius:8px",
          "border-bottom-right-radius:8px",
        ] : []),
      ];
      rules.push(`${selector(id)}{${properties.join(";")}}`);
      rules.push(
        `@media(max-width:767px){${selector(id)}{padding-left:8px;padding-right:8px}}`,
      );
      rules.push(
        `@media print{${selector(id)}{background:transparent!important;box-shadow:none!important;border-left:0!important;border-right:0!important;padding-left:0!important;padding-right:0!important}}`,
      );
    }
    for (const [id, owner] of Object.entries(grouping.sectionById)) {
      if (id === owner) continue;
      rules.push(
        `${selector(id)} > .bn-block > .bn-block-content[data-content-type="heading"]{--level:17px;font-size:17px;padding-top:12px}`,
      );
      rules.push(
        `${selector(id)} > .bn-block > .bn-block-content[data-content-type="heading"] .bn-inline-content{font-size:17px}`,
      );
    }
    for (const [id, style] of Object.entries(plan.typography ?? {})) {
      const declarations = [
        style.fontFamily &&
          CSS.supports("font-family", style.fontFamily) &&
          `font-family:${style.fontFamily} !important`,
        style.fontSize && `font-size:${style.fontSize}px !important`,
        style.fontWeight && `font-weight:${style.fontWeight} !important`,
      ].filter(Boolean);
      if (declarations.length)
        rules.push(
          `${selector(id)} .bn-inline-content{${declarations.join(";")}}`,
        );
    }
    if (duplicateId && showCover)
      rules.push(
        editable && selectedId === duplicateId
          ? `${selector(duplicateId)} > .bn-block > .bn-block-content{--level:17px;font-size:17px;font-weight:500;padding:2px 0 16px;color:var(--muted-foreground)}\n${selector(duplicateId)} > .bn-block > .bn-block-content .bn-inline-content{font-size:17px}`
          : editable
            ? `${selector(duplicateId)}{max-height:0;overflow:hidden;margin:0;padding:0;opacity:0}`
            : `${selector(duplicateId)}{display:none}`,
      );
    if (duplicateId && showCover)
      rules.push(`@media print{${selector(duplicateId)}{display:none}}`);
    return rules.join("\n");
  }, [
    grouping,
    duplicateId,
    rendererId,
    editable,
    showCover,
    plan.typography,
    selectedId,
  ]);
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
  const locate = (id?: string) => {
    setPanel(undefined);
    setSelectedId(id);
    if (wide) setInspectorVisible(Boolean(id));
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
    />
  );
  const inspector = (
    <BlockInspector
      block={selected as Block | undefined}
      fontSources={plan.fontSources ?? []}
      updateFontSources={onFontSourcesChange}
      onTitleChange={onTitleChange}
      watermark={watermark}
      setWatermark={onWatermarkChange}
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
        else if (
          selected &&
          props.textAlignment &&
          [
            "paragraph",
            "heading",
            "quote",
            "bulletListItem",
            "numberedListItem",
          ].includes(selected.type)
        )
          editor.updateBlock(selected, {
            props: {
              textAlignment: props.textAlignment as
                "left" | "center" | "right" | "justify",
            },
          });
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
      <ExternalFontLoader sources={plan.fontSources ?? []} />
      <div
        ref={root}
        style={
          {
            "--ipos-outline-width": `${outlineWidth}px`,
            "--ipos-inspector-width": `${inspectorWidth}px`,
          } as CSSProperties
        }
        data-document-renderer={rendererId}
        className={cn(
          editable ? "editor-workspace" : "readonly-workspace",
          !showCover && "embedded-document",
          focusMode && "focus-mode",
          editable && outlineVisible && "outline-open",
          editable && inspectorVisible && "inspector-open",
        )}
      >
        <style>{presentationStyle}</style>
        {editable && !focusMode && (
          <>
            <div className="workspace-controls workspace-mobile-bar">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={wide ? outlineVisible : panel === "outline"}
                onClick={() =>
                  wide
                    ? setOutlineVisible((value) => !value)
                    : setPanel("outline")
                }
              >
                <PanelLeft data-icon="inline-start" />
                Структура
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={wide ? inspectorVisible : panel === "inspector"}
                onClick={() =>
                  wide
                    ? setInspectorVisible((value) => !value)
                    : setPanel("inspector")
                }
              >
                <SlidersHorizontal data-icon="inline-start" />
                Свойства
              </Button>
            </div>
            {wide && outlineVisible && (
              <aside className="workspace-outline" aria-label="Навигация плана">
                {outline}
                <WorkspaceResizeHandle
                  label="Изменить ширину структуры плана"
                  width={outlineWidth}
                  min={160}
                  max={Math.min(
                    320,
                    Math.max(
                      160,
                      window.innerWidth -
                        (inspectorVisible ? inspectorWidth : 0) -
                        720,
                    ),
                  )}
                  onChange={setOutlineWidth}
                />
              </aside>
            )}
          </>
        )}
        <article className="plan-paper" aria-label="Документ плана">
          {watermark && showCover && (
            <OfficialBrand className="plan-watermark" width={220} decorative />
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
                    if (id) {
                      setSelectedId(id);
                      setInspectorVisible(true);
                    }
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
        {editable && wide && inspectorVisible && !focusMode && (
          <aside
            className="workspace-inspector"
            aria-label="Свойства выбранного блока"
          >
            <WorkspaceResizeHandle
              label="Изменить ширину панели свойств"
              width={inspectorWidth}
              min={260}
              max={Math.min(
                400,
                Math.max(
                  260,
                  window.innerWidth - (outlineVisible ? outlineWidth : 0) - 720,
                ),
              )}
              invert
              onChange={setInspectorWidth}
            />
            <div className="inspector-panel-header">
              <span>Свойства</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Закрыть свойства"
                onClick={() => setInspectorVisible(false)}
              >
                <X />
              </Button>
            </div>
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
              className={cn(
                "workspace-drawer",
                panel === "outline" ? "outline-drawer" : "inspector-drawer",
              )}
            >
              <DialogTitle>
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
