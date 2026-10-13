"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="document-shell">
      <div className="viewer-error">
        <h1>Не удалось открыть приложение</h1>
        <p>
          Проверьте, разрешено ли хранение данных в браузере, и повторите
          попытку.
        </p>
        <Button onClick={reset}>Повторить</Button>
      </div>
    </main>
  );
}
