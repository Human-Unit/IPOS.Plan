import { z } from "zod";
import type { Task } from "./task";

export const productionStages = ["idea", "assigned", "production", "editing", "review", "published"] as const;
export type ProductionStage = typeof productionStages[number];

export const stageLabels: Record<ProductionStage, string> = {
  idea: "Идея",
  assigned: "Назначено",
  production: "Производство",
  editing: "Монтаж",
  review: "На проверке",
  published: "Опубликовано",
};

export const stageStatus = {
  idea: "todo",
  assigned: "todo",
  production: "in_progress",
  editing: "in_progress",
  review: "review",
  published: "done",
} as const satisfies Record<ProductionStage, Task["status"]>;

export const publicationDateSchema = z.iso.date();

const reviewStates = ["draft", "in_review", "changes_requested", "approved"] as const;
const reviewCommands = ["submit", "request_changes", "approve", "feedback", "return_draft"] as const;
export type ReviewCommand = typeof reviewCommands[number];
export type ReviewState = typeof reviewStates[number];

export const reviewResult = {
  submit: "in_review",
  request_changes: "changes_requested",
  approve: "approved",
  return_draft: "draft",
  content_changed: "draft",
} as const satisfies Record<Exclude<ReviewCommand, "feedback"> | "content_changed", ReviewState>;

export const reviewSchema = z.object({
  state: z.enum(reviewStates),
  action: z.enum([...reviewCommands, "content_changed"]),
  updatedAt: z.iso.datetime(),
  feedback: z.string().trim().min(1).max(1200).optional(),
}).strict().refine((review) => {
  if (review.action === "feedback") {
    return Boolean(review.feedback) && ["in_review", "changes_requested"].includes(review.state);
  }
  if (review.action === "request_changes" && !review.feedback) return false;
  return reviewResult[review.action] === review.state;
}, "Решение не соответствует состоянию согласования");

export type TaskReview = z.infer<typeof reviewSchema>;

export const taskEditorialSchema = z.object({
  publicationDate: publicationDateSchema.optional(),
  stage: z.enum(productionStages).optional(),
  review: reviewSchema.optional(),
}).strict();

export const editorialSchema = z.record(z.string().min(1).max(100), taskEditorialSchema);
export type TaskEditorial = z.infer<typeof taskEditorialSchema>;
export type Editorial = z.infer<typeof editorialSchema>;
