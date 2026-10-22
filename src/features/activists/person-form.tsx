"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import {
  blankPerson,
  membershipLabels,
  specializationLabels,
  type Person,
  type PersonDraft,
} from "@/lib/schema/person";
import { createPerson, updatePerson } from "./people-repository";
import { errorMessage } from "@/lib/labels";
export function PersonForm({
  initial,
  initialName = "",
  onSaved,
  onCancel,
}: {
  initial?: Person;
  initialName?: string;
  onSaved: (p: Person) => void;
  onCancel: () => void;
}) {
  const fieldId = useId();
  const [draft, setDraft] = useState<PersonDraft>(() =>
    initial
      ? {
          displayName: initial.displayName,
          aliases: initial.aliases,
          role: initial.role,
          specializations: initial.specializations,
          membershipStatus: initial.membershipStatus,
          notes: initial.notes,
        }
      : { ...blankPerson, displayName: initialName },
  );
  const [aliases, setAliases] = useState(initial?.aliases.join("\n") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="person-form"
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        setError("");
        try {
          const input = {
            ...draft,
            aliases: aliases
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          };
          const saved = initial
            ? await updatePerson(initial.id, input, initial.version)
            : await createPerson(input);
          onSaved(saved);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <FieldSet disabled={busy} className="person-form-fields">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-name`}>Имя и фамилия</FieldLabel>
            <Input
              id={`${fieldId}-name`}
              required
              autoComplete="off"
              maxLength={80}
              value={draft.displayName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, displayName: e.target.value }))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-status`}>Членство</FieldLabel>
            <select
              id={`${fieldId}-status`}
              value={draft.membershipStatus}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  membershipStatus: e.target
                    .value as PersonDraft["membershipStatus"],
                }))
              }
            >
              {Object.entries(membershipLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <p className="search-hint">
            Кандидат не является подтверждённым активистом. Статус «Активист»
            устанавливается только вашим выбором.
          </p>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-role`}>Роль</FieldLabel>
            <Input
              id={`${fieldId}-role`}
              maxLength={120}
              placeholder="Например, оператор"
              value={draft.role}
              onChange={(e) =>
                setDraft((d) => ({ ...d, role: e.target.value }))
              }
            />
          </Field>
          <FieldSet className="person-specializations">
            <FieldLegend>Специализации</FieldLegend>
            {Object.entries(specializationLabels).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={draft.specializations.includes(
                    key as Person["specializations"][number],
                  )}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      specializations: e.target.checked
                        ? [
                            ...d.specializations,
                            key as Person["specializations"][number],
                          ]
                        : d.specializations.filter((s) => s !== key),
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </FieldSet>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-aliases`}>
              Другие написания имени
            </FieldLabel>
            <Textarea
              id={`${fieldId}-aliases`}
              maxLength={1700}
              rows={2}
              placeholder="Каждое написание — с новой строки"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-notes`}>
              Локальные заметки
            </FieldLabel>
            <Textarea
              id={`${fieldId}-notes`}
              maxLength={2000}
              rows={3}
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      {error && (
        <p role="alert" className="person-error">
          {error}
        </p>
      )}
      <div className="dialog-footer">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={busy || !draft.displayName.trim()}>
          {busy ? "Сохранение…" : "Сохранить профиль"}
        </Button>
      </div>
    </form>
  );
}
