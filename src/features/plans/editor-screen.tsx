"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { ThemeControl } from "@/components/theme/theme-control";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Pencil,
  Share2,
  Maximize2,
  Minimize2,
  Bot,
} from "lucide-react";
import { toast } from "@/lib/notifications";
import { usePlan } from "./use-plan";
import { AiSyncDialog } from "@/features/ai-sync/ai-sync-dialog";
import { db } from "@/lib/db/database";
import { event, saveRevision } from "./repository";
import { PlanRenderer } from "@/components/plan/renderer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { PlanEmblem } from "@/components/plan/plan-emblem";
import { PlanActionsMenu } from "@/components/editor/plan-actions-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportDialog } from "@/features/import/import-dialog";
import { ExportDialog } from "@/features/export/export-dialog";
import { ShareDialog } from "@/features/sharing/share-dialog";
import { HistoryDialog } from "@/features/revisions/history-dialog";
import { encodeShare } from "@/lib/share/codec";
import { errorMessage } from "@/lib/labels";
import {
  flattenBlocks,
  toPortable,
  type Block,
  type BlockTypography,
  type FontSource,
  type PortablePlan,
} from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
import { setTaskAssignment } from "@/features/activists/task-assignments";
export function EditorScreen({ id }: { id: string }) {
  const { plan, loaded, status, error, update, flush, replace, generation } =
    usePlan(id);
  const router = useRouter();
  const typographyUndo = useRef<{
    generation: number;
    styles: Record<string, BlockTypography>;
  }>({ generation, styles: {} });
  const [preview, setPreview] = useState(false);
  const [mode, setMode] = useState<"workspace" | "document">("workspace");
  const [focusMode, setFocusMode] = useState(false);
  const [watermark, setWatermark] = useState(true);
  const [dialog, setDialog] = useState<"import" | "export" | "history" | "ai-sync">();
  const [exportPlan, setExportPlan] = useState<PortablePlan>();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePlan, setSharePlan] = useState<PortablePlan>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!focusMode || preview) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || dialog || shareUrl !== null)
        return;
      // Window bubble runs after native editor/Radix handlers. Visible overlays
      // also own Escape when their close handler does not cancel the event.
      const overlays = document.querySelectorAll<HTMLElement>(
        '[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper],.bn-suggestion-menu',
      );
      if ([...overlays].some((element) => element.getClientRects().length > 0))
        return;
      if (
        (event.target as HTMLElement | null)?.closest("[data-sonner-toaster]")
      )
        return;
      if (event.defaultPrevented) {
        // BlockNote 0.55's OverrideEscape always consumes Escape to blur plain
        // text. In focus mode that specific blur should exit focus, preserving
        // the DOM selection. Other consumed events still belong to their UI.
        const editor = (
          event.target as HTMLElement | null
        )?.closest<HTMLElement>(".bn-editor");
        if (!editor || document.activeElement !== document.body) return;
        editor.focus({ preventScroll: true });
      }
      setFocusMode(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [focusMode, preview, dialog, shareUrl]);
  // Keep entities in memory so BlockNote undo can restore a removed task block.
  const changeBlocks = useCallback(
    (blocks: Block[]) =>
      update((p) => {
        if (typographyUndo.current.generation !== generation)
          typographyUndo.current = { generation, styles: {} };
        Object.assign(typographyUndo.current.styles, p.typography);
        const ids = new Set(
          flattenBlocks(blocks).flatMap((block) =>
            block.id ? [block.id] : [],
          ),
        );
        const typography = Object.keys(typographyUndo.current.styles).length
          ? Object.fromEntries(
              Object.entries(typographyUndo.current.styles).filter(
                ([blockId]) => ids.has(blockId),
              ),
            )
          : undefined;
        return {
          ...p,
          blocks,
          typography:
            typography && Object.keys(typography).length > 0
              ? typography
              : undefined,
        };
      }),
    [update, generation],
  );
  const changeTask = useCallback(
    (task: Task) =>
      update((p) => {
        const assignments = { ...p.assignments };
        if ((p.tasks[task.id]?.assignee ?? "") !== (task.assignee ?? "")) {
          delete assignments[task.id];
        }
        return {
          ...p,
          tasks: { ...p.tasks, [task.id]: task },
          assignments: Object.keys(assignments).length ? assignments : undefined,
        };
      }),
    [update],
  );
  const changeTypography = useCallback(
    (blockId: string, value: BlockTypography) =>
      update((p) => {
        const next = { ...(p.typography ?? {}) };
        const cleaned = Object.fromEntries(
          Object.entries(value).filter(
            ([, item]) => item !== undefined && item !== "",
          ),
        ) as BlockTypography;
        if (Object.keys(cleaned).length > 0) next[blockId] = cleaned;
        else delete next[blockId];
        if (Object.keys(cleaned).length)
          typographyUndo.current.styles[blockId] = cleaned;
        else delete typographyUndo.current.styles[blockId];
        return {
          ...p,
          typography: Object.keys(next).length > 0 ? next : undefined,
        };
      }),
    [update],
  );
  const changeFontSources = useCallback(
    (fontSources: FontSource[]) =>
      update((p) => ({
        ...p,
        fontSources: fontSources.length ? fontSources : undefined,
      })),
    [update],
  );
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (!loaded)
    return (
      <main className="document-shell">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  if (!plan)
    return (
      <main className="document-shell">
        <h1>{error ? "Не удалось открыть планы" : "План не найден"}</h1>
        <p>{error || "Он мог быть удалён или сохранён в другом браузере."}</p>
        <Button asChild>
          <Link href="/">К планам</Link>
        </Button>
      </main>
    );
  return (
    <>
      <header
        className={`cobalt-editor-bar ${preview ? "preview-bar" : "editor-bar"}${focusMode ? " is-focus" : ""}`}
      >
        <div className="editor-identity">
          <Button
            size="icon"
            variant="ghost"
            aria-label="К планам"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await flush();
                router.push("/");
              })
            }
          >
            <ArrowLeft />
          </Button>
          <span className="editor-plan-name" aria-label="IPOS.Plan">
            <PlanEmblem size={26} />
            <span className="editor-brand-label">IPOS.Plan</span>
          </span>
          <span className="editor-context-title" title={plan.title}>{plan.title}</span>
          <ThemeControl />
          <motion.span
            animate={{ opacity: error ? [0.65, 1] : 1 }}
            className="save-status"
            role="status"
            data-state={
              error
                ? "error"
                : status === "Сохранено локально"
                  ? "saved"
                  : "pending"
            }
          >
            <motion.span key={status} initial={{ opacity: 0.65 }} animate={{ opacity: 1 }}>{status}</motion.span>
          </motion.span>
        </div>
        <ToggleGroup
          type="single"
          value={preview ? "document" : mode}
          className="experience-switch"
          aria-label="Режим плана"
          onValueChange={(value) => {
            if (value)
              void run(async () => {
                await flush();
                setMode(value as "workspace" | "document");
                setPreview(false);
              });
          }}
        >
          <ToggleGroupItem value="workspace" aria-label="Рабочий стол">
            <span className="mode-label-full">Рабочий стол</span>
            <span className="mode-label-short" aria-hidden="true">Стол</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="document">Документ</ToggleGroupItem>
        </ToggleGroup>
        <nav className="editor-actions" aria-label="Действия с планом">
          <Button
            size="sm"
            variant="outline"
            data-editor-action="preview"
            aria-label={preview ? "Редактировать" : "Предпросмотр"}
            disabled={busy}
            title={
              preview
                ? "Вернуться к редактированию"
                : "Посмотреть документ без инструментов"
            }
            onClick={() =>
              void run(async () => {
                await flush();
                setPreview((v) => !v);
              })
            }
          >
            {preview ? (
              <Pencil data-icon="inline-start" />
            ) : (
              <Eye data-icon="inline-start" />
            )}
            <span className="toolbar-desktop-label">
              {preview ? "Редактировать" : "Предпросмотр"}
            </span>
            <span className="toolbar-mobile-label" aria-hidden="true">
              {preview ? "Редактировать" : "Просмотр"}
            </span>
          </Button>
          {!preview && (
            <Button
              size="sm"
              variant="ghost"
              data-editor-action="focus"
              aria-pressed={focusMode}
              aria-label={focusMode ? "Выйти из режима фокуса" : "Режим фокуса"}
              title={
                focusMode
                  ? "Выйти из режима фокуса"
                  : "Скрыть панели и сосредоточиться на документе"
              }
              onClick={() => setFocusMode((value) => !value)}
            >
              {focusMode ? <Minimize2 /> : <Maximize2 />}
              <span className="toolbar-focus-label">
                {focusMode ? "Обычный вид" : "Фокус"}
              </span>
            </Button>
          )}
          {!preview && (
            <Button size="sm" variant="outline" disabled={busy} aria-label="Синхронизация с ChatGPT" title="Синхронизация плана с ChatGPT" onClick={() => void run(async () => { await flush(); setDialog("ai-sync"); })}>
              <Bot data-icon="inline-start" />
              <span className="toolbar-desktop-label">GPT</span>
            </Button>
          )}
          <PlanActionsMenu
            disabled={busy}
            readonly={preview}
            onPrint={() =>
              void run(async () => {
                await flush();
                await document.fonts.ready;
                window.print();
              })
            }
            onHistory={() =>
              void run(async () => {
                await flush();
                setDialog("history");
              })
            }
            onSave={() =>
              void run(async () => {
                const p = await flush();
                await saveRevision(p);
                toast.success("Версия сохранена");
              })
            }
            onImport={() => setDialog("import")}
            onExport={() =>
              void run(async () => {
                setExportPlan(toPortable(plan));
                setDialog("export");
              })
            }
          />
          <Button
            size="sm"
            data-editor-action="share"
            aria-label="Поделиться"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                // Publishing and self-contained links accept PortablePlan, not
                // IndexedDB's Plan metadata (id, timestamps, version).
                const p = toPortable(await flush());
                setSharePlan(p);
                try {
                  const token = await encodeShare(p);
                  const url = `${window.location.origin}/view#p=${token}`;
                  await db.activity.add(
                    event(id, "SHARE_CREATED", "Создана ссылка на снимок"),
                  );
                  setShareUrl(url);
                } catch {
                  // A large portable document can still be published online.
                  // The self-contained URL is optional, not a publishing gate.
                  setShareUrl("");
                }
              })
            }
          >
            <Share2 data-icon="inline-start" />
            <span className="toolbar-share-label">Поделиться</span>
          </Button>
        </nav>
      </header>
      <main className={`editor-stage cobalt-editor-stage${focusMode ? " focus-stage" : ""}`}>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void run(async () => {
                    await flush();
                  })
                }
              >
                Повторить сохранение
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {preview && (
          <div className="preview-notice">
            <Eye size={16} aria-hidden="true" />
            Предпросмотр · так выглядит снимок для читателя
          </div>
        )}
        <div
          className="document-content"
          inert={busy || dialog !== undefined || shareUrl !== null}
        >
          <PlanRenderer
            onAssignmentChange={(taskId, value, text) =>
              update((current) => setTaskAssignment(current, taskId, value, text))
            }
            onOpenPerson={(personId) => void run(async () => {
              await flush();
              router.push("/activists/" + personId);
            })}
            key={generation}
            plan={plan}
            editable={!preview && mode === "workspace"}
            mode={preview ? "document" : mode}
            onPlanChange={(next) =>
              update((current) => ({ ...current, ...next }))
            }
            showCover
            onTitleChange={(title) => update((p) => ({ ...p, title }))}
            watermark={watermark}
            onWatermarkChange={setWatermark}
            onBlocksChange={changeBlocks}
            onTaskChange={changeTask}
            onTypographyChange={changeTypography}
            onFontSourcesChange={changeFontSources}
            focusMode={focusMode && !preview}
          />
        </div>
      </main>
      {dialog === "ai-sync" && (
        <AiSyncDialog plan={plan} flush={flush} replace={replace} onClose={() => setDialog(undefined)} />
      )}
      {dialog === "import" && (
        <ImportDialog
          replacing
          onClose={() => setDialog(undefined)}
          onConfirm={async (data) => {
            await replace(data, "PLAN_IMPORTED");
          }}
        />
      )}
      {dialog === "export" && exportPlan && (
        <ExportDialog plan={exportPlan} onClose={() => setDialog(undefined)} />
      )}
      {dialog === "history" && (
        <HistoryDialog
          planId={id}
          onClose={() => setDialog(undefined)}
          onRestore={async (data) => {
            await replace(data, "PLAN_RESTORED");
          }}
        />
      )}
      {shareUrl !== null && (
        <ShareDialog url={shareUrl} plan={sharePlan ?? toPortable(plan)} planId={id} onClose={() => { setShareUrl(null); setSharePlan(undefined); }} />
      )}
    </>
  );
}
