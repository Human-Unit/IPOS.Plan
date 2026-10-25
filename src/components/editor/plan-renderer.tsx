"use client";
import { useTheme } from "next-themes";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";
import { panelReveal } from "@/lib/motion";
import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  projectBriefs,
  serializeBriefs,
  serializeWithSource,
  duplicateBrief,
  findEditorNode,
  moveProjectedBrief,
  gallery,
  type EditorNode,
} from "./brief-document";
import { prepareImage } from "./prepare-image";
import { TemplateDialog, SaveTemplateDialog } from "@/features/templates/template-dialog";
import { extractTemplate } from "@/features/templates/templates";
import { toPortable, flattenBlocks } from "@/lib/schema/plan";
import { toast } from "@/lib/notifications";
import { errorMessage } from "@/lib/labels";
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
  ChevronLeft,
  ChevronRight,
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
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
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
  mode?: "workspace" | "document";
  onPlanChange?: (plan: PortablePlan) => void;
};
function subscribeWidth(callback: () => void) {
  const query = window.matchMedia("(min-width: 1200px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
// Exit only the panel; the live document never enters a layout animation.
// popLayout releases its grid column immediately, and inert removes exiting
// controls from keyboard/pointer interaction until the short fade completes.
const WorkspacePanel = forwardRef<HTMLElement, HTMLMotionProps<"aside">>(
  function WorkspacePanel(props, ref) {
    const present = useIsPresent();
    const reduced = useReducedMotion();
    return (
      <motion.aside
        {...props}
        ref={ref}
        {...(reduced ? {} : panelReveal)}
        exit={
          reduced
            ? { opacity: 1 }
            : {
                opacity: 0,
                x: props.className === "workspace-outline" ? -6 : 6,
              }
        }
        transition={reduced ? { duration: 0 } : panelReveal.transition}
        inert={!present}
      />
    );
  },
);
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
  mode = "document",
  onPlanChange,
}: Props) {
  const { resolvedTheme } = useTheme();
  const editor = useCreateBlockNote({
    schema: editorSchema,
    dictionary: ru,
    initialContent: plan.blocks.length
      ? (projectBriefs(plan.blocks) as PartialBlock<
          typeof editorSchema.blockSchema
        >[])
      : undefined,
    trailingBlock: editable,
  });
  const [blocks, setBlocks] = useState(() =>
    serializeBriefs(editor.document as unknown as EditorNode[]),
  );
  const initialDocument = useMemo(
    () => JSON.stringify(editor.document),
    [editor],
  );
  const documentSnapshot = useRef(initialDocument);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [focusSearch, setFocusSearch] = useState(0);
  const [templateSource, setTemplateSource] = useState<PortablePlan>();
  useEffect(() => {
    if (!editable) return;
    const undo = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !(event.ctrlKey || event.metaKey) ||
        !["z", "y"].includes(event.key.toLowerCase()) ||
        target?.closest('input,textarea,[role="dialog"]') ||
        target
          ?.closest("[contenteditable]")
          ?.getAttribute("contenteditable") === "true"
      )
        return;
      event.preventDefault();
      if (event.key.toLowerCase() === "y" || event.shiftKey) editor.redo();
      else editor.undo();
      editor.focus();
    };
    document.addEventListener("keydown", undo);
    return () => document.removeEventListener("keydown", undo);
  }, [editor, editable]);
  const [panel, setPanel] = useState<"outline" | "inspector">();
  const [outlineVisible, setOutlineVisible] = useState(true);
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileTarget = useRef<string | undefined>(undefined);
  const latestPlan = useRef(plan);
  useEffect(() => {
    latestPlan.current = plan;
  }, [plan]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const mediaQueue = useRef(false);
  const importImages = async (files: File[], target?: string) => {
    if (mediaQueue.current || !editable) return;
    mediaQueue.current = true;
    setMediaBusy(true);
    try {
      for (const file of files) {
        const url = await prepareImage(file);
        const node = target ? editor.getBlock(target) : undefined;
        const image = {
          id: uid(),
          type: "image",
          props: { url, caption: file.name },
        };
        const document = editor.document as unknown as EditorNode[];
        const candidate = (nodes: EditorNode[]): EditorNode[] =>
          nodes.map((item) =>
            item.id === node?.id
              ? node?.type === "image"
                ? { ...item, props: { ...item.props, url } }
                : { ...item, children: [...(item.children ?? []), image] }
              : {
                  ...item,
                  ...(item.children
                    ? { children: candidate(item.children) }
                    : {}),
                },
          );
        toPortable({
          ...latestPlan.current,
          blocks: serializeBriefs(
            node ? candidate(document) : [...document, image],
          ),
        });
        if (node?.type === "image")
          editor.updateBlock(node, { props: { url } });
        else if (node)
          editor.updateBlock(node, {
            children: gallery([
              ...node.children,
              image,
            ] as EditorNode[]) as PartialBlock<
              typeof editorSchema.blockSchema
            >[],
          });
        else
          editor.insertBlocks(
            [image as PartialBlock<typeof editorSchema.blockSchema>],
            editor.document.at(-1)!,
            "after",
          );
      }
      toast.success(
        "Добавлена уменьшенная копия до 64 КБ. Она сохранится в JSON и снимке; оригинал храните отдельно.",
        { duration: 6000 },
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      mediaQueue.current = false;
      setMediaBusy(false);
    }
  };
  const mediaTarget = () => {
    let node = selectedId ? editor.getBlock(selectedId) : undefined;
    while (node && node.type !== "brief") node = editor.getParentBlock(node);
    return node?.id;
  };
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
    () => window.matchMedia("(min-width: 1200px)").matches,
    () => false,
  );
  const selectedNode = selectedId ? editor.getBlock(selectedId) : undefined;
  const selected = selectedNode
    ? serializeBriefs([selectedNode as unknown as EditorNode])[0]
    : undefined;
  const selectBlock = (id: string, openProperties = true) => {
    setSelectedId(id);
    if (openProperties) setInspectorVisible(true);
    if (!wide && openProperties) setPanel("inspector");
  };
  const grouping = useMemo(() => taskCompanions(blocks), [blocks]);
  const taskOrder = useMemo(
    () =>
      new Map(
        flattenBlocks(blocks)
          .filter((block) => block.type === "task")
          .map((block, index) => [block.id!, index + 1]),
      ),
    [blocks],
  );
  const duplicateId = duplicateTitleHeading(blocks, plan.title);
  const presentationStyle = useMemo(() => {
    const scope = `[data-document-renderer="${CSS.escape(rendererId)}"]`;
    const selector = (id: string) =>
      `${scope} .bn-block-outer[data-id="${CSS.escape(id)}"]`;
    const rules: string[] = [];
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
    embeddedIds: new Set<string>(),
    replaceImage: (id: string) => {
      fileTarget.current = id;
      if (fileInput.current) {
        fileInput.current.multiple = false;
        fileInput.current.click();
      }
    },
    collapsedIds,
    taskOrder,
    saveTemplate: (id: string) => {
      const current = { ...plan, blocks: serializeWithSource(editor.document as unknown as EditorNode[], plan.blocks) };
      setTemplateSource(extractTemplate(current, id, true));
    },
    toggleBrief: (id: string) =>
      setCollapsedIds((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    addToBrief: (
      id: string,
      type: "requirement" | "reference" | "image" | "file",
    ) => {
      if (type === "file") {
        fileTarget.current = id;
        if (fileInput.current) {
          fileInput.current.multiple = true;
          fileInput.current.click();
        }
        return;
      }
      const node = editor.getBlock(id);
      if (!node) return;
      setCollapsedIds(
        (previous) => new Set([...previous].filter((value) => value !== id)),
      );
      const inserted: PartialBlock<typeof editorSchema.blockSchema> = {
        id: uid(),
        type: type === "requirement" ? "bulletListItem" : type,
      };
      editor.updateBlock(node, { children: [...node.children, inserted] });
      if (type === "requirement") {
        setSelectedId(inserted.id);
        editor.setTextCursorPosition(inserted.id!, "start");
        editor.focus();
      } else selectBlock(inserted.id!);
    },
    duplicateBrief: (id: string) => {
      const current = {
        ...plan,
        blocks: serializeWithSource(
          editor.document as unknown as EditorNode[],
          plan.blocks,
        ),
      };
      const result = duplicateBrief(current, id, uid);
      if (onPlanChange) onPlanChange(result.plan);
      else {
        Object.values(result.plan.tasks)
          .filter((task) => !plan.tasks[task.id])
          .forEach((task) => onTaskChange?.(task));
      }
      const copy = findEditorNode(
        projectBriefs(result.plan.blocks),
        result.id,
      )!;
      editor.insertBlocks(
        [copy as PartialBlock<typeof editorSchema.blockSchema>],
        id,
        "after",
      );
      selectBlock(result.id, false);
    },
    moveBrief: (id: string, direction: "up" | "down") => {
      const next = moveProjectedBrief(
        editor.document as unknown as EditorNode[],
        id,
        direction,
      );
      editor.replaceBlocks(
        editor.document,
        next as PartialBlock<typeof editorSchema.blockSchema>[],
      );
    },
    removeBrief: (id: string) => {
      editor.removeBlocks([id]);
      setSelectedId(undefined);
      editor.focus();
    },
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
    setCollapsedIds(
      (previous) =>
        new Set(
          [...previous].filter(
            (value) => value !== id && grouping.sectionById[id ?? ""] !== value,
          ),
        ),
    );
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
      !["task", "brief", "reference", "image", "divider"].includes(block.type)
    ) {
      editor.setTextCursorPosition(id, "start");
      editor.focus();
    } else target?.focus({ preventScroll: true });
  };
  const add = (type: keyof typeof editorSchema.blockSchema, slash = false) => {
    const partial: PartialBlock<typeof editorSchema.blockSchema> =
      type === "task" ? { type: "brief", props: { taskId: uid() } } : { type };
    if (partial.type === "brief")
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
      let target = editor.getBlock(anchor)!;
      if (type === "task") {
        while (editor.getParentBlock(target))
          target = editor.getParentBlock(target)!;
      }
      created = editor.insertBlocks([partial], target, "after")[0];
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
  const insertTemplate = (template: PortablePlan) => {
    const current = { ...plan, blocks: serializeWithSource(editor.document as unknown as EditorNode[], plan.blocks) };
    const families = new Set((current.fontSources ?? []).map(f => f.family.toLowerCase()));
    const next = toPortable({ ...current,
      blocks: [...current.blocks, ...template.blocks], tasks: { ...current.tasks, ...template.tasks },
      typography: { ...current.typography, ...template.typography },
      fontSources: [...(current.fontSources ?? []), ...(template.fontSources ?? []).filter(f => !families.has(f.family.toLowerCase()))],
    });
    onPlanChange?.(next);
    const nodes = projectBriefs(template.blocks);
    editor.insertBlocks(nodes as PartialBlock<typeof editorSchema.blockSchema>[], editor.document.at(-1)!, "after");
    setPanel(undefined);
    selectBlock(nodes[0].id!, false);
  };
  const jumpIds = flattenBlocks(blocks)
    .filter((item) => item.type === "task" && Boolean(item.id))
    .map((item) => item.id!);
  const activeJumpId = selectedId
    ? (taskOrder.has(selectedId) ? selectedId : grouping.sectionById[selectedId])
    : undefined;
  const jumpIndex = jumpIds.indexOf(activeJumpId ?? "");
  const jumpTo = (direction: -1 | 1) => {
    const index = direction === 1 ? jumpIndex + 1 : jumpIndex - 1;
    if (index >= 0 && index < jumpIds.length) locate(jumpIds[index]);
  };
  const outline = (
    <PlanOutline
      plan={plan}
      blocks={blocks}
      selectedId={selectedId}
      select={locate}
      add={(type: InsertType) => add(type)}
      focusSearch={focusSearch}
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
          editor.updateBlock(selectedNode!.id, { props });
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
          editor.updateBlock(selectedNode!.id, {
            props: {
              textAlignment: props.textAlignment as
                "left" | "center" | "right" | "justify",
            },
          });
      }}
      remove={() => {
        if (selectedNode) editor.removeBlocks([selectedNode.id]);
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
        onPasteCapture={(event) => {
          const files = [...event.clipboardData.files].filter((file) =>
            file.type.startsWith("image/"),
          );
          if (editable && files.length) {
            event.preventDefault();
            event.stopPropagation();
            void importImages(files, mediaTarget());
          }
        }}
        onDragOver={(event) => {
          if (
            editable &&
            [...event.dataTransfer.items].some((item) => item.kind === "file")
          )
            event.preventDefault();
        }}
        onDropCapture={(event) => {
          const files = [...event.dataTransfer.files].filter((file) =>
            file.type.startsWith("image/"),
          );
          if (editable && files.length) {
            event.preventDefault();
            event.stopPropagation();
            const task = (event.target as HTMLElement).closest<HTMLElement>(
              ".bn-block:has(> .node-brief)",
            )?.dataset.id;
            void importImages(files, task ?? mediaTarget());
          }
        }}
        style={
          {
            "--ipos-outline-width": `${outlineWidth}px`,
            "--ipos-inspector-width": `${inspectorWidth}px`,
          } as CSSProperties
        }
        data-document-renderer={rendererId}
        className={cn(
          editable ? "editor-workspace" : "readonly-workspace",
          mode === "workspace" && editable ? "mode-workspace" : "mode-document",
          !showCover && "embedded-document",
          focusMode && "focus-mode",
          editable && outlineVisible && "outline-open",
          editable && inspectorVisible && "inspector-open",
        )}
      >
        {editable && (
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            aria-label="Файл изображения"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              void importImages(files, fileTarget.current);
            }}
          />
        )}
        {mediaBusy && (
          <p role="status" className="media-progress">
            Подготовка изображения…
          </p>
        )}
        <style>{presentationStyle}</style>
        {editable && !focusMode && (
          <>
            <div className="workspace-controls workspace-mobile-bar">
              <div className="task-jump" role="group" aria-label="Перемещение по задачам">
                <Button type="button" size="icon" variant="ghost" disabled={jumpIndex <= 0}
                  aria-label="Предыдущая задача" title="Предыдущая задача"
                  onClick={() => jumpTo(-1)}><ChevronLeft aria-hidden="true" /></Button>
                <span aria-live="polite">{jumpIds.length ? `${Math.max(0, jumpIndex + 1)} / ${jumpIds.length}` : "Нет задач"}</span>
                <Button type="button" size="icon" variant="ghost"
                  disabled={!jumpIds.length || jumpIndex >= jumpIds.length - 1}
                  aria-label="Следующая задача" title="Следующая задача"
                  onClick={() => jumpTo(1)}><ChevronRight aria-hidden="true" /></Button>
              </div>
              <div className="workspace-secondary-tools">
                <Button variant="ghost" size="sm" onClick={() => { setPanel(undefined); setTemplatesOpen(true); }}>Шаблоны</Button>
                <Button variant="ghost" size="sm" onClick={() => { setOutlineVisible(true); if (!wide) setPanel("outline"); setFocusSearch(n => n + 1); }}>Поиск задач</Button>
              </div>
              <div className="workspace-panel-tools">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Структура"
                title="Структура плана"
                aria-pressed={wide ? outlineVisible : panel === "outline"}
                onClick={() => {
                  setFocusSearch(0);
                  if (wide) setOutlineVisible((value) => !value);
                  else setPanel("outline");
                }}
              >
                <PanelLeft data-icon="inline-start" />
                <span className="workspace-panel-label">Структура</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Свойства"
                title="Свойства выбранного блока"
                aria-pressed={wide ? inspectorVisible : panel === "inspector"}
                onClick={() =>
                  wide
                    ? setInspectorVisible((value) => !value)
                    : setPanel("inspector")
                }
              >
                <SlidersHorizontal data-icon="inline-start" />
                <span className="workspace-panel-label">Свойства</span>
              </Button>
              </div>
            </div>
            <AnimatePresence key={wide ? "desktop-outline" : "mobile-outline"} initial={false} mode="popLayout">
            {wide && outlineVisible && (
              <WorkspacePanel key="outline" className="workspace-outline" aria-label="Навигация плана">
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
              </WorkspacePanel>
            )}
            </AnimatePresence>
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
            {editable && !plan.blocks.length && (
              <Empty className="workspace-empty">
                <EmptyHeader>
                  <EmptyTitle>Начните с задания</EmptyTitle>
                  <EmptyDescription>
                    Добавьте идею, требования и референсы. Можно начать с
                    обычного текста ниже.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" onClick={() => add("task")}>
                    Новая задача
                  </Button>
                </EmptyContent>
              </Empty>
            )}
            <BlockNoteView
              editor={editor}
              portalElements={{ default: "body" }}
              editable={editable}
              theme={editable && mode === "workspace" && resolvedTheme === "dark" ? "dark" : "light"}
              slashMenu={false}
              sideMenu={editable}
              formattingToolbar={editable}
              linkToolbar={editable}
              filePanel={false}
              onChange={() => {
                const snapshot = JSON.stringify(editor.document);
                if (snapshot === documentSnapshot.current) return;
                documentSnapshot.current = snapshot;
                const next = serializeWithSource(
                  editor.document as unknown as EditorNode[],
                  latestPlan.current.blocks,
                );
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
        <AnimatePresence key={wide ? "desktop-inspector" : "mobile-inspector"} initial={false} mode="popLayout">
        {editable && wide && inspectorVisible && !focusMode && (
          <WorkspacePanel
            key="inspector"
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
                onClick={() => {
                  root.current?.querySelector<HTMLButtonElement>('.workspace-panel-tools [aria-label="Свойства"]')?.focus({ preventScroll: true });
                  setInspectorVisible(false);
                }}
              >
                <X />
              </Button>
            </div>
            {inspector}
          </WorkspacePanel>
        )}
        </AnimatePresence>
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
      {editable && templatesOpen && <TemplateDialog onClose={() => setTemplatesOpen(false)} onInsert={insertTemplate} />}
      {editable && templateSource && <SaveTemplateDialog source={templateSource} onClose={() => setTemplateSource(undefined)} />}
    </PlanContext.Provider>
  );
}
