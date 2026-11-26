"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/labels";
import type { ReviewCommand, TaskReview } from "@/lib/schema/editorial";
import type { Task } from "@/lib/schema/task";
import { publicationReady, reviewActions, reviewLabels } from "./review";

const actionLabels: Record<ReviewCommand, string> = {
  submit: "Отправить на согласование",
  request_changes: "Запросить правки",
  approve: "Одобрить",
  feedback: "Сохранить отзыв",
  return_draft: "Вернуть в черновик",
};

export function ReviewPanel({ task, review, onAction }: {
  task: Task;
  review?: TaskReview;
  onAction: (action: ReviewCommand, feedback?: string) => Promise<void>;
}) {
  const id = useId();
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const state = review?.state ?? "draft";
  const actions: readonly ReviewCommand[] = reviewActions[state];
  const ready = publicationReady(task, review);

  async function apply(action: ReviewCommand) {
    setBusy(true);
    setError("");
    try {
      await onAction(action, feedback);
      setFeedback("");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="task-approval">
      <summary>Редакционное согласование</summary>
      <div className="task-approval-body">
        <p role="status" className="task-approval-state" data-approved={ready || undefined}>{ready ? "Готово к публикации" : reviewLabels[state]}</p>
        <p className="inspector-hint">Решения хранятся в этом браузере. Они не отправляют уведомления и не публикуют документ.</p>
        {review?.action === "content_changed" && <p className="inspector-hint">Бриф изменился после проверки. Отправьте текущую версию на согласование.</p>}
        {review?.feedback && <p className="task-approval-feedback"><strong>Последняя обратная связь</strong><span>{review.feedback}</span></p>}
        {task.status === "cancelled" ? <p className="inspector-hint">Возобновите задачу через её статус, чтобы продолжить согласование.</p> :
          <>
            {(state === "in_review" || state === "changes_requested") && <label htmlFor={id}>
              Обратная связь
              <Textarea id={id} value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={1200} disabled={busy} />
            </label>}
            <div className="task-approval-actions">
              {actions.map((action) => (
                <Button key={action} type="button" variant={action === "submit" || action === "approve" ? "default" : "outline"}
                  disabled={busy || ((action === "feedback" || action === "request_changes") && !feedback.trim())}
                  onClick={() => void apply(action)}
                >
                  {actionLabels[action]}
                </Button>
              ))}
            </div>
          </>
        }
        {error && <p role="alert" className="person-error">{error}</p>}
      </div>
    </details>
  );
}
