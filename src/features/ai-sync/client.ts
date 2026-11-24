import { z } from "zod";
import { cloudPlanId, cloudPlanRecordSchema } from "@/lib/ai-workspace/model";

export const cloudPageSchema = z.strictObject({
  plans: z.array(z.strictObject({
    id: cloudPlanId,
    title: z.string(),
    version: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
  })).max(50),
  nextCursor: z.string().max(2000).nullable(),
});
export type CloudPage = z.infer<typeof cloudPageSchema>;

export class CloudRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function cloudRequest<T>(schema: z.ZodType<T>, path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, cache: "no-store", credentials: "same-origin" });
  const value: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(value);
    throw new CloudRequestError(response.status, error.data?.error ?? "Ошибка запроса к хранилищу.");
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error("Сервер вернул данные в неожиданном формате.");
  return parsed.data;
}

export const planPath = (id: string) => `/api/ai/plans/${encodeURIComponent(id)}`;

export async function readCloudPlan(id: string) {
  const record = await cloudRequest(cloudPlanRecordSchema, planPath(id));
  if (record.id !== id) throw new Error("Сервер вернул другой план.");
  return record;
}
