"use client";
import { useId } from "react";
import { usePlanContext } from "./plan-context";
import { planSummary } from "./document-structure";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

export function PlanInspector({
  onTitleChange,
  watermark,
  setWatermark,
}: {
  onTitleChange?: (title: string) => void;
  watermark: boolean;
  setWatermark?: (value: boolean) => void;
}) {
  const { plan } = usePlanContext();
  const id = useId();
  const { total, done, date, contact } = planSummary(plan);
  return (
    <div className="plan-inspector">
      <p className="panel-eyebrow">ПЛАН</p>
      <h2>Общий обзор</h2>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-title`}>Название</FieldLabel>
          <Input
            id={`${id}-title`}
            value={plan.title}
            maxLength={500}
            onChange={(event) => onTitleChange?.(event.target.value)}
          />
        </Field>
        {date && (
          <Field>
            <FieldLabel>Дата в названии</FieldLabel>
            <p className="plan-date">{date}</p>
          </Field>
        )}
      </FieldGroup>
      <dl className="plan-stats">
        <div>
          <dt>Задач</dt>
          <dd>{total}</dd>
        </div>
        <div>
          <dt>Готово</dt>
          <dd>{done}</dd>
        </div>
      </dl>
      <div className="inspector-appearance">
        <h3>Оформление</h3>
        <label className="watermark-toggle">
          <input
            type="checkbox"
            checked={watermark}
            onChange={(event) => setWatermark?.(event.target.checked)}
          />
          Водяной знак
        </label>
      </div>
      {contact && (
        <div className="inspector-contact">
          <h3>Контакт в документе</h3>
          <p>{contact}</p>
        </div>
      )}
      <p className="inspector-hint">
        Выберите задачу или референс в документе, чтобы открыть его свойства.
      </p>
    </div>
  );
}
