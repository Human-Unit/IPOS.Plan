import { z } from "zod";
import { cloudPlanId } from "./model";

export const bindingSchema = z.strictObject({ id: cloudPlanId, version: z.number().int().positive() });
export type CloudBinding = z.infer<typeof bindingSchema>;
export const bindingKey = (localId: string) => `ai-sync:plan:${localId}`;
