import { z } from "zod";
export const statuses = [
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
] as const;
export const priorities = ["low", "medium", "high"] as const;
export const taskSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().max(500),
    description: z.string().max(10000).optional(),
    status: z.enum(statuses),
    assignee: z.string().max(200).optional(),
    deadline: z.iso.date().optional(),
    priority: z.enum(priorities),
  })
  .strict();
export type Task = z.infer<typeof taskSchema>;
