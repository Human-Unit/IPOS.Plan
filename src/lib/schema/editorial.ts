import { z } from "zod";

export const publicationDateSchema = z.iso.date();

export const taskEditorialSchema = z.object({
  publicationDate: publicationDateSchema.optional(),
}).strict();

export const editorialSchema = z.record(z.string().min(1).max(100), taskEditorialSchema);
export type TaskEditorial = z.infer<typeof taskEditorialSchema>;
export type Editorial = z.infer<typeof editorialSchema>;
