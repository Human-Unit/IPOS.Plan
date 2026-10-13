"use client";
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
          <DialogTitle>Поделиться снимком</DialogTitle>
          <DialogDescription>
            Ссылка содержит текущую копию плана. Дальнейшие изменения не обновят
            этот снимок. Получатель сможет только просматривать его.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertDescription>
            Любой, у кого есть ссылка, сможет открыть снимок. Данные плана
            находятся во фрагменте URL и не отправляются на сервер приложения.
            Изображения загружаются по указанным URL.
          </AlertDescription>
        </Alert>
        <Textarea aria-label="Ссылка на снимок" value={url} readOnly rows={4} />
        {url.length > 8000 && (
          <p className="muted">
            Длинную ссылку может обрезать мессенджер. Для надёжной передачи
            используйте JSON.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
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
            Копировать ссылку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
