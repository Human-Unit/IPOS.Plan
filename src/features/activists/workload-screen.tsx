"use client";
import Link from "next/link";
import { Brand } from "@/components/plan/brand";
import { Button } from "@/components/ui/button";
import { usePeople } from "./people-hooks";
import { WorkloadPanel } from "./workload-panel";
export function WorkloadScreen() {
  const { people, error } = usePeople();
  return (
    <>
      <header className="app-bar">
        <Brand />
        <Button asChild variant="ghost">
          <Link href="/activists">К активистам</Link>
        </Button>
      </header>
      <main className="people-page">
        <div className="people-heading">
          <div>
            <p className="panel-eyebrow">Медиасектор ИПОС</p>
            <h1>Нагрузка команды</h1>
            <p className="muted">
              По явным привязкам к сохранённым заданиям. Количество поручений
              помогает планированию, но не определяет занятость или ценность
              человека.
            </p>
          </div>
        </div>
        {error && (
          <p className="person-error" role="alert">
            {error}
          </p>
        )}
        <WorkloadPanel people={people} />
      </main>
    </>
  );
}
