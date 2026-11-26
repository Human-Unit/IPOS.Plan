"use client";
import { EditorialHeader } from "@/components/plan/editorial-header";
import { usePeople } from "./people-hooks";
import { WorkloadPanel } from "./workload-panel";
export function WorkloadScreen() {
  const { people, error } = usePeople();
  return (
    <>
      <EditorialHeader backHref="/activists" backLabel="К активистам" />
      <main className="people-page">
        <div className="people-heading">
          <div>
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
