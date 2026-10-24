import { z } from "zod";
import { personNameSchema } from "./person";
export function assignmentText(value: {
  legacyText: string;
  people: { name: string }[];
}) {
  return [value.legacyText, ...value.people.map((p) => p.name)]
    .filter(Boolean)
    .join(", ");
}
export const taskAssignmentSchema = z
  .object({
    legacyText: z.string().max(200),
    people: z
      .array(z.object({ personId: z.uuid(), name: personNameSchema }).strict())
      .min(1)
      .max(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      new Set(value.people.map((p) => p.personId)).size !== value.people.length
    )
      ctx.addIssue({ code: "custom", message: "Человек назначен дважды" });
    if (assignmentText(value).length > 200)
      ctx.addIssue({
        code: "custom",
        message:
          "Имена и исходный текст превышают 200 символов. Сократите список или исходный текст.",
      });
  });
export const localAssignmentsSchema = z
  .record(z.string().min(1).max(100), taskAssignmentSchema)
  .refine(
    (v) => Object.keys(v).length <= 500,
    "Не более 500 назначений в плане",
  );
export type TaskAssignment = z.infer<typeof taskAssignmentSchema>;
export type LocalAssignments = z.infer<typeof localAssignmentsSchema>;
