"use client";
import { useRef, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { Archive, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/lib/notifications";
import { errorMessage, formatDate } from "@/lib/labels";
import {
  exportLibrary,
  parseBackup,
  restoreLibrary,
  MAX_BACKUP_BYTES,
  type LibraryBackup,
  type RestoreStrategy,
} from "./backup";

export function BackupMenu() {
  const file = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<LibraryBackup>();
  const [strategy, setStrategy] = useState<RestoreStrategy>("copies");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const download = async () => {
    setBusy(true);
    try {
      const data = await exportLibrary();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `ipos-library-${data.createdAt.slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Резервная копия скачана");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    if (!backup) return;
    setBusy(true);
    setError("");
    try {
      const r = await restoreLibrary(backup, strategy);
      setBackup(undefined);
      setResult(
        `Восстановлено планов: ${r.plans}; версий: ${r.revisions}; событий: ${r.activity}; настроек и шаблонов: ${r.settings}. Пропущено планов: ${r.skipped}. Исходные данные сохранены.`,
      );
    } catch (e) {
      const message =
        e instanceof Error &&
        (e.name.includes("QuotaExceeded") ||
          e.message.includes("QuotaExceeded"))
          ? "В браузере недостаточно места. Освободите место или восстановите копию в другом браузере."
          : errorMessage(e);
      setError(
        `${message} Восстановление отменено целиком. Исходные данные сохранены.`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" disabled={busy}>
            <Archive data-icon="inline-start" />
            Резервная копия
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="plan-actions-menu"
            align="end"
            sideOffset={8}
          >
            <DropdownMenu.Item onSelect={() => void download()}>
              <Download size={16} />
              Скачать все данные
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => file.current?.click()}>
              <Upload size={16} />
              Восстановить данные
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <input
        ref={file}
        hidden
        type="file"
        accept=".json,application/json"
        aria-label="Файл резервной копии"
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          e.target.value = "";
          if (!selected) return;
          setBusy(true);
          try {
            if (selected.size > MAX_BACKUP_BYTES)
              throw new Error("Резервная копия больше 50 МБ.");
            setBackup(parseBackup(await selected.text()));
            setStrategy("copies");
            setError("");
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
      {backup && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setBackup(undefined);
          }}
        >
          <DialogContent className="backup-dialog">
            <DialogHeader>
              <DialogTitle>Восстановить библиотеку?</DialogTitle>
              <DialogDescription>
                Копия от {formatDate(backup.createdAt)}. Планов:{" "}
                {backup.plans.length}; версий: {backup.revisions.length};
                событий: {backup.activity.length}; настроек и шаблонов:{" "}
                {backup.settings.length}.
              </DialogDescription>
            </DialogHeader>
            <div
              className="backup-dialog-body"
              role="region"
              aria-label="Условия восстановления"
              tabIndex={0}
            >
              <p className="muted">
                Существующие планы и история останутся. Ссылки на внешние
                изображения сохраняются без загрузки файлов. Копия содержит
                только сохранённые данные браузера.
              </p>
              <fieldset className="restore-strategies" disabled={busy}>
                <legend>Способ восстановления</legend>
                <label>
                  <input
                    type="radio"
                    name="restore"
                    checked={strategy === "copies"}
                    onChange={() => setStrategy("copies")}
                  />
                  Добавить новыми копиями (рекомендуется)
                </label>
                <label>
                  <input
                    type="radio"
                    name="restore"
                    checked={strategy === "skip"}
                    onChange={() => setStrategy("skip")}
                  />
                  Пропустить планы с совпадающими ID
                </label>
              </fieldset>
              <p className="muted">
                Новые копии получат новые ID; история будет связана с ними. При
                пропуске конфликтов их история тоже пропускается. Существующие
                настройки не заменяются.
              </p>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setBackup(undefined)}
              >
                Отмена
              </Button>
              <Button disabled={busy} onClick={() => void restore()}>
                {busy ? "Восстановление…" : "Подтвердить восстановление"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {result && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setResult("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Восстановление завершено</DialogTitle>
              <DialogDescription>{result}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setResult("")}>Готово</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
