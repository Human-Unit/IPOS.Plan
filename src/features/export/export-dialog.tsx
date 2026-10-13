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
import type { PortablePlan } from "@/lib/schema/plan";
import { toPortable } from "@/lib/schema/plan";
import { errorMessage } from "@/lib/labels";
export function ExportDialog({
  plan,
  onClose,
}: {
  plan: PortablePlan;
  onClose: () => void;
}) {
  const json = JSON.stringify(toPortable(plan), null, 2);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.title.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 80)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Экспорт JSON</DialogTitle>
          <DialogDescription>
            Переносимый файл плана. Его можно импортировать в этом приложении на
            другом устройстве.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label="JSON для экспорта"
          value={json}
          readOnly
          rows={12}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard
                .writeText(json)
                .then(() => toast.success("JSON скопирован"))
                .catch((e) => toast.error(errorMessage(e)));
            }}
          >
            Копировать JSON
          </Button>
          <Button onClick={download}>Скачать .json</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
