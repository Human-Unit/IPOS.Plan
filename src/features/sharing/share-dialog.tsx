"use client";
import { toast } from "sonner";
import { Link2, LockKeyhole, ArrowUpRight, Copy } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage } from "@/lib/labels";
export function ShareDialog({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
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
          <DialogDescription>
            Ссылка содержит эту версию плана. Дальнейшие изменения не обновят
            снимок.
          </DialogDescription>
        </DialogHeader>
        <Alert className="snapshot-note">
          <LockKeyhole aria-hidden="true" />
          <AlertDescription>
            Получатель сможет только просматривать документ. Снимок доступен
            всем, кому вы передадите ссылку.
          </AlertDescription>
        </Alert>
        <Field>
          <FieldLabel htmlFor="share-url">Ссылка на снимок</FieldLabel>
          <Textarea id="share-url" value={url} readOnly rows={3} />
        </Field>
        {url.length > 8000 && (
          <p className="muted">
            Длинную ссылку может обрезать мессенджер. Для надёжной передачи
            используйте JSON.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ArrowUpRight data-icon="inline-start" />
              Открыть снимок
            </a>
          </Button>
          <Button
            onClick={() => {
              void navigator.clipboard
                .writeText(url)
                .then(() => toast.success("Ссылка скопирована"))
                .catch((e) => toast.error(errorMessage(e)));
            }}
          >
            <Copy data-icon="inline-start" />
            Копировать ссылку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
