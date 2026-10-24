"use client";
import Link from "next/link";
import type { TaskAssignment } from "@/lib/schema/task-assignment";
export function AssignedPeople({
  assignment,
  text,
  openPerson,
}: {
  assignment: TaskAssignment;
  text: string;
  openPerson?: (id: string) => void;
}) {
  return (
    <>
      <span className="assigned-people">
        {assignment.legacyText && <span>{assignment.legacyText} · </span>}
        {assignment.people.map((p, i) => (
          <span key={p.personId}>
            {i > 0 ? ", " : ""}
            <Link
              href={`/activists/${p.personId}`}
              onClick={(e) => {
                e.stopPropagation();
                if (openPerson) {
                  e.preventDefault();
                  openPerson(p.personId);
                }
              }}
            >
              {p.name}
            </Link>
          </span>
        ))}
      </span>
      <span className="print-assigned-people">{text}</span>
    </>
  );
}
