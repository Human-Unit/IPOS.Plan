import type { PortablePlan, Block } from "../../src/lib/schema/plan";
export function productivityFixture(origin: string): PortablePlan {
  const rows = [
    [
      "reels",
      "Reels — Один день студента",
      "Амина",
      "2026-10-21",
      "in_progress",
    ],
    ["poster", "Афиша — Осенний фестиваль", "Никита", "2026-10-22", "todo"],
    [
      "stories",
      "Stories — Вопросы первокурсников",
      "Малика",
      "2026-10-23",
      "review",
    ],
    ["photo", "Фотография — Репортаж с кампуса", "Амина", "2026-10-26", "todo"],
    [
      "interview",
      "Интервью — Студенческий совет",
      "Даврон",
      "2026-01-01",
      "done",
    ],
  ] as const;
  return {
    schemaVersion: 1,
    title: "Медиасектор — Осенняя неделя",
    tasks: Object.fromEntries(
      rows.map(([id, title, assignee, deadline, status]) => [
        id,
        {
          id,
          title,
          assignee,
          deadline,
          status,
          priority: id === "reels" ? "high" : "medium",
          description: `${id === "poster" ? "Графический дизайн и типографика. " : "Студенческие истории и съёмка кампуса. "}Согласовать идею с редактором, уточнить участников и обязательные кадры. Подготовить материалы для публикации; проверить имена, титры и согласия героев. Формат результата и требования к монтажу описаны ниже.`,
        },
      ]),
    ),
    blocks: rows.flatMap(([id]): Block[] => [
      {
        id: `${id}-brief`,
        type: "task",
        props: { taskId: id },
        children: [
          {
            id: `${id}-requirements`,
            type: "heading",
            props: { level: 3 },
            content: [
              { type: "text", text: "Требования к результату", styles: {} },
            ],
          },
          {
            id: `${id}-text`,
            type: "bulletListItem",
            content: [
              {
                type: "text",
                text: "Читаемые титры, естественные цвета, согласованные факты. Сохранить исходники и подготовить версию для публикации.",
                styles: {},
              },
            ],
          },
          {
            id: `${id}-reference`,
            type: "reference",
            props: {
              title: "Пример редакционного подхода",
              url: "https://example.com/reference",
              note: "Использовать спокойный ритм и крупные детали, без повторения чужих текстов.",
            },
          },
          ...(id === "reels" || id === "photo"
            ? [
                {
                  id: `${id}-image`,
                  type: "image" as const,
                  props: {
                    url: `${origin}/msu-university-seal.png`,
                    caption: "Материалы студенческого совета — пример",
                  },
                },
              ]
            : []),
        ],
      },
    ]),
  };
}
