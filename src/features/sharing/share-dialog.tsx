"use client";
import { toast } from "@/lib/notifications";
import type { PortablePlan } from "@/lib/schema/plan";
import { PublicationControls } from "./publication-controls";
import { Link2, LockKeyhole, ArrowUpRight, Copy } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage } from "@/lib/labels";
export function ShareDialog({
  url,
  onClose,
  plan,
  planId,
}: {
  url: string;
  onClose: () => void;
  plan: PortablePlan;
  planId: string;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Link2 aria-hidden="true" />
            Поделиться снимком
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            Ссылка содержит эту версию плана. Дальнейшие изменения не обновят
            снимок. Встроенные изображения включены; изображения по внешним
            ссылкам зависят от источника.
          </DialogDescription>
          <Alert className="snapshot-note">
            <LockKeyhole aria-hidden="true" />
            <AlertDescription>
              Получатель сможет только просматривать документ. Снимок доступен
              всем, кому вы передадите ссылку.
            </AlertDescription>
          </Alert>
          {url ? (
            <Field>
              <FieldLabel htmlFor="share-url">Самодостаточная ссылка на снимок</FieldLabel>
              <Textarea id="share-url" value={url} readOnly rows={3} />
            </Field>
          ) : <p className="muted">Для этого документа невозможно создать самодостаточную ссылку. Используйте публикацию страницы ниже или экспортируйте JSON.</p>}
          {url.length > 8000 && (
            <p className="muted">
              Длинную ссылку может обрезать мессенджер. Для надёжной передачи
              используйте JSON.
            </p>
          )}
          <PublicationControls plan={plan} planId={planId} />
        </DialogBody>
        <DialogFooter>
          {url && <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ArrowUpRight data-icon="inline-start" />
              Открыть снимок
            </a>
          </Button>}
          {url && <Button
            onClick={() => {
              void navigator.clipboard
                .writeText(url)
                .then(() => toast.success("Ссылка скопирована"))
                .catch((e) => toast.error(errorMessage(e)));
            }}
          >
            <Copy data-icon="inline-start" />
            Копировать ссылку
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
