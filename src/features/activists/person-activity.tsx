"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/database";
import { formatDate } from "@/lib/labels";
import { personEvents } from "./workload";
export function PersonActivity({ personId }: { personId: string }) {
  const activity = useLiveQuery(() => db.activity.toArray());
  const events = personEvents(activity ?? [], personId);
  return (
    <section className="workload-section">
      <h2>События назначений</h2>
      <p className="people-footnote">
        Только сохранённые события с явными ID участников. Старые текстовые
        записи не приписываются человеку по имени. Удаление плана удаляет и его
        локальную историю.
      </p>
      {!events.length && (
        <p className="people-empty">
          Событий с подтверждённой привязкой пока нет.
        </p>
      )}
      <ol className="activity-list">
        {events.slice(0, 30).map((e) => (
          <li key={e.id}>
            <span>{e.message}</span>
            <time dateTime={e.createdAt}>{formatDate(e.createdAt)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
