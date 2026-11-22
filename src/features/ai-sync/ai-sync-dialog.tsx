"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Plan, PortablePlan } from "@/lib/schema/plan";
import { toPortable } from "@/lib/schema/plan";
import { db } from "@/lib/db/database";
import { PlanRenderer } from "@/components/plan/renderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";

type CloudRecord = { id: string; version: number; updatedAt: string; document: PortablePlan };
type Binding = { id: string; version: number };
type Props = {
  plan: Plan;
  flush: () => Promise<Plan>;
  replace: (data: PortablePlan, kind: "PLAN_IMPORTED" | "PLAN_RESTORED") => Promise<Plan>;
  onClose: () => void;
};

const keyFor = (id: string) => `ai-sync:plan:${id}`;
async function readBinding(id: string): Promise<Binding | undefined> {
  const row = await db.settings.get(keyFor(id));
  const data = row?.value;
  if (data && typeof data === "object" && "id" in data && "version" in data) {
    const candidate = data as { id: unknown; version: unknown };
    if (typeof candidate.id === "string" && Number.isSafeInteger(candidate.version) && Number(candidate.version) > 0)
      return { id: candidate.id, version: Number(candidate.version) };
  }
}
async function saveBinding(localId: string, binding: Binding) {
  await db.settings.put({ key: keyFor(localId), value: binding });
}
async function responseJson(response: Response): Promise<CloudRecord> {
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Ошибка сервера: ${response.status}`);
  return data as CloudRecord;
}
function summary(local: PortablePlan, remote: PortablePlan) {
  const oldTasks = local.tasks, newTasks = remote.tasks;
  const before = new Set(Object.keys(oldTasks));
  const after = new Set(Object.keys(newTasks));
  const added = [...after].filter((id) => !before.has(id)).map((id) => newTasks[id].title);
  const removed = [...before].filter((id) => !after.has(id)).map((id) => oldTasks[id].title);
  const changed = [...after].filter((id) => before.has(id) && JSON.stringify(oldTasks[id]) !== JSON.stringify(newTasks[id])).map((id) => newTasks[id].title);
  return { added, removed, changed };
}

export function AiSyncDialog({ plan, flush, replace, onClose }: Props) {
  const [binding, setBinding] = useState<Binding>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [remote, setRemote] = useState<CloudRecord>();
  const [confirmed, setConfirmed] = useState(false);
  const [serverHasUpdates, setServerHasUpdates] = useState(false);
  useEffect(() => {
    let mounted = true;
    void readBinding(plan.id).then((value) => {
      if (mounted) { setBinding(value); setLoading(false); }
    }).catch((e) => {
      if (mounted) { setError(e instanceof Error ? e.message : "Не удалось прочитать настройки."); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [plan.id]);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setError(""); setMessage("");
    try { await operation(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось выполнить действие."); }
    finally { setBusy(false); }
  };
  const activate = () => void run(async () => {
    const saved = toPortable(await flush());
    const result = await responseJson(await fetch("/api/ai/plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify({ document: saved }),
    }));
    const next = { id: result.id, version: result.version };
    await saveBinding(plan.id, next);
    setBinding(next);
    setMessage("Копия этого плана сохранена в приватном облачном пространстве.");
  });
  const check = () => void run(async () => {
    if (!binding) return;
    const result = await responseJson(await fetch(`/api/ai/plans/${encodeURIComponent(binding.id)}`, { cache: "no-store", credentials: "same-origin" }));
    const changed = result.version !== binding.version;
    setRemote(result);
    setServerHasUpdates(changed);
    setConfirmed(false);
    setMessage(changed ? "Обнаружены изменения на сервере. Проверьте их перед применением." : "Серверный план не изменился.");
  });
  const push = () => void run(async () => {
    if (!binding) return;
    // The server rejects a stale expectedVersion even if the local editor
    // was updated since this dialog opened.
    const saved = toPortable(await flush());
    const result = await responseJson(await fetch(`/api/ai/plans/${encodeURIComponent(binding.id)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ expectedVersion: binding.version, document: saved }),
    }));
    const next = { id: result.id, version: result.version };
    await saveBinding(plan.id, next);
    setBinding(next);
    setRemote(undefined);
    setServerHasUpdates(false);
    setMessage("Изменения отправлены. Открытые локальные версии не изменены.");
  });
  const apply = () => void run(async () => {
    if (!binding || !remote || !serverHasUpdates || !confirmed) return;
    // Make sure remote has not changed during review and do not import into
    // a different plan. replace() saves a local revision before replacement.
    const latest = await responseJson(await fetch(`/api/ai/plans/${encodeURIComponent(binding.id)}`, { cache: "no-store", credentials: "same-origin" }));
    if (latest.version !== remote.version) throw new Error("Серверный план изменился во время просмотра. Проверьте ещё раз.");
    await replace(remote.document, "PLAN_IMPORTED");
    const next = { id: latest.id, version: latest.version };
    await saveBinding(plan.id, next);
    setBinding(next);
    setRemote(undefined);
    setServerHasUpdates(false);
    setMessage("Серверная версия применена. Предыдущая локальная версия сохранена в истории.");
  });
  const changes = remote ? summary(toPortable(plan), remote.document) : undefined;
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="wide-dialog">
        <DialogHeader>
          <DialogTitle>Подключение к ChatGPT · План</DialogTitle>
          <DialogDescription>
            Только выбранный план. Локальные документы не передаются автоматически, серверные изменения требуют подтверждения.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {loading ? <p>Загрузка настроек…</p> : !binding ? (
            <>
              <p>Создать приватную серверную копию «{plan.title}»? Она будет доступна интеграции после настройки MCP и авторизации.</p>
              <p>Для отправки требуется <Link href="/admin/login" target="_blank" rel="noopener noreferrer">войти в админку</Link>.</p>
              <Button disabled={busy} onClick={activate}>Подключить этот план</Button>
            </>
          ) : (
            <>
              <p>Подключённая копия · версия {binding.version}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy} onClick={check}>Проверить изменения из GPT</Button>
                <Button variant="outline" disabled={busy || serverHasUpdates} onClick={push}>Отправить локальные изменения</Button>
              </div>
              {remote && serverHasUpdates && (
                <section aria-label="Предпросмотр серверных изменений">
                  <h3>Изменения · версия {remote.version}</h3>
                  <p>Добавлено: {changes?.added.length ?? 0}, изменено: {changes?.changed.length ?? 0}, удалено: {changes?.removed.length ?? 0}. Возможны изменения текста и структуры документа.</p>
                  <div style={{ maxHeight: 320, overflow: "auto" }}>
                    <PlanRenderer plan={remote.document} showCover />
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    Я проверил серверную версию и хочу заменить локальный документ.
                  </label>
                  <Button disabled={!confirmed || busy} onClick={apply}>Применить серверную версию</Button>
                </section>
              )}
            </>
          )}
          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error} {error.includes("админку") && <Link href="/admin/login" target="_blank">Войти</Link>}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
