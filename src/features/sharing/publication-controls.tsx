"use client";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, Globe2, RefreshCcw, Trash2 } from "lucide-react";
import type { PortablePlan } from "@/lib/schema/plan";
import { toast } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

type Owned = { id: string; managerKey: string };
const keyFor = (planId: string) => "ipos-publication:" + planId;

function readOwned(planId: string): Owned | null {
  try {
    const raw = localStorage.getItem(keyFor(planId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Owned;
    return typeof value.id === "string" && typeof value.managerKey === "string" ? value : null;
  } catch { return null; }
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [restoreUrl, setRestoreUrl] = useState("");
  const [restoreKey, setRestoreKey] = useState("");
  useEffect(() => {
    const saved = readOwned(planId);
    setOwned(saved);
    setChecking(false);
  }, [planId]);

  const restore = async () => {
    setBusy(true); setError("");
    try {
      const value = restoreUrl.trim();
      const id = value.includes("/p/") ? value.split("/p/").pop()?.split(/[?#]/)[0] || "" : value;
      if (!/^[a-z0-9-]{5,90}$/.test(id)) throw new Error("Укажите адрес или ID страницы.");
      const response = await fetch("/api/publications/" + encodeURIComponent(id) + "/verify", {
        method: "POST", headers: { "x-ipos-manager-key": restoreKey }, cache: "no-store"
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
  const url = owned ? `${typeof location === "undefined" ? "" : location.origin}/p/${owned.id}` : "";
  const invoke = async (method: "POST" | "PUT" | "DELETE") => {
    if (busy) return;
    if (method === "DELETE" && !confirm("Снять страницу с публикации? Отправленная ссылка перестанет работать.")) return;
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
        setOwned(next); setAccessKey("");
        toast.success("Страница опубликована");
      } else if (method === "DELETE") {
        localStorage.removeItem(keyFor(planId)); setOwned(null);
        toast.success("Страница снята с публикации");
      } else {
        toast.success("Публикация обновлена");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка.");
    } finally { setBusy(false); }
  };

  return <section className="publication-controls" aria-label="Публикация в интернете">
    <div className="publication-title"><Globe2 size={17} aria-hidden="true" /><strong>Короткая публичная страница</strong></div>
    <p className="muted">Публикация создаёт онлайн-копию документа. Её сможет открыть любой, у кого есть ссылка. Локальный план не отправляется автоматически при редактировании.</p>
    <Field>
      <FieldLabel htmlFor="publication-title">Название страницы</FieldLabel>
      <Input id="publication-title" value={title} maxLength={140} disabled={busy} onChange={e => setTitle(e.target.value)} />
    </Field>
    {!owned && <Field>
      <FieldLabel htmlFor="publication-slug">Имя в адресе (латиница)</FieldLabel>
      <Input id="publication-slug" value={slug} maxLength={40} disabled={busy} onChange={e => setSlug(slugify(e.target.value))} />
    </Field>}
    {checking ? <p className="muted">Проверяем опубликованные страницы…</p> : owned ? <>
      <Field><FieldLabel htmlFor="published-url">Адрес опубликованной страницы</FieldLabel><Input id="published-url" value={url} readOnly /></Field>
      <div className="publication-buttons">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success("Ссылка скопирована")).catch(() => setError("Не удалось скопировать ссылку."))}><Copy data-icon="inline-start" /> Скопировать</Button>
        <Button type="button" variant="outline" asChild><a href={url} rel="noopener noreferrer" target="_blank"><ExternalLink data-icon="inline-start" /> Открыть</a></Button>
        <Button type="button" disabled={busy || !title.trim()} onClick={() => void invoke("PUT")}><RefreshCcw data-icon="inline-start" /> Обновить страницу</Button>
        <Button type="button" variant="destructive" disabled={busy} onClick={() => void invoke("DELETE")}><Trash2 data-icon="inline-start" /> Снять с публикации</Button>
      </div>
      <p className="muted">Адрес сохраняется после обновления. Ключ управления хранится только в этом браузере. При удалении данных сайта вы можете потерять возможность обновлять и удалять эту страницу.</p>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => void navigator.clipboard.writeText(owned.managerKey).then(() => toast.success("Ключ управления скопирован")).catch(() => setError("Не удалось скопировать ключ."))}>Скопировать резервный ключ управления</Button>
    </> : <>
      <Field>
        <FieldLabel htmlFor="publication-access">Код публикации</FieldLabel>
        <Input id="publication-access" value={accessKey} onChange={e => setAccessKey(e.target.value)} type="password" autoComplete="off" disabled={busy} placeholder="Код владельца IPOS.Plan" />
      </Field>
      <Button type="button" disabled={busy || !accessKey || !title.trim()} onClick={() => void invoke("POST")}><Globe2 data-icon="inline-start" /> Опубликовать страницу</Button>
      <p className="muted">Код защищает публикацию от посторонних загрузок. Сохраните резервный ключ управления отдельно, чтобы позже обновлять или удалять страницу с другого устройства.</p>
      <details className="publication-recovery">
        <summary>У меня уже есть ссылка и ключ управления</summary>
        <Field><FieldLabel htmlFor="publication-recover-url">Ссылка или ID опубликованной страницы</FieldLabel>
          <Input id="publication-recover-url" value={restoreUrl} disabled={busy} onChange={e => setRestoreUrl(e.target.value)} placeholder="https://ipos-plan.vercel.app/p/…" />
        </Field>
        <Field><FieldLabel htmlFor="publication-recover-key">Резервный ключ управления</FieldLabel>
          <Input id="publication-recover-key" type="password" autoComplete="off" value={restoreKey} disabled={busy} onChange={e => setRestoreKey(e.target.value)} />
        </Field>
        <Button type="button" variant="outline" disabled={busy || !restoreUrl.trim() || !restoreKey.trim()} onClick={() => void restore()}>
          Восстановить управление
        </Button>
      </details>
    </>}
    {error && <p role="alert" className="publication-error">{error}</p>}
  </section>;
}
