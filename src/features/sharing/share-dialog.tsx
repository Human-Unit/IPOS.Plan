"use client";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "@/lib/notifications";
import type { PortablePlan } from "@/lib/schema/plan";
import { PublicationControls } from "./publication-controls";
import { Field, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogBody, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><Link2 aria-hidden="true" /> Поделиться документом</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <PublicationControls plan={plan} planId={planId} />
          <details className="publication-advanced share-alternatives">
            <summary>Другой способ: ссылка без публикации</summary>
            <p className="muted">
              Ссылка содержит документ целиком. Он не загружается в интернет-хранилище,
              но ссылка может быть очень длинной. Получатель сможет только просматривать снимок.
            </p>
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
                      .catch((e) => toast.error(errorMessage(e)));
                  }}><Copy data-icon="inline-start" /> Скопировать</Button>
                  <Button type="button" variant="ghost" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink data-icon="inline-start" /> Открыть
                    </a>
                  </Button>
                </div>
              </>
            ) : <p className="muted">Этот документ слишком большой для ссылки без публикации. Используйте публичную страницу или экспорт JSON.</p>}
          </details>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
