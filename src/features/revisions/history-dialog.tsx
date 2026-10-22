"use client";
import { useState } from "react";
import { History } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Revision } from "@/lib/db/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlanRenderer } from "@/components/plan/renderer";
import { formatDate, errorMessage } from "@/lib/labels";
import type { PortablePlan } from "@/lib/schema/plan";
import { toast } from "sonner";
export function HistoryDialog({
  planId,
  onClose,
  onRestore,
}: {
  planId: string;
  onClose: () => void;
  onRestore: (plan: PortablePlan) => Promise<void>;
}) {
  const revisions = useLiveQuery(
    () => db.revisions.where({ planId }).reverse().sortBy("createdAt"),
    [planId],
  );
  const activity = useLiveQuery(
    () => db.activity.where({ planId }).reverse().sortBy("createdAt"),
    [planId],
  );
  const [selected, setSelected] = useState<Revision>();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await onRestore(selected.snapshot);
      toast.success("Версия восстановлена");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="wide-dialog">
        <DialogHeader>
          <DialogTitle>
            <History aria-hidden="true" />
            История плана
          </DialogTitle>
          <DialogDescription>
            Сохранённые версии — полные снимки для восстановления. События —
            журнал изменений, без возможности восстановления. Всё хранится
            только в этом браузере.
          </DialogDescription>
        </DialogHeader>
        <h3>Сохранённые версии</h3>
        {revisions?.length === 0 && (
          <p className="muted">
            Версий пока нет. Используйте «Сохранить версию» в редакторе.
          </p>
        )}
        <div className="revision-list">
          {revisions?.map((r) => (
            <Button
              key={r.id}
              variant={selected?.id === r.id ? "secondary" : "outline"}
              onClick={() => {
                setSelected(r);
                setConfirm(false);
              }}
              disabled={busy}
            >
              {r.title} · {formatDate(r.createdAt)}
            </Button>
          ))}
        </div>
        {selected && (
          <>
            <div className="revision-preview">
              <PlanRenderer
                key={selected.id}
                plan={selected.snapshot}
                showCover
              />
            </div>
            {confirm ? (
              <div className="confirm-row">
                <p>Заменить текущий план? Его копия останется в версиях.</p>
                <Button disabled={busy} onClick={() => void restore()}>
                  {busy ? "Восстановление…" : "Подтвердить восстановление"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  Отмена
                </Button>
              </div>
            ) : (
              <Button onClick={() => setConfirm(true)}>
                Восстановить эту версию
              </Button>
            )}
          </>
        )}
        <h3>Локальные события</h3>
        <p className="muted">
          Названия указаны на момент события. Изменения объединяются при
          сохранении.
        </p>
        <ol className="activity-list">
          {activity?.slice(0, 50).map((a) => (
            <li key={a.id}>
              <span>{a.message}</span>
              <time dateTime={a.createdAt}>{formatDate(a.createdAt)}</time>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
