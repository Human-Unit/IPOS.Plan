import { db } from "@/lib/db/database";
import { templateValueSchema } from "@/features/backup/backup";
import {
  findEditorNode,
  projectBriefs,
  serializeBriefs,
} from "@/components/editor/brief-document";
import {
  flattenBlocks,
  toPortable,
  type Block,
  type PortablePlan,
} from "@/lib/schema/plan";
export type BriefTemplate = {
  id: string;
  name: string;
  plan: PortablePlan;
  custom?: boolean;
};
const sections: [string, string[]][] = [
  [
    "Reels",
    [
      "Идея",
      "Сценарий",
      "Актёры и участники",
      "Требования к съёмке",
      "Требования к монтажу",
    ],
  ],
  [
    "Instagram carousel",
    [
      "Цель и аудитория",
      "Первый слайд — главный тезис",
      "Содержание слайдов",
      "Визуальный стиль",
      "Призыв к действию",
    ],
  ],
  [
    "Instagram Stories",
    [
      "Задача серии",
      "Кадры и порядок",
      "Текст и интерактив",
      "Вертикальный формат и безопасные зоны",
    ],
  ],
  [
    "Poster / Graphic Design",
    [
      "Цель",
      "Главный заголовок",
      "Обязательный текст",
      "Визуальные требования",
      "Размеры и форматы",
      "Материалы бренда",
    ],
  ],
  [
    "Interview",
    [
      "Тема и герой",
      "Вопросы",
      "Локация и согласование",
      "Звук и съёмка",
      "Цитаты и проверка фактов",
      "Формат результата",
    ],
  ],
  [
    "Photography",
    [
      "Событие и цель",
      "Обязательные кадры",
      "Место и время съёмки",
      "Технические требования",
      "Отбор и обработка",
      "Формат передачи",
    ],
  ],
];
export const builtInTemplates: BriefTemplate[] = sections.map(
  ([name, headings], i) => ({
    id: `builtin-${i}`,
    name,
    plan: {
      schemaVersion: 1,
      title: name,
      tasks: {
        template: {
          id: "template",
          title: name,
          description: "",
          status: "todo",
          priority: "medium",
        },
      },
      blocks: [
        {
          id: "brief",
          type: "task",
          props: { taskId: "template" },
          children: [
            ...headings.flatMap((text, j): Block[] => [
              {
                id: `section-${j}`,
                type: "heading",
                props: { level: 3 },
                content: [{ type: "text", text, styles: {} }],
              },
              {
                id: `prompt-${j}`,
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `Уточните: ${text.toLocaleLowerCase("ru")}.`,
                    styles: {},
                  },
                ],
              },
            ]),
            {
              id: "ref",
              type: "reference",
              props: {
                title: "Референсы",
                url: "",
                note: "Добавьте пример и поясните, что использовать.",
              },
            },
          ],
        },
      ],
    },
  }),
);
function clean(plan: PortablePlan, personal: boolean): PortablePlan {
  return toPortable({
    ...plan,
    tasks: Object.fromEntries(
      Object.entries(plan.tasks).map(([id, t]) => [
        id,
        personal
          ? t
          : { ...t, assignee: undefined, deadline: undefined, status: "todo" },
      ]),
    ),
  });
}
export function extractTemplate(
  plan: PortablePlan,
  blockId: string,
  personal = false,
): PortablePlan {
  const node = findEditorNode(projectBriefs(plan.blocks), blockId);
  if (!node || node.type !== "brief")
    throw new Error("Выберите задачу для шаблона.");
  const blocks = serializeBriefs([node]);
  const ids = new Set(flattenBlocks(blocks).map((b) => b.id));
  return clean(
    {
      ...plan,
      title: plan.tasks[String(node.props?.taskId)].title || "Шаблон",
      blocks,
      typography: plan.typography
        ? Object.fromEntries(
            Object.entries(plan.typography).filter(([id]) => ids.has(id)),
          )
        : undefined,
    },
    personal,
  );
}
export function instantiateTemplate(
  source: PortablePlan,
  personal = false,
  uid = () => crypto.randomUUID(),
): PortablePlan {
  const plan = clean(source, personal);
  const taskIds = new Map(Object.keys(plan.tasks).map((id) => [id, uid()]));
  const blockIds = new Map<string, string>();
  const copy = (b: Block): Block => {
    const id = uid();
    if (b.id) blockIds.set(b.id, id);
    return {
      ...b,
      id,
      ...(b.type === "task"
        ? { props: { taskId: taskIds.get(b.props.taskId)! } }
        : {}),
      ...(b.children ? { children: b.children.map(copy) } : {}),
    } as Block;
  };
  const blocks = plan.blocks.map(copy);
  return toPortable({
    ...plan,
    blocks,
    tasks: Object.fromEntries(
      Object.entries(plan.tasks).map(([id, t]) => [
        taskIds.get(id)!,
        { ...t, id: taskIds.get(id)! },
      ]),
    ),
    typography: plan.typography
      ? Object.fromEntries(
          Object.entries(plan.typography).map(([id, v]) => [
            blockIds.get(id)!,
            v,
          ]),
        )
      : undefined,
  });
}
export async function saveTemplate(
  name: string,
  plan: PortablePlan,
  personal = false,
) {
  const value = templateValueSchema.parse({
    name,
    createdAt: new Date().toISOString(),
    plan: clean(plan, personal),
  });
  const key = `task-template:${crypto.randomUUID()}`;
  if (
    (await db.settings
      .filter((s) => s.key.startsWith("task-template:"))
      .count()) >= 500
  )
    throw new Error("Не более 500 локальных шаблонов.");
  await db.settings.add({ key, value });
  return key;
}
export async function loadTemplates(): Promise<BriefTemplate[]> {
  const rows = await db.settings
    .filter((s) => s.key.startsWith("task-template:"))
    .toArray();
  return rows.flatMap((row) => {
    const parsed = templateValueSchema.safeParse(row.value);
    return parsed.success
      ? [
          {
            id: row.key,
            name: parsed.data.name,
            plan: parsed.data.plan,
            custom: true,
          },
        ]
      : [];
  });
}
