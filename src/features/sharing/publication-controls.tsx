"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Globe2, RefreshCcw, Trash2 } from "lucide-react";
import type { PortablePlan } from "@/lib/schema/plan";
import { toast } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

type Owned = { id: string; managerKey: string };
const keyFor = (planId: string) => "ipos-publication:" + planId;
const sessionCodeKey = "ipos-publish-access";

function readOwned(planId: string): Owned | null {
  try {
    const raw = localStorage.getItem(keyFor(planId));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" && value !== null &&
      "id" in value && typeof value.id === "string" &&
      "managerKey" in value && typeof value.managerKey === "string"
    ) return { id: value.id, managerKey: value.managerKey };
  } catch { /* Private browsing can block storage. */ }
  return null;
}

function slugify(value: string) {
  const letters: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",
    ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };
  return [...value.toLowerCase()].map(c => letters[c] ?? c).join("")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"").slice(0,40).replace(/-+$/g,"") || "plan";
}

export function PublicationControls({ planId, plan }: { planId: string; plan: PortablePlan }) {
  const [owned, setOwned] = useState<Owned | null>(null);
  const [title, setTitle] = useState(plan.title);
  const [slug, setSlug] = useState(() => slugify(plan.title));
  const [accessKey, setAccessKey] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [restoreUrl, setRestoreUrl] = useState("");
  const [restoreKey, setRestoreKey] = useState("");
  const accessRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOwned(readOwned(planId));
    try { setAccessKey(sessionStorage.getItem(sessionCodeKey) || ""); } catch { /* optional convenience */ }
    setChecking(false);
  }, [planId]);

  useEffect(() => {
    if (needsCode) accessRef.current?.focus();
  }, [needsCode]);

  const url = owned && typeof location !== "undefined" ? location.origin + "/p/" + owned.id : "";

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      setError("Не удалось скопировать. Выделите и скопируйте текст вручную.");
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const value = restoreUrl.trim();
      const id = value.includes("/p/") ? value.split("/p/").pop()?.split(/[?#]/)[0] || "" : value;
      if (!/^[a-z0-9-]{5,90}$/.test(id)) throw new Error("Укажите ссылку или ID страницы.");
      const response = await fetch("/api/publications/" + encodeURIComponent(id) + "/verify", {
        method: "POST", headers: { "x-ipos-manager-key": restoreKey }, cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ключ управления не принят.");
      const next = { id, managerKey: restoreKey };
      localStorage.setItem(keyFor(planId), JSON.stringify(next));
      setOwned(next); setTitle(data.title); setRestoreKey(""); setRestoreUrl("");
      toast.success("Управление страницей восстановлено");
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось восстановить управление."); }
    finally { setBusy(false); }
  };

  const invoke = async (method: "POST" | "PUT" | "DELETE") => {
    if (busy) return;
    if (method === "POST" && !accessKey.trim()) {
      setNeedsCode(true);
      setError("");
      return;
    }
    if (method === "DELETE" && !confirm("Снять страницу с публикации? Ссылка перестанет работать.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(method === "POST" ? "/api/publications" : "/api/publications/" + encodeURIComponent(owned!.id), {
        method,
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          ...(method === "POST" ? { "x-ipos-publish-key": accessKey } : { "x-ipos-manager-key": owned!.managerKey }),
        },
        ...(method === "DELETE" ? {} : { body: JSON.stringify({ title, slug, document: plan }) }),
      });
      const data = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(data.error || "Операция не выполнена.");
      if (method === "POST") {
        const next: Owned = { id: data.id, managerKey: data.managerKey };
        localStorage.setItem(keyFor(planId), JSON.stringify(next));
        try { sessionStorage.setItem(sessionCodeKey, accessKey); } catch { /* optional */ }
        setOwned(next);
        setAccessKey(""); setNeedsCode(false);
        toast.success("Страница опубликована");
      } else if (method === "DELETE") {
        localStorage.removeItem(keyFor(planId)); setOwned(null);
        toast.success("Публикация отменена");
      } else {
        toast.success("Страница обновлена");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка.");
    } finally { setBusy(false); }
  };

  return (
    <section className="publication-controls" aria-label="Публичная страница">
      {checking ? (
        <p className="muted" role="status">Проверяем публикацию…</p>
      ) : owned ? (
        <>
          <div className="publication-state"><Check size={17} aria-hidden="true" /> Страница опубликована</div>
          <Field>
            <FieldLabel htmlFor="published-url">Ссылка на страницу</FieldLabel>
            <Input id="published-url" value={url} readOnly onFocus={event => event.target.select()} />
          </Field>
          <Button type="button" disabled={busy} onClick={() => void copy(url, "Ссылка скопирована")}>
            <Copy data-icon="inline-start" /> Скопировать ссылку
          </Button>
          <div className="publication-buttons">
            <Button type="button" variant="outline" disabled={busy || !title.trim()} onClick={() => void invoke("PUT")}>
              <RefreshCcw data-icon="inline-start" /> Обновить страницу
            </Button>
            <Button type="button" variant="ghost" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink data-icon="inline-start" /> Открыть</a>
            </Button>
          </div>
          <p className="muted">Изменения в редакторе появятся по этой ссылке только после обновления публикации.</p>
          <details className="publication-advanced">
            <summary>Управление публикацией</summary>
            <Field>
              <FieldLabel htmlFor="publication-update-title">Название страницы</FieldLabel>
              <Input id="publication-update-title" value={title} maxLength={140} disabled={busy} onChange={e => setTitle(e.target.value)} />
            </Field>
            <p className="muted">Чтобы сохранить доступ на другом устройстве, сохраните ключ управления отдельно.</p>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void copy(owned.managerKey, "Ключ управления скопирован")}>
              <Copy data-icon="inline-start" /> Скопировать ключ управления
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void invoke("DELETE")}>
              <Trash2 data-icon="inline-start" /> Снять с публикации
            </Button>
          </details>
        </>
      ) : (
        <>
          <div className="publication-title"><Globe2 size={19} aria-hidden="true" /><strong>Опубликовать страницу</strong></div>
          <p className="muted">Создайте короткую ссылку на документ. Любой, кому вы отправите её, сможет просмотреть страницу.</p>
          <Field>
            <FieldLabel htmlFor="publication-title">Название страницы</FieldLabel>
            <Input id="publication-title" value={title} maxLength={140} disabled={busy} onChange={e => setTitle(e.target.value)} />
          </Field>
          <details className="publication-advanced">
            <summary>Настроить адрес (необязательно)</summary>
            <Field>
              <FieldLabel htmlFor="publication-slug">Имя в адресе (латиница)</FieldLabel>
              <Input id="publication-slug" value={slug} maxLength={40} disabled={busy} onChange={e => setSlug(slugify(e.target.value))} />
            </Field>
          </details>
          {needsCode && (
            <Field>
              <FieldLabel htmlFor="publication-access">Код доступа к публикации</FieldLabel>
              <Input ref={accessRef} id="publication-access" value={accessKey}
                onChange={e => setAccessKey(e.target.value)} type="password" autoComplete="off"
                disabled={busy} placeholder="Введите код владельца" />
              <p className="muted">Код нужен при первом создании страницы. В этой вкладке повторно вводить его не придётся.</p>
            </Field>
          )}
          <Button type="button" disabled={busy || !title.trim()} onClick={() => void invoke("POST")}>
            <Globe2 data-icon="inline-start" /> {busy ? "Публикуем…" : "Опубликовать"}
          </Button>
          <details className="publication-advanced publication-recovery">
            <summary>Уже публиковали эту страницу?</summary>
            <p className="muted">Если вы сменили браузер, восстановите управление с помощью ссылки и резервного ключа.</p>
            <Field>
              <FieldLabel htmlFor="publication-recover-url">Ссылка или ID страницы</FieldLabel>
              <Input id="publication-recover-url" value={restoreUrl} disabled={busy}
                onChange={e => setRestoreUrl(e.target.value)} placeholder="https://ipos-plan.vercel.app/p/…" />
            </Field>
            <Field>
              <FieldLabel htmlFor="publication-recover-key">Ключ управления</FieldLabel>
              <Input id="publication-recover-key" type="password" autoComplete="off" value={restoreKey}
                disabled={busy} onChange={e => setRestoreKey(e.target.value)} />
            </Field>
            <Button type="button" variant="outline" disabled={busy || !restoreUrl.trim() || !restoreKey.trim()}
              onClick={() => void restore()}>Восстановить управление</Button>
          </details>
        </>
      )}
      {error && <p role="alert" className="publication-error">{error}</p>}
    </section>
  );
}
