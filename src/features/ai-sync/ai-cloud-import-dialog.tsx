"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db/database";
import { createPlan } from "@/features/plans/repository";
import type { PortablePlan } from "@/lib/schema/plan";
import { PlanRenderer } from "@/components/plan/renderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";

type Item = { id: string; title: string; updatedAt: string; version: number };
type Cloud = Item & { document: PortablePlan };
type Page = { plans: Item[]; nextCursor: string | null };
type Props = { onClose: () => void; onImported: (localId: string) => void };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error || `Ошибка запроса: ${response.status}`);
  return result as T;
}

export function AiCloudImportDialog({ onClose, onImported }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cloud>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getJson<Page>("/api/ai/plans")
      .then((page) => {
        if (mounted) {
          setItems(page.plans);
          setCursor(page.nextCursor);
        }
      })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : "Не удалось получить планы."); })
      .finally(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await job(); }
    catch (e) { setError(e instanceof Error ? e.message : "Ошибка."); }
    finally { setBusy(false); }
  };

  const more = () => void run(async () => {
    if (!cursor) return;
    const page = await getJson<Page>(`/api/ai/plans?cursor=${encodeURIComponent(cursor)}`);
    setItems((old) => [...old, ...page.plans.filter((item) => !old.some((before) => before.id === item.id))]);
    setCursor(page.nextCursor);
  });

  const choose = (id: string) => void run(async () => {
    const cloud = await getJson<Cloud>(`/api/ai/plans/${encodeURIComponent(id)}`);
    setSelected(cloud);
  });

  const importSelected = () => void run(async () => {
    if (!selected) return;
    // Creating a new local plan never replaces or overwrites existing IndexedDB drafts.
    const local = await createPlan(selected.document, "PLAN_IMPORTED");
    await db.settings.put({
      key: `ai-sync:plan:${local.id}`,
      value: { id: selected.id, version: selected.version },
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
              ) : <p>Облачных планов пока нет.</p>}
              {cursor && <Button variant="outline" disabled={busy} onClick={more}>Показать ещё</Button>}
            </>
          )}
          {error && (
            <p role="alert">
              {error} <Link href="/admin/login" target="_blank" rel="noopener noreferrer">Войти в админку</Link>
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
