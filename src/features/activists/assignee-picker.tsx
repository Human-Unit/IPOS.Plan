"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { membershipLabels, type Person } from "@/lib/schema/person";
import type { TaskAssignment } from "@/lib/schema/task-assignment";
import { normalizeSearch } from "@/features/plans/productivity";
import { errorMessage } from "@/lib/labels";
import { usePeople } from "./people-hooks";
import { PersonForm } from "./person-form";
import { makeAssignment } from "./task-assignments";

export function AssigneePicker({
  value,
  onChange,
  assignment,
  onApply,
  onOpenPerson,
}: {
  value: string;
  onChange: (value: string) => void;
  assignment?: TaskAssignment;
  onApply?: (
    assignment: TaskAssignment | undefined,
    textWhenEmpty: string,
  ) => void;
  onOpenPerson?: (id: string) => void;
}) {
  const inputId = useId();
  const { people: savedPeople, error: peopleError } = usePeople();
  const [created, setCreated] = useState<Person[]>([]);
  const people = [
    ...new Map([...savedPeople, ...created].map((p) => [p.id, p])).values(),
  ];
  const [selected, setSelected] = useState(
    assignment?.people.map((p) => p.personId) ?? [],
  );
  const [query, setQuery] = useState("");
  const legacyText = assignment?.legacyText ?? value;
  const [keepText, setKeepText] = useState(Boolean(legacyText));
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const candidates = people
    .filter((p) =>
      normalizeSearch([p.displayName, ...p.aliases].join(" ")).includes(
        normalizeSearch(query),
      ),
    )
    .slice(0, 30);
  const chosen = selected
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p));
  const preview = [
    keepText ? legacyText : "",
    ...chosen.map((p) => p.displayName),
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="people-picker">
      <Field>
        <FieldLabel htmlFor={inputId}>Ответственные</FieldLabel>
        <Input
          id={inputId}
          value={value}
          maxLength={200}
          placeholder="Имена или исходное назначение"
          onChange={(e) => {
            setSelected([]);
            setKeepText(true);
            onChange(e.target.value);
            setError("");
          }}
        />
        <p className="inspector-hint">
          Текст для документа. Ручная правка снимает локальные привязки;
          совпадение имени не назначает профиль автоматически.
        </p>
      </Field>
      {onApply && (
        <>
          <Field>
            <FieldLabel htmlFor={`${inputId}-people`}>Выбрать людей</FieldLabel>
            <Input
              id={`${inputId}-people`}
              type="search"
              placeholder="Имя или псевдоним…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <div
            className="person-picker-list"
            role="group"
            aria-label="Люди для назначения"
          >
            {candidates.map((p) => (
              <div key={p.id} className="person-picker-row">
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Назначить ${p.displayName} (${p.id.slice(0, 8)})`}
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids, p.id]
                          : ids.filter((id) => id !== p.id),
                      )
                    }
                  />
                  <span>
                    {p.displayName}
                    <small>
                      {p.role || membershipLabels[p.membershipStatus]} · ID{" "}
                      {p.id.slice(0, 8)}
                    </small>
                  </span>
                </label>
                <Link
                  aria-label={`Профиль: ${p.displayName} (${p.id.slice(0, 8)})`}
                  href={`/activists/${p.id}`}
                  onClick={(e) => {
                    if (onOpenPerson) {
                      e.preventDefault();
                      onOpenPerson(p.id);
                    }
                  }}
                >
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
          {!candidates.length && (
            <p className="inspector-hint">
              Нет подходящих людей. Можно создать отдельного кандидата.
            </p>
          )}
          {people.length > 30 && (
            <p className="inspector-hint">
              Показано до 30 профилей. Уточните поиск.
            </p>
          )}
          {!!selected.length && (
            <p className="inspector-hint">
              Выбрано:{" "}
              {chosen.map((p) => p.displayName).join(", ") ||
                "Профили недоступны"}
            </p>
          )}
          {legacyText && (
            <label className="person-keep-text">
              <input
                type="checkbox"
                checked={keepText}
                onChange={(e) => setKeepText(e.target.checked)}
              />
              Сохранить исходный текст: «{legacyText}»
            </label>
          )}
          <p className="inspector-hint">
            После применения: {preview || "Не назначены"}
          </p>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              try {
                if (chosen.length !== selected.length)
                  throw new Error(
                    "Один из выбранных профилей недоступен. Снимите выбор или обновите список.",
                  );
                onApply(
                  makeAssignment(chosen, keepText ? legacyText : ""),
                  keepText ? legacyText : "",
                );
                setError("");
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          >
            Применить назначение
          </Button>
          {!!assignment?.people.length && (
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                setSelected([]);
                setKeepText(Boolean(assignment.legacyText));
                onApply(undefined, assignment.legacyText);
              }}
            >
              Снять привязки людей
            </Button>
          )}
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? "Закрыть создание профиля" : "Добавить нового человека"}
          </Button>
          {adding && (
            <div className="inline-person-form">
              <p className="inspector-hint">
                Новый профиль, даже если такое имя уже есть. По умолчанию —
                кандидат.
              </p>
              <PersonForm
                initialName={query}
                onCancel={() => setAdding(false)}
                onSaved={(p) => {
                  setCreated((list) => [...list, p]);
                  setSelected((ids) => [...ids, p.id]);
                  setAdding(false);
                  setQuery("");
                }}
              />
            </div>
          )}
        </>
      )}
      {(error || peopleError) && (
        <p role="alert" className="person-error">
          {error || peopleError}
        </p>
      )}
    </div>
  );
}
