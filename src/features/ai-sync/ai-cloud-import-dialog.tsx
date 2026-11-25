"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPlan } from "@/features/plans/repository";
import type { CloudPlanRecord } from "@/lib/ai-workspace/model";
import { cloudPageSchema, cloudRequest, CloudRequestError, readCloudPlan, type CloudPage } from "./client";
import { PlanRenderer } from "@/components/plan/renderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";

type Item = CloudPage["plans"][number];
type Props = { onClose: () => void; onImported: (localId: string) => void };


export function AiCloudImportDialog({ onClose, onImported }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<CloudPlanRecord>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void cloudRequest(cloudPageSchema, "/api/ai/plans")
      .then((page) => {
        if (mounted) {
          setItems(page.plans);
          setCursor(page.nextCursor);
        }
      })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e : new Error("Не удалось получить планы.")); })
      .finally(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try { await job(); }
    catch (e) { setError(e instanceof Error ? e : new Error("Ошибка.")); }
    finally { setBusy(false); }
  };

  const more = () => void run(async () => {
    if (!cursor) return;
    const page = await cloudRequest(cloudPageSchema, "/api/ai/plans?cursor=" + encodeURIComponent(cursor));
    setItems((old) => [...old, ...page.plans.filter((item) => !old.some((before) => before.id === item.id))]);
    setCursor(page.nextCursor);
  });

  const choose = (id: string) => void run(async () => {
    const cloud = await readCloudPlan(id);
    setSelected(cloud);
  });

  const importSelected = () => void run(async () => {
    if (!selected) return;
    // Creating a new local plan never replaces or overwrites existing IndexedDB drafts.
    const local = await createPlan(selected.document, "PLAN_IMPORTED", {
      id: selected.id, version: selected.version,
    });
    onImported(local.id);
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="wide-dialog">
        <DialogHeader>
          <DialogTitle>Из ChatGPT · Импорт плана</DialogTitle>
          <DialogDescription>Скопировать выбранный облачный план в локальную библиотеку. Существующие планы не будут изменены.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {!loaded ? <p>Загрузка списка…</p> : selected ? (
            <section aria-label="Предпросмотр импортируемого плана">
              <h3>{selected.document.title}</h3>
              <p>Версия {selected.version} · {Object.keys(selected.document.tasks).length} задач</p>
              <div style={{ maxHeight: 340, overflow: "auto" }}>
                <PlanRenderer plan={selected.document} showCover />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy} onClick={() => setSelected(undefined)}>К списку</Button>
                <Button disabled={busy} onClick={importSelected}>Создать локальную копию</Button>
              </div>
            </section>
          ) : (
            <>
              <p>Выберите план, созданный или обновлённый через ChatGPT.</p>
              {items.length ? (
                <ul aria-label="Планы в облаке">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Button variant="ghost" disabled={busy} onClick={() => choose(item.id)}>
                        {item.title} · версия {item.version}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : !error && <p>Облачных планов пока нет.</p>}
              {cursor && <Button variant="outline" disabled={busy} onClick={more}>Показать ещё</Button>}
            </>
          )}
          {error && (
            <p role="alert">
              {error.message} {error instanceof CloudRequestError && error.status === 401 && (
                <Link href="/admin/login" target="_blank" rel="noopener noreferrer">Войти в админку</Link>
              )}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
