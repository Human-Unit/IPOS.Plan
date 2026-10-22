"use client";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlanRenderer } from "@/components/plan/renderer";
import type { PortablePlan } from "@/lib/schema/plan";
import { errorMessage } from "@/lib/labels";
import { toast } from "@/lib/notifications";
import {
  builtInTemplates,
  instantiateTemplate,
  loadTemplates,
  saveTemplate,
} from "./templates";

export function TemplateDialog({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (plan: PortablePlan) => void;
}) {
  const custom = useLiveQuery(loadTemplates);
  const [id, setId] = useState(builtInTemplates[0].id);
  const [personal, setPersonal] = useState(false);
  const templates = [...builtInTemplates, ...(custom ?? [])];
  const selected = templates.find((t) => t.id === id) ?? templates[0];
  const preview = useMemo(
    () => instantiateTemplate(selected.plan, personal),
    [selected.plan, personal],
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="template-dialog">
        <DialogHeader>
          <DialogTitle>Задача из шаблона</DialogTitle>
          <DialogDescription>
            Выберите бриф и проверьте структуру. После вставки всё можно
            редактировать.
          </DialogDescription>
        </DialogHeader>
        <label className="template-field">
          Шаблон
          <select
            aria-label="Шаблон"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setPersonal(false);
            }}
          >
            <optgroup label="Готовые брифы">
              {builtInTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            {!!custom?.length && (
              <optgroup label="Мои шаблоны">
                {custom.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {selected.custom && (
          <label className="template-personal">
            <input
              type="checkbox"
              checked={personal}
              onChange={(e) => setPersonal(e.target.checked)}
            />
            Включить сохранённые исполнителей, даты и статус
          </label>
        )}
        <div className="template-preview" aria-label="Предпросмотр шаблона">
          <PlanRenderer key={`${selected.id}-${personal}`} plan={preview} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              try {
                onInsert(preview);
                onClose();
              } catch (e) {
                toast.error(errorMessage(e));
              }
            }}
          >
            Вставить задачу
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function SaveTemplateDialog({
  source,
  onClose,
}: {
  source: PortablePlan;
  onClose: () => void;
}) {
  const [name, setName] = useState(source.title.slice(0, 120));
  const [personal, setPersonal] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сохранить шаблон задачи</DialogTitle>
          <DialogDescription>
            Сохранятся весь бриф, требования, референсы, изображения и шрифты.
            Локальные шаблоны входят в резервную копию библиотеки.
          </DialogDescription>
        </DialogHeader>
        <label className="template-field">
          Название шаблона
          <Input
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="template-personal">
          <input
            type="checkbox"
            checked={personal}
            onChange={(e) => setPersonal(e.target.checked)}
          />
          Сохранить исполнителей, даты и статус
        </label>
        <p className="muted">
          По умолчанию эти поля очищаются. Текст и медиа остаются: проверьте их
          на личные сведения.
        </p>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await saveTemplate(name, source, personal);
                toast.success("Шаблон сохранён");
                onClose();
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Сохранить шаблон
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
