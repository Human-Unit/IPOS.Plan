import { projectBriefs, type EditorNode } from "@/components/editor/brief-document";
import { confirmedAssignment } from "@/features/activists/task-assignments";
import { reviewResult, reviewSchema, type Editorial, type ReviewCommand, type ReviewState, type TaskReview } from "@/lib/schema/editorial";
import type { Plan } from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
import { setTaskEditorial, taskEditorial } from "./metadata";

export const reviewLabels: Record<ReviewState, string> = {
  draft: "Черновик",
  in_review: "На согласовании",
  changes_requested: "Нужны правки",
  approved: "Одобрено",
};

export const reviewActions = {
  draft: ["submit"],
  in_review: ["feedback", "request_changes", "approve", "return_draft"],
  changes_requested: ["feedback", "submit", "return_draft"],
  approved: ["return_draft"],
} as const satisfies Record<ReviewState, readonly ReviewCommand[]>;

export function publicationReady(task: Task, review?: TaskReview) {
  return task.status !== "cancelled" && review?.state === "approved";
}

export function applyReview(plan: Plan, taskId: string, action: ReviewCommand, text = "", at = new Date().toISOString()) {
  if (!Object.hasOwn(plan.tasks, taskId)) throw new Error("Задача не найдена.");
  if (plan.tasks[taskId].status === "cancelled") throw new Error("Отменённую задачу нужно возобновить перед согласованием.");
  const previous = taskEditorial(plan, taskId)?.review;
  const state = previous?.state ?? "draft";
  if (!reviewActions[state].some((allowed) => allowed === action)) {
    throw new Error("Состояние согласования изменилось. Проверьте текущий этап.");
  }
  const feedback = text.trim();
  if ((action === "feedback" || action === "request_changes") && !feedback) {
    throw new Error("Укажите обратную связь.");
  }
  return setTaskEditorial(plan, taskId, { review: reviewSchema.parse({
    state: action === "feedback" ? state : reviewResult[action],
    action,
    updatedAt: at,
    feedback: feedback || previous?.feedback,
  }) });
}

function briefContent(plan: Plan, relevantIds: Set<string>) {
  const briefByTask = new Map<string, EditorNode[]>();
  function visit(nodes: readonly EditorNode[]) {
    for (const node of nodes) {
      const taskId = node.props?.taskId;
      if (node.type === "brief" && typeof taskId === "string" && relevantIds.has(taskId)) {
        const grouped = briefByTask.get(taskId) ?? [];
        grouped.push(node);
        briefByTask.set(taskId, grouped);
      }
      if (node.children) visit(node.children);
    }
  }
  visit(projectBriefs(plan.blocks));
  return briefByTask;
}

function taskContent(plan: Plan, taskId: string) {
  const task = plan.tasks[taskId];
  const personIds = confirmedAssignment(plan, taskId)?.people.map((person) => person.personId) ?? [];
  return JSON.stringify([task.title, task.description ?? "", task.assignee ?? "", task.priority, personIds]);
}

function sameReview(previous: TaskReview | undefined, current: TaskReview | undefined) {
  return previous?.state === current?.state && previous?.action === current?.action
    && previous?.feedback === current?.feedback && previous?.updatedAt === current?.updatedAt;
}

export function invalidateEditedReviews(previous: Plan, next: Plan) {
  if (!next.editorial || (previous.blocks === next.blocks && previous.tasks === next.tasks && previous.assignments === next.assignments)) return next;
  const affected = Object.entries(next.editorial).filter(([id, details]) =>
    (details.review?.state === "approved" || details.review?.state === "in_review")
    && Object.hasOwn(previous.tasks, id) && Object.hasOwn(next.tasks, id)
    && sameReview(taskEditorial(previous, id)?.review, details.review),
  );
  if (!affected.length) return next;
  const ids = new Set(affected.map(([id]) => id));
  const blockEdit = previous.blocks !== next.blocks;
  const oldBriefs = blockEdit ? briefContent(previous, ids) : undefined;
  const newBriefs = blockEdit ? briefContent(next, ids) : undefined;
  let changed = next;
  for (const [id, details] of affected) {
    const oldBrief = oldBriefs?.get(id);
    const newBrief = newBriefs?.get(id);
    // Retain undo metadata when a brief is detached or reinserted.
    if (blockEdit && (!oldBrief || !newBrief)) continue;
    const contentsChanged = taskContent(previous, id) !== taskContent(next, id)
      || (blockEdit && JSON.stringify(oldBrief) !== JSON.stringify(newBrief));
    if (contentsChanged) {
      changed = setTaskEditorial(changed, id, {
        review: {
          state: "draft",
          action: "content_changed",
          updatedAt: new Date().toISOString(),
          feedback: details.review?.feedback,
        },
      });
    }
  }
  return changed;
}

export function withoutReviews(editorial?: Editorial): Editorial | undefined {
  if (!editorial) return undefined;
  return Object.fromEntries(
    Object.entries(editorial).map(([id, details]) => [id, { ...details, review: undefined }]),
  );
}

export function reviewEvents(previous: Plan, next: Plan) {
  return Object.entries(next.editorial ?? {}).flatMap(([taskId, details]) => {
    const review = details.review;
    if (!review || sameReview(taskEditorial(previous, taskId)?.review, review)) return [];
    const task = next.tasks[taskId];
    const people = confirmedAssignment(next, taskId)?.people ?? [];
    const label = review.action === "feedback" ? "Добавлена обратная связь"
      : review.action === "content_changed" ? "Согласование сброшено после изменения брифа"
      : "Согласование: " + reviewLabels[review.state];
    return [{
      type: "TASK_REVIEW_CHANGED",
      message: label + " · " + (task.title || "Задача без названия"),
      metadata: {
        taskId,
        identityVersion: 1,
        personIds: people.map((person) => person.personId),
        review: review.state,
        action: review.action,
        ...(review.feedback ? { feedback: review.feedback } : {}),
      },
    }];
  });
}
