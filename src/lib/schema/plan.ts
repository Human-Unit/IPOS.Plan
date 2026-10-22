import { z } from "zod";
import { taskSchema } from "./task";
import { inlineRasterSchema } from "./image-source";
export const SCHEMA_VERSION = 1;
export const MAX_JSON_BYTES = 1_000_000;
export const webUrl = z
  .string()
  .max(4000)
  .refine((value) => {
    try {
      const u = new URL(value);
      return (
        ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "Нужна ссылка http:// или https:// без логина и пароля");
const optionalUrl = z.union([z.literal(""), webUrl]);
export const imageSourceSchema = z.union([optionalUrl, inlineRasterSchema]);
const styles = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strike: z.boolean().optional(),
    code: z.boolean().optional(),
    textColor: z.string().max(40).optional(),
    backgroundColor: z.string().max(40).optional(),
  })
  .strict();
const text = z
  .object({ type: z.literal("text"), text: z.string().max(50000), styles })
  .strict();
const inline = z
  .array(
    z.union([
      text,
      z
        .object({
          type: z.literal("link"),
          href: webUrl,
          content: z.array(text),
        })
        .strict(),
    ]),
  )
  .max(2000);
const textProps = {
  textColor: z.string().max(40).optional(),
  backgroundColor: z.string().max(40).optional(),
  textAlignment: z.enum(["left", "center", "right", "justify"]).optional(),
};
const fontFamily = z
  .string()
  .trim()
  .max(120)
  .refine((value) => !/[;{}<>]/.test(value), "Недопустимое имя шрифта");
export const blockTypographySchema = z
  .object({
    fontFamily: fontFamily.optional(),
    fontSize: z.number().int().min(12).max(48).optional(),
    fontWeight: z.enum(["300", "400", "500", "600", "700", "800"]).optional(),
  })
  .strict();
export type BlockTypography = z.infer<typeof blockTypographySchema>;
export const fontSourceSchema = z
  .object({
    family: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(
        /^[a-zA-Z0-9 _-]+$/,
        "Используйте простое название семейства шрифта",
      ),
    url: webUrl.refine(
      (value) => value.startsWith("https://"),
      "Внешний шрифт должен загружаться по HTTPS",
    ),
  })
  .strict();
export type FontSource = z.infer<typeof fontSourceSchema>;
const fontSourcesSchema = z.array(fontSourceSchema).max(12).optional();

const typographySchema = z
  .record(z.string().min(1).max(100), blockTypographySchema)
  .optional();
const props = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    props: z.object(textProps).strict().optional(),
    content: inline.optional(),
  }),
  z.object({
    type: z.literal("bulletListItem"),
    props: z.object(textProps).strict().optional(),
    content: inline.optional(),
  }),
  z.object({
    type: z.literal("quote"),
    props: z.object(textProps).strict().optional(),
    content: inline.optional(),
  }),
  z.object({
    type: z.literal("numberedListItem"),
    props: z
      .object({ ...textProps, start: z.number().int().positive().optional() })
      .strict()
      .optional(),
    content: inline.optional(),
  }),
  z.object({
    type: z.literal("heading"),
    props: z
      .object({
        ...textProps,
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
        isToggleable: z.boolean().optional(),
      })
      .strict()
      .optional(),
    content: inline.optional(),
  }),
  z.object({
    type: z.literal("task"),
    props: z.object({ taskId: z.string().min(1).max(100) }).strict(),
  }),
  z.object({
    type: z.literal("reference"),
    props: z
      .object({
        url: optionalUrl,
        title: z.string().max(500),
        note: z.string().max(10000),
      })
      .strict(),
  }),
  z.object({
    type: z.literal("callout"),
    props: z.object({}).strict().optional(),
    content: inline.optional(),
  }),
  z.object({
    type: z.literal("divider"),
    props: z.object({}).strict().optional(),
  }),
  z.object({
    type: z.literal("image"),
    props: z
      .object({
        url: imageSourceSchema,
        caption: z.string().max(2000),
        ...textProps,
      })
      .strict(),
  }),
]);
export type Inline = z.infer<typeof inline>;
export type Block = z.infer<typeof props> & { id?: string; children?: Block[] };
export const blockSchema: z.ZodType<Block> = z.lazy(() =>
  z.intersection(
    props,
    z.object({
      id: z.string().min(1).max(100).optional(),
      children: z.array(blockSchema).max(1000).optional(),
    }),
  ),
);
export function flattenBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap((b) => [b, ...flattenBlocks(b.children ?? [])]);
}
export const portablePlanSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    title: z.string().trim().min(1).max(500),
    blocks: z.array(blockSchema).max(1000),
    tasks: z.record(z.string().min(1).max(100), taskSchema),
    typography: typographySchema,
    fontSources: fontSourcesSchema,
  })
  .strict()
  .superRefine((plan, ctx) => {
    const ids = new Set<string>();
    let total = 0;
    const visit = (blocks: Block[], depth: number) => {
      if (depth > 12) {
        ctx.addIssue({
          code: "custom",
          message: "Вложенность блоков превышает 12 уровней",
          path: ["blocks"],
        });
        return;
      }
      for (const b of blocks) {
        total++;
        if (b.id) {
          if (ids.has(b.id))
            ctx.addIssue({
              code: "custom",
              message: "Повторяющийся ID блока",
              path: ["blocks"],
            });
          ids.add(b.id);
        }
        if (b.type === "task" && !plan.tasks[b.props.taskId])
          ctx.addIssue({
            code: "custom",
            message: `Задача ${b.props.taskId} отсутствует`,
            path: ["tasks"],
          });
        visit(b.children ?? [], depth + 1);
      }
    };
    visit(plan.blocks, 1);
    if (total > 1000)
      ctx.addIssue({
        code: "custom",
        message: "Не более 1000 блоков",
        path: ["blocks"],
      });
    if (Object.keys(plan.tasks).length > 500)
      ctx.addIssue({
        code: "custom",
        message: "Не более 500 задач",
        path: ["tasks"],
      });
    for (const [key, task] of Object.entries(plan.tasks))
      if (key !== task.id)
        ctx.addIssue({
          code: "custom",
          message: "Ключ задачи должен совпадать с её id",
          path: ["tasks", key],
        });
    if (plan.fontSources) {
      const families = new Set<string>();
      for (const source of plan.fontSources) {
        const name = source.family.toLowerCase();
        if (families.has(name))
          ctx.addIssue({
            code: "custom",
            message: "Шрифт добавлен дважды",
            path: ["fontSources"],
          });
        families.add(name);
      }
    }
    if (plan.typography)
      for (const blockId of Object.keys(plan.typography))
        if (!ids.has(blockId))
          ctx.addIssue({
            code: "custom",
            message: "Настройка шрифта ссылается на отсутствующий блок",
            path: ["typography", blockId],
          });
  });
export type PortablePlan = z.infer<typeof portablePlanSchema>;
export const planSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    version: z.number().int().positive(),
    schemaVersion: z.literal(SCHEMA_VERSION),
    title: z.string(),
    blocks: z.array(blockSchema),
    tasks: z.record(z.string(), taskSchema),
    typography: typographySchema,
    fontSources: fontSourcesSchema,
  })
  .strict()
  .superRefine((plan, ctx) => {
    const result = portablePlanSchema.safeParse({
      schemaVersion: plan.schemaVersion,
      title: plan.title,
      blocks: plan.blocks,
      tasks: plan.tasks,
      typography: plan.typography,
      fontSources: plan.fontSources,
    });
    if (!result.success)
      for (const issue of result.error.issues)
        ctx.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
  });
export type Plan = PortablePlan & {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};
export function toPortable(plan: PortablePlan): PortablePlan {
  const taskIds = new Set(
    flattenBlocks(plan.blocks)
      .filter((b) => b.type === "task")
      .map((b) => b.props.taskId),
  );
  const blockIds = new Set(
    flattenBlocks(plan.blocks).flatMap((b) => (b.id ? [b.id] : [])),
  );
  const portable = portablePlanSchema.parse({
    schemaVersion: plan.schemaVersion,
    title: plan.title,
    blocks: plan.blocks,
    tasks: Object.fromEntries(
      Object.entries(plan.tasks).filter(([id]) => taskIds.has(id)),
    ),
    fontSources: plan.fontSources,
    typography: plan.typography
      ? Object.fromEntries(
          Object.entries(plan.typography).filter(([id]) => blockIds.has(id)),
        )
      : undefined,
  });
  if (
    new TextEncoder().encode(JSON.stringify(portable)).length > MAX_JSON_BYTES
  )
    throw new Error(
      "План больше 1 МБ. Сократите содержимое перед сохранением или экспортом.",
    );
  return portable;
}
