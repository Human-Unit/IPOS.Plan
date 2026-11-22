"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Plan, PortablePlan } from "@/lib/schema/plan";
import { toPortable } from "@/lib/schema/plan";
import { bindingKey, bindingSchema, type CloudBinding } from "@/lib/ai-workspace/binding";
import { cloudPlanRecordSchema, type CloudPlanRecord } from "@/lib/ai-workspace/model";
import { saveCloudBinding } from "@/features/plans/repository";
import { cloudRequest, planPath, readCloudPlan } from "./client";
import { db } from "@/lib/db/database";
import { PlanRenderer } from "@/components/plan/renderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";

type Review = { remote: CloudPlanRecord; local: Plan };
type Props = {
  plan: Plan;
  flush: () => Promise<Plan>;
  replace: (
    data: PortablePlan,
    kind: "PLAN_IMPORTED",
    sync: { expectedLocalVersion: number; binding: CloudBinding },
  ) => Promise<Plan>;
  onClose: () => void;
};

async function readBinding(id: string) {
  const row = await db.settings.get(bindingKey(id));
  return bindingSchema.safeParse(row?.value).data;
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
  const [binding, setBinding] = useState<CloudBinding>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<Review>();
  const [confirmed, setConfirmed] = useState(false);
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
    const record = await cloudRequest(cloudPlanRecordSchema, "/api/ai/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: saved, idempotencyKey: plan.id }),
    });
    // The create request can be replayed after a lost response. Keep v1 as
    // the baseline so a later cloud change still needs review.
    const next = { id: record.id, version: 1 };
    await saveCloudBinding(plan.id, next);
    setBinding(next);
    setMessage("Копия этого плана сохранена в приватном облачном пространстве.");
  });

  const check = () => void run(async () => {
    if (!binding) return;
    setReview(undefined);
    setConfirmed(false);
    const local = await flush();
    const remote = await readCloudPlan(binding.id);
    if (remote.version < binding.version)
      throw new Error("Сервер вернул более раннюю версию. Проверьте подключение.");
    if (remote.version > binding.version) {
      setReview({ local, remote });
      setMessage("Обнаружены изменения на сервере. Проверьте их перед применением.");
    } else {
      setMessage("Серверный план не изменился.");
    }
  });

  const push = () => void run(async () => {
    if (!binding) return;
    const saved = toPortable(await flush());
    const record = await cloudRequest(cloudPlanRecordSchema, planPath(binding.id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: binding.version, document: saved }),
    });
    if (record.id !== binding.id || record.version !== binding.version + 1)
      throw new Error("Сервер вернул неожиданную версию. Проверьте изменения из GPT.");
    const next = { id: record.id, version: record.version };
    await saveCloudBinding(plan.id, next);
    setBinding(next);
    setMessage("Изменения отправлены.");
  });

  const apply = () => void run(async () => {
    if (!binding || !review || !confirmed) return;
    const { local, remote } = review;
    const latest = await readCloudPlan(binding.id);
    if (latest.version !== remote.version) {
      setReview(undefined);
      setConfirmed(false);
      throw new Error("Серверный план изменился во время просмотра. Проверьте ещё раз.");
    }
    const next = { id: latest.id, version: latest.version };
    await replace(remote.document, "PLAN_IMPORTED", { expectedLocalVersion: local.version, binding: next });
    setBinding(next);
    setReview(undefined);
    setConfirmed(false);
    setMessage("Серверная версия применена. Предыдущая локальная версия сохранена в истории.");
  });

  const changes = review ? summary(toPortable(review.local), review.remote.document) : undefined;
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
                <Button variant="outline" disabled={busy || Boolean(review)} onClick={push}>Отправить локальные изменения</Button>
              </div>
              {review && (
                <section aria-label="Предпросмотр серверных изменений">
                  <h3>Изменения · версия {review.remote.version}</h3>
                  <p>Добавлено: {changes?.added.length ?? 0}, изменено: {changes?.changed.length ?? 0}, удалено: {changes?.removed.length ?? 0}. Возможны изменения текста и структуры документа.</p>
                  <div style={{ maxHeight: 320, overflow: "auto" }}>
                    <PlanRenderer plan={review.remote.document} showCover />
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" disabled={busy} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
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
