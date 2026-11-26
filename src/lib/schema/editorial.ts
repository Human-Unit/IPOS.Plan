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

export const taskEditorialSchema = z.object({
  publicationDate: publicationDateSchema.optional(),
  stage: z.enum(productionStages).optional(),
}).strict();

export const editorialSchema = z.record(z.string().min(1).max(100), taskEditorialSchema);
export type TaskEditorial = z.infer<typeof taskEditorialSchema>;
export type Editorial = z.infer<typeof editorialSchema>;
