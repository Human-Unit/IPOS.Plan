"use client";
import { useState } from "react";
import { Copy, ExternalLink, Globe2, Link2 } from "lucide-react";
import { toast } from "@/lib/notifications";
import type { PortablePlan } from "@/lib/schema/plan";
import { PublicationControls } from "./publication-controls";
import { Field, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogBody, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const [method, setMethod] = useState<"snapshot" | "publication" | null>(null);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="share-dialog">
        <DialogHeader>
          <DialogTitle><Link2 aria-hidden="true" /> Поделиться документом</DialogTitle>
          <DialogDescription className="sr-only">Выберите способ отправки плана.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="share-methods">
            <div>
              <Button type="button" variant="outline" aria-expanded={method === "snapshot"}
                aria-controls="share-snapshot" aria-describedby="share-snapshot-description"
                onClick={() => setMethod(method === "snapshot" ? null : "snapshot")}>
                <Link2 data-icon="inline-start" /> Ссылка на снимок
              </Button>
              <p id="share-snapshot-description">
                Документ внутри ссылки. Его можно просмотреть без публикации. Изменения не обновят снимок.
              </p>
            </div>
            <div>
              <Button type="button" variant="outline" aria-expanded={method === "publication"}
                aria-controls="share-publication" aria-describedby="share-publication-description"
                onClick={() => setMethod(method === "publication" ? null : "publication")}>
                <Globe2 data-icon="inline-start" /> Публичная страница
              </Button>
              <p id="share-publication-description">
                Короткая ссылка на страницу. Её может открыть любой, у кого есть ссылка. Страницу можно обновлять.
              </p>
            </div>
          </div>
          <div id="share-publication" className="share-method-panel" hidden={method !== "publication"}>
            <PublicationControls plan={plan} planId={planId} />
          </div>
          <div id="share-snapshot" className="share-method-panel" hidden={method !== "snapshot"}>
            {url ? (
              <>
                <Field>
                  <FieldLabel htmlFor="share-url">Самодостаточная ссылка</FieldLabel>
                  <Textarea id="share-url" value={url} readOnly rows={3} onFocus={(event) => event.target.select()} />
                </Field>
                {url.length > 8000 && <p className="muted">Мессенджер может обрезать длинную ссылку. Для надёжной передачи используйте JSON.</p>}
                <div className="publication-buttons">
                  <Button type="button" variant="outline" onClick={() => {
                    void navigator.clipboard.writeText(url)
                      .then(() => toast.success("Ссылка скопирована"))
                      .catch(() => toast.error("Не удалось скопировать ссылку. Скопируйте её вручную из поля выше."));
                  }}><Copy data-icon="inline-start" /> Скопировать ссылку</Button>
                  <Button type="button" variant="ghost" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink data-icon="inline-start" /> Открыть
                    </a>
                  </Button>
                </div>
              </>
            ) : <p className="muted">Этот документ слишком большой для ссылки без публикации. Используйте публичную страницу или экспорт JSON.</p>}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
