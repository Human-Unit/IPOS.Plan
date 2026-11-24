"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe2 } from "lucide-react";
import type { PortablePlan } from "@/lib/schema/plan";
import { PlanRenderer } from "@/components/plan/renderer";
import { Brand } from "@/components/plan/brand";
import { ThemeControl } from "@/components/theme/theme-control";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Page = { title: string; document: PortablePlan; updatedAt: string };
export function PublishedViewer({ id }: { id: string }) {
  const [page, setPage] = useState<Page>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/publications/" + encodeURIComponent(id), { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Не удалось открыть публикацию.");
        return data as Page;
      }).then(setPage).catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Не удалось открыть публикацию.");
      });
    return () => controller.abort();
  }, [id]);
  return (
    <>
      <header className="app-bar cobalt-reader-bar"><Brand /><div className="app-bar-tools"><span className="local-indicator"><Globe2 size={14} /> Опубликовано · только просмотр</span><ThemeControl /></div></header>
      <main className="viewer-stage">
        {error ? <div className="viewer-error"><h1>Страница недоступна</h1><p role="alert">{error}</p><Button variant="outline" asChild><Link href="/">К планам</Link></Button></div>
          : page ? <>
              <div className="preview-notice"><Globe2 size={16} aria-hidden="true" /> Публичная страница · изменения в редакторе не появятся до повторной публикации</div>
              <PlanRenderer key={id + page.updatedAt} plan={{ ...page.document, title: page.title }} showCover />
              <footer className="viewer-footer">IPOS.Plan · Опубликованный документ · Только просмотр</footer>
            </>
          : <div role="status" aria-label="Загружаем страницу"><Skeleton className="h-10 w-2/3" /><Skeleton className="mt-8 h-48 w-full" /></div>}
      </main>
    </>
  );
}
