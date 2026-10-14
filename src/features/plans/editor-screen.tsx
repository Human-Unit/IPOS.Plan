"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Pencil,
  History,
  Upload,
  Download,
  Share2,
  BookmarkPlus,
  MoreHorizontal,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "./use-plan";
import { db } from "@/lib/db/database";
import { event, saveRevision } from "./repository";
import { PlanRenderer } from "@/components/plan/renderer";
import { Button } from "@/components/ui/button";
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
  type PortablePlan,
} from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";

export function EditorScreen({ id }: { id: string }) {
  const { plan, loaded, status, error, update, flush, replace, generation } =
    usePlan(id);
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [watermark, setWatermark] = useState(true);
  const [dialog, setDialog] = useState<"import" | "export" | "history">();
  const [exportPlan, setExportPlan] = useState<PortablePlan>();
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep entities in memory so BlockNote undo can restore a removed task block.
  const changeBlocks = useCallback(
    (blocks: Block[]) =>
      update((p) => {
        const ids = new Set(
          flattenBlocks(blocks).flatMap((block) => (block.id ? [block.id] : [])),
        );
        const typography = p.typography
          ? Object.fromEntries(
              Object.entries(p.typography).filter(([blockId]) => ids.has(blockId)),
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
    [update],
  );
  const changeTask = useCallback(
    (task: Task) =>
      update((p) => ({ ...p, tasks: { ...p.tasks, [task.id]: task } })),
    [update],
  );
  const changeTypography = useCallback(
    (blockId: string, value: BlockTypography) =>
      update((p) => {
        const next = { ...(p.typography ?? {}) };
        const cleaned = Object.fromEntries(
          Object.entries(value).filter(([, item]) => item !== undefined && item !== ""),
        ) as BlockTypography;
        if (Object.keys(cleaned).length > 0) next[blockId] = cleaned;
        else delete next[blockId];
        return {
          ...p,
          typography: Object.keys(next).length > 0 ? next : undefined,
        };
      }),
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
      <header className={`editor-bar${focusMode ? " is-focus" : ""}`}>
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
          <span className="editor-plan-name">{plan.title}</span>
          <span className="save-status" role="status">
            {status}
          </span>
        </div>

        <nav className="editor-actions" aria-label="Действия с планом">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await flush();
                setPreview((value) => !value);
              })
            }
          >
            {preview ? (
              <Pencil data-icon="inline-start" />
            ) : (
              <Eye data-icon="inline-start" />
            )}
            {preview ? "Редактировать" : "Предпросмотр"}
          </Button>

          {!preview && (
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={focusMode}
              aria-label={focusMode ? "Выйти из режима фокуса" : "Режим фокуса"}
              onClick={() => setFocusMode((value) => !value)}
            >
              {focusMode ? <Minimize2 /> : <Maximize2 />}
              <span className="toolbar-focus-label">
                {focusMode ? "Обычный вид" : "Фокус"}
              </span>
            </Button>
          )}

          <details className="editor-more">
            <summary aria-label="Дополнительные действия">
              <MoreHorizontal size={18} />
            </summary>
            <div className="editor-more-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  setDialog("history");
                  const details = e.currentTarget.closest("details");
                  if (details) details.open = false;
                }}
              >
                <History size={16} />
                История
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={(e) => {
                  const details = e.currentTarget.closest("details");
                  if (details) details.open = false;
                  void run(async () => {
                    const p = await flush();
                    await saveRevision(p);
                    toast.success("Версия сохранена");
                  });
                }}
              >
                <BookmarkPlus size={16} />
                Сохранить версию
              </button>
              <span className="editor-more-separator" />
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  setDialog("import");
                  const details = e.currentTarget.closest("details");
                  if (details) details.open = false;
                }}
              >
                <Upload size={16} />
                Импорт
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={(e) => {
                  setExportPlan(toPortable(plan));
                  setDialog("export");
                  const details = e.currentTarget.closest("details");
                  if (details) details.open = false;
                }}
              >
                <Download size={16} />
                Экспорт
              </button>
            </div>
          </details>

          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const p = await flush();
                const token = await encodeShare(p);
                const url = `${window.location.origin}/view#p=${token}`;
                await db.activity.add(
                  event(id, "SHARE_CREATED", "Создана ссылка на снимок"),
                );
                setShareUrl(url);
              })
            }
          >
            <Share2 data-icon="inline-start" />
            Поделиться
          </Button>
        </nav>
      </header>

      <main className={`editor-stage${focusMode ? " focus-stage" : ""}`}>
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
          inert={busy || dialog !== undefined || Boolean(shareUrl)}
        >
          <PlanRenderer
            key={`${generation}-${preview}`}
            plan={plan}
            editable={!preview}
            showCover
            onTitleChange={(title) => update((p) => ({ ...p, title }))}
            watermark={watermark}
            onWatermarkChange={setWatermark}
            onBlocksChange={changeBlocks}
            onTaskChange={changeTask}
            onTypographyChange={changeTypography}
            focusMode={focusMode && !preview}
          />
        </div>
      </main>

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
      {shareUrl && (
        <ShareDialog url={shareUrl} onClose={() => setShareUrl("")} />
      )}
    </>
  );
}
