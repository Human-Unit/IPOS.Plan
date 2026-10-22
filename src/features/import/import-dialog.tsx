"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { PlanRenderer } from "@/components/plan/renderer";
import {
  flattenBlocks,
  MAX_JSON_BYTES,
  type PortablePlan,
} from "@/lib/schema/plan";
import { parseImport } from "@/lib/schema/import";
import { errorMessage } from "@/lib/labels";
export function ImportDialog({
  onClose,
  onConfirm,
  replacing = false,
}: {
  onClose: () => void;
  onConfirm: (plan: PortablePlan) => Promise<void>;
  replacing?: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<PortablePlan>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setSource = (value: string) => {
    setRaw(value);
    setPreview(undefined);
    setError("");
  };
  const blocks = preview ? flattenBlocks(preview.blocks) : [];
  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await onConfirm(preview);
      toast.success("План импортирован");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="wide-dialog">
        <DialogHeader>
          <DialogTitle>
            <Upload aria-hidden="true" />
            Импорт плана
          </DialogTitle>
          <DialogDescription>
            {replacing
              ? "После подтверждения текущий документ будет заменён. Перед заменой сохраним его версию."
              : "Загрузите JSON, включая планы 2026 года. Сначала проверим содержание и покажем документ; новый план появится после подтверждения."}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field className="file-import">
            <FieldLabel htmlFor="import-file">Файл .json · до 1 МБ</FieldLabel>
            <Input
              id="import-file"
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > MAX_JSON_BYTES)
                    throw new Error("Файл больше 1 МБ");
                  setSource(await file.text());
                } catch (e) {
                  setPreview(undefined);
                  setError(errorMessage(e));
                }
              }}
            />
          </Field>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="import-json">JSON плана</FieldLabel>
            <Textarea
              id="import-json"
              rows={7}
              value={raw}
              disabled={busy}
              aria-invalid={Boolean(error)}
              onChange={(e) => setSource(e.target.value)}
              placeholder={
                '{"schemaVersion": 1, "title": "Мой план", "blocks": [], "tasks": {}}'
              }
            />
            <FieldError>{error}</FieldError>
          </Field>
        </FieldGroup>
        {preview && (
          <>
            <dl className="import-summary">
              <div>
                <dt>Название</dt>
                <dd>{preview.title}</dd>
              </div>
              <div>
                <dt>Блоков</dt>
                <dd>{blocks.length}</dd>
              </div>
              <div>
                <dt>Задач</dt>
                <dd>{Object.keys(preview.tasks).length}</dd>
              </div>
              <div>
                <dt>Референсов</dt>
                <dd>{blocks.filter((b) => b.type === "reference").length}</dd>
              </div>
              <div>
                <dt>Схема</dt>
                <dd>{preview.schemaVersion}</dd>
              </div>
            </dl>
            <div className="import-preview">
              <PlanRenderer key={raw} plan={preview} showCover />
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          {preview ? (
            <Button disabled={busy} onClick={() => void confirm()}>
              {busy ? "Импорт…" : "Подтвердить импорт"}
            </Button>
          ) : (
            <Button
              disabled={!raw.trim() || busy}
              onClick={() => {
                try {
                  setPreview(parseImport(raw));
                  setError("");
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Проверить и посмотреть
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
