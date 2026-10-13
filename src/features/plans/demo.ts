import type { PortablePlan } from "@/lib/schema/plan";
import { db } from "@/lib/db/database";
import { event, newPlan } from "./repository";
export const demoPlan: PortablePlan = {
  schemaVersion: 1,
  title: "Контент-план — День студента",
  blocks: [
    {
      type: "heading",
      props: { level: 1 },
      content: [{ type: "text", text: "День студента", styles: {} }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Цель: показать студенческую жизнь через истории участников. Подготовить анонс, собрать материалы в день события и выпустить итоговый пост.",
          styles: {},
        },
      ],
    },
    {
      type: "callout",
      content: [
        {
          type: "text",
          text: "Перед публикацией согласуем факты и получим согласие героев на использование фотографий. Дата события уточняется организаторами.",
          styles: {},
        },
      ],
    },
    {
      type: "heading",
      props: { level: 2 },
      content: [{ type: "text", text: "Что готовим", styles: {} }],
    },
    { type: "task", props: { taskId: "demo-announcement" } },
    { type: "task", props: { taskId: "demo-photo" } },
    { type: "task", props: { taskId: "demo-recap" } },
    { type: "divider" },
    {
      type: "reference",
      props: {
        url: "https://www.pexels.com/search/students/",
        title: "Референсы: студенты в кадре",
        note: "Смотрим на композицию и живые эмоции. Для публикации используем собственные фотографии.",
      },
    },
    {
      type: "quote",
      content: [
        {
          type: "text",
          text: "В центре истории — студенты и их опыт.",
          styles: {},
        },
      ],
    },
  ],
  tasks: {
    "demo-announcement": {
      id: "demo-announcement",
      title: "Подготовить текст анонса",
      description: "Уточнить время, место и программу у организаторов.",
      assignee: "Редактор медиасектора",
      status: "review",
      priority: "high",
    },
    "demo-photo": {
      id: "demo-photo",
      title: "Составить список кадров",
      assignee: "Фотограф медиасектора",
      status: "done",
      priority: "medium",
    },
    "demo-recap": {
      id: "demo-recap",
      title: "Собрать итоговый пост",
      status: "todo",
      priority: "medium",
    },
  },
};
export async function seedDemo() {
  await db.transaction("rw", db.settings, db.plans, db.activity, async () => {
    if (await db.settings.get("demo-seeded-v1")) return;
    if ((await db.plans.count()) === 0) {
      const plan = newPlan(demoPlan);
      await db.plans.add(plan);
      await db.activity.add(
        event(plan.id, "PLAN_CREATED", "Создан демонстрационный план"),
      );
    }
    await db.settings.put({ key: "demo-seeded-v1", value: true });
  });
}
