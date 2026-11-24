import { z } from "zod";
import { portablePlanSchema } from "@/lib/schema/plan";

export const cloudPlanId = z.string().uuid();
export const cloudPlanRecordSchema = z.object({
  id: cloudPlanId,
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  document: portablePlanSchema,
}).strict();
export type CloudPlanRecord = z.infer<typeof cloudPlanRecordSchema>;

export function assertVersion(expected: number, actual: number) {
  if (!Number.isSafeInteger(expected) || expected < 1)
    throw new Error("Укажите корректную версию серверного плана.");
  if (actual !== expected)
    throw new Error("CONFLICT: План изменён на сервере. Загрузите актуальную версию.");
}
