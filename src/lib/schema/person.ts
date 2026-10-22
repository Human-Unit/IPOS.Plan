import { z } from "zod";

export const membershipLabels = {
  candidate: "Кандидат",
  active: "Активист",
  inactive: "Неактивен",
} as const;
export const specializationLabels = {
  video: "Видео",
  design: "Дизайн",
  photography: "Фотография",
  copywriting: "Тексты",
  editing: "Монтаж",
  smm: "SMM",
  organization: "Организация",
} as const;
export const personNameSchema = z.string().trim().min(1).max(80);
export const personDraftSchema = z
  .object({
    displayName: personNameSchema,
    aliases: z
      .array(personNameSchema)
      .max(20)
      .refine((a) => new Set(a).size === a.length, "Псевдоним повторяется"),
    role: z.string().trim().max(120),
    specializations: z
      .array(
        z.enum([
          "video",
          "design",
          "photography",
          "copywriting",
          "editing",
          "smm",
          "organization",
        ]),
      )
      .max(7)
      .refine((a) => new Set(a).size === a.length, "Специализация повторяется"),
    membershipStatus: z.enum(["candidate", "active", "inactive"]),
    notes: z.string().max(2000),
  })
  .strict();
export const personSchema = personDraftSchema
  .extend({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    version: z.number().int().positive(),
    sourceKey: z
      .string()
      .regex(/^activist:[a-zA-Z0-9-]{1,100}$/)
      .optional(),
  })
  .strict();
export type Person = z.infer<typeof personSchema>;
export type PersonDraft = z.infer<typeof personDraftSchema>;
export const blankPerson: PersonDraft = {
  displayName: "",
  aliases: [],
  role: "",
  specializations: [],
  membershipStatus: "candidate",
  notes: "",
};
