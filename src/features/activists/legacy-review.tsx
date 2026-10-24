"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db/database";
import { Button } from "@/components/ui/button";
import type { Person } from "@/lib/schema/person";
import { assignmentRows, suggestPeople } from "./workload";
import { taskHref } from "./task-assignments";
export function LegacyReview({ people }: { people: Person[] }) {
  const plans = useLiveQuery(() => db.plans.toArray());
  const unresolved = assignmentRows(plans ?? []).filter(
    (row) => !row.personIds.length && row.task.assignee?.trim(),
  );
  const [shown, setShown] = useState(20);
  return (
    <details className="legacy-review">
      <summary>Проверка текстовых назначений · {unresolved.length}</summary>
      <p className="people-footnote">
        Исходные строки не делятся на людей и не объединяются по похожему имени.
        Это может быть группа или несколько человек. Подсказка не создаёт
        привязку: откройте бриф, выберите профили и явно примените назначение.
        Другие написания добавляйте в профиле вручную.
      </p>
      {!unresolved.length && (
        <p className="people-empty">Нет текстовых назначений без профилей.</p>
      )}
      <ul className="legacy-review-list">
        {unresolved.slice(0, shown).map((row) => (
          <li key={`${row.planId}:${row.task.id}`}>
            <strong>{row.task.assignee}</strong>
            <small>
              {row.task.title} · {row.planTitle}
            </small>
            <div className="legacy-suggestions">
              {suggestPeople(row.task.assignee!, people).map((p) => (
                <Link key={p.id} href={`/activists/${p.id}`}>
                  Возможно: {p.displayName} · {p.id.slice(0, 8)}
                </Link>
              ))}
            </div>
            <Link href={taskHref(row.planId, row.task.id)}>
              Проверить в брифе
            </Link>
          </li>
        ))}
      </ul>
      {unresolved.length > shown && (
        <Button variant="ghost" onClick={() => setShown((n) => n + 20)}>
          Показать ещё строки
        </Button>
      )}
    </details>
  );
}
