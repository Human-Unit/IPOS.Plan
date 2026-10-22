"use client";
import { toast } from "sonner";
import { useState } from "react";
import { FileDown, Braces, Download, Copy } from "lucide-react";
import { exportPlanDocx, DOCX_TYPE } from "./docx";
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
  const [exporting, setExporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileStem =
    plan.title.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 80) || "IPOS_Plan";
  const downloadDocx = async () => {
    setExporting(true);
    setWarnings([]);
    try {
      const output = await exportPlanDocx(toPortable(plan));
      const copy = new Uint8Array(output.bytes.byteLength);
      copy.set(output.bytes);
      const url = URL.createObjectURL(new Blob([copy], { type: DOCX_TYPE }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileStem}.docx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setWarnings(output.warnings);
      toast.success("DOCX подготовлен");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileStem}.json`;
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
          <DialogTitle>
            <FileDown aria-hidden="true" />
            Экспорт документа
          </DialogTitle>
          <DialogDescription>
            Передайте готовый документ коллегам или сохраните резервную копию
            плана.
          </DialogDescription>
        </DialogHeader>
        <section className="export-format" aria-labelledby="word-export-title">
          <div className="export-format-header">
            <FileDown aria-hidden="true" />
            <h3 id="word-export-title">Редактируемый Word</h3>
          </div>
          <p>
            Документ A4 с текстом, ссылками и изображениями. Для точного
            оформления выбранные шрифты должны быть установлены в Word.
            Недоступные изображения сохранятся ссылками.
          </p>
          <Button onClick={() => void downloadDocx()} disabled={exporting}>
            <FileDown data-icon="inline-start" />{" "}
            {exporting ? "Подготовка..." : "Скачать .docx"}
          </Button>
        </section>
        {warnings.length > 0 && (
          <p role="status" className="export-notice">
            {warnings.join(" ")}
          </p>
        )}
        <section className="export-format" aria-labelledby="json-export-title">
          <div className="export-format-header">
            <Braces aria-hidden="true" />
            <h3 id="json-export-title">Резервная копия JSON</h3>
          </div>
          <p>
            Сохраняет блоки, задачи, шрифты и встроенные изображения для
            повторного импорта в IPOS.Plan. План ограничен 1 МБ; JSON надёжнее
            длинной ссылки.
          </p>
          <Textarea
            aria-label="JSON для экспорта"
            value={json}
            readOnly
            rows={5}
          />
        </section>
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
            <Copy data-icon="inline-start" />
            Копировать JSON
          </Button>
          <Button variant="outline" onClick={download}>
            <Download data-icon="inline-start" />
            Скачать .json
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
