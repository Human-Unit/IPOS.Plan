"use client";
import { useId, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/database";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  assigneeNames, activistNameKey, directoryNames,
  rememberAssignees, ACTIVIST_PREFIX,
} from "./directory";

export function AssigneePicker({
  value, onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState("");
  const rows = useLiveQuery(
    () => db.settings.filter((row) => row.key.startsWith(ACTIVIST_PREFIX)).toArray(),
    [],
  );
  const names = directoryNames(rows ?? []);
  const assigned = new Set(assigneeNames(value).map(activistNameKey));
  const tail = value.split(/[,;\n]/).at(-1)?.trim() ?? "";
  const candidates = names
    .filter((name) => !assigned.has(activistNameKey(name)))
    .filter((name) => !tail || activistNameKey(name).includes(activistNameKey(tail)))
    .slice(0, 8);

  const addPerson = (name: string) => {
    const existing = assigneeNames(value);
    if (!existing.some((person) => activistNameKey(person) === activistNameKey(name))) {
      const next = [...existing.filter((part) => activistNameKey(part) !== activistNameKey(tail)), name].join(", ");
      onChange(next);
      void rememberAssignees(next).catch(() => setError("Не удалось сохранить имя в справочник."));
    }
    setError("");
  };

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>Ответственные</FieldLabel>
      <Input
        id={inputId}
        value={value}
        maxLength={200}
        placeholder="Например: Ислом, Амина"
        onChange={(event) => { onChange(event.target.value); setError(""); }}
        onBlur={(event) => {
          if (event.relatedTarget instanceof Element && event.relatedTarget.closest(".assignee-people")) return;
          void rememberAssignees(value).catch(() =>
            setError("Не удалось сохранить имена в справочник. Назначение остаётся в плане."),
          );
        }}
      />
      <p className="inspector-hint">
        Несколько человек — через запятую. Имена запоминаются после ввода и доступны в следующих планах.
      </p>
      {candidates.length > 0 && (
        <div className="assignee-people" role="group" aria-label="Добавить из сохранённых имён">
          {candidates.map((person) => (
            <button
              type="button"
              key={person}
              onClick={() => addPerson(person)}
              title={`Назначить: ${person}`}
            >+ {person}</button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="inspector-hint">{error}</p>}
    </Field>
  );
}
