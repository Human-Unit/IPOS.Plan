"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { decodeShare } from "@/lib/share/codec";
import type { PortablePlan } from "@/lib/schema/plan";
import { errorMessage } from "@/lib/labels";
import { ThemeControl } from "@/components/theme/theme-control";
import { Brand } from "@/components/plan/brand";
import { PlanRenderer } from "@/components/plan/renderer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
export function ViewerScreen() {
  const [state, setState] = useState<{
    plan?: PortablePlan;
    error?: string;
    key?: string;
  }>({});
  useEffect(() => {
    let serial = 0;
    let mounted = true;
    const load = async () => {
      const request = ++serial;
      setState({});
      const token = new URLSearchParams(location.hash.slice(1)).get("p");
      if (!token) {
        setState({
          error:
            "В ссылке нет снимка плана. Попросите автора прислать полную ссылку.",
        });
        return;
      }
      try {
        const plan = await decodeShare(token);
        if (mounted && request === serial) setState({ plan, key: token });
      } catch (e) {
        if (mounted && request === serial) setState({ error: errorMessage(e) });
      }
    };
    void load();
    window.addEventListener("hashchange", load);
    return () => {
      mounted = false;
      window.removeEventListener("hashchange", load);
    };
  }, []);
  return (
    <>
      <header className="app-bar">
        <Brand />
        <div className="app-bar-tools"><span className="local-indicator">
          <LockKeyhole size={14} aria-hidden="true" />
          Только просмотр
        </span><ThemeControl /></div>
      </header>
      <main className="viewer-stage">
        {state.error ? (
          <div className="viewer-error">
            <h1>Не удалось открыть снимок</h1>
            <p role="alert">{state.error}</p>
            <Button variant="outline" asChild>
              <Link href="/">Мои планы</Link>
            </Button>
          </div>
        ) : state.plan ? (
          <>
            <div className="preview-notice">
              <LockKeyhole size={16} aria-hidden="true" />
              Снимок плана · изменения автора не обновляют эту копию
            </div>
            <PlanRenderer key={state.key} plan={state.plan} showCover />
            <footer className="viewer-footer">
              IPOS.Plan · Общий снимок · Только просмотр
            </footer>
          </>
        ) : (
          <div role="status" aria-label="Открываем снимок">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="mt-8 h-48 w-full" />
          </div>
        )}
      </main>
    </>
  );
}
