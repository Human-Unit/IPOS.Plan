import { expect, test } from "@playwright/test";
import type { PortablePlan } from "../../src/lib/schema/plan";
import { planAction } from "./actions";

const title = "Контент-план · 13.10.2026";
const text = (value: string) => [
  { type: "text" as const, text: value, styles: {} },
];
const plan: PortablePlan = {
  schemaVersion: 1,
  title,
  blocks: [
    {
      id: "duplicate",
      type: "heading",
      props: { level: 1 },
      content: text(title),
    },
    { id: "task-one", type: "task", props: { taskId: "one" } },
    {
      id: "requirements",
      type: "heading",
      props: { level: 3 },
      content: text("Требования"),
    },
    {
      id: "requirement",
      type: "bulletListItem",
      content: text("Вертикальный формат · FullHD / 60fps"),
    },
    {
      id: "reference",
      type: "reference",
      props: {
        url: "https://example.org/reference",
        title: "Основной референс",
        note: "Композиция кадра",
      },
    },
    {
      id: "contact",
      type: "callout",
      content: text("Контакт для этой задачи: @QA_CONTACT"),
    },
    { id: "divider", type: "divider" },
    { id: "task-two", type: "task", props: { taskId: "two" } },
    {
      id: "image-reference",
      type: "reference",
      props: {
        url: "http://127.0.0.1:3105/qa-thumbnail.png",
        title: "Изображение для публикации",
        note: "",
      },
    },
  ],
  tasks: {
    one: {
      id: "one",
      title: "Рилс — съёмка",
      description: "Подготовить сцену по референсу",
      deadline: "2026-10-15",
      assignee: "Редактор, монтажёр",
      status: "in_progress",
      priority: "high",
    },
    two: {
      id: "two",
      title: "Рилс — публикация",
      status: "done",
      priority: "medium",
    },
  },
};

test("brand hierarchy and outline preserve native blocks and portable content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/qa-thumbnail.png", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="30"><rect width="28" height="30" fill="#eeeeee"/></svg>',
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(plan));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await expect(page.locator(".import-preview .plan-cover")).toHaveCount(1);
  await expect(
    page.locator('.import-preview .bn-block-outer[data-id="duplicate"]'),
  ).toBeHidden();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(
    page.locator('.bn-block-outer[data-id="duplicate"]'),
  ).toBeHidden();
  await page.getByRole("button", { name: "Свойства", exact: true }).click();
  await expect(page.locator(".plan-inspector")).toContainText("@QA_CONTACT");
  await expect(page.locator(".plan-inspector")).toContainText("13.10.2026");
  await expect(page.locator(".plan-stats")).toContainText("2");
  await page
    .getByRole("navigation", { name: "Структура документа" })
    .getByRole("button", { name: "Заголовок документа", exact: true })
    .click();
  await expect(
    page.locator('.bn-block-outer[data-id="duplicate"]'),
  ).toBeVisible();
  expect(
    await page
      .getByRole("heading", { name: title, exact: true })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBe(17);
  const emblem = page.locator(".plan-cover .plan-emblem");
  await expect(emblem).toHaveAttribute("src", /msu-university-seal\.png/);
  const bounds = await emblem.boundingBox();
  expect(bounds!.width / bounds!.height).toBeCloseTo(1, 2);
  expect(
    await page
      .getByRole("heading", { name: "Требования", exact: true })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBe(17);
  expect(
    await page
      .locator('.bn-block-outer[data-id="contact"]')
      .evaluate((el) => getComputedStyle(el).borderBottomStyle),
  ).toBe("solid");
  const outline = page.getByRole("navigation", { name: "Структура документа" });
  await expect(
    outline.getByRole("button", { name: "Требования", exact: true }),
  ).toBeVisible();
  await outline
    .getByRole("button", { name: "Свернуть Рилс — съёмка", exact: true })
    .click();
  await expect(
    outline.getByRole("button", { name: "Требования", exact: true }),
  ).toHaveCount(0);
  await outline
    .getByRole("button", { name: "Развернуть Рилс — съёмка", exact: true })
    .click();
  await outline
    .getByRole("button", { name: "Требования", exact: true })
    .click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(" для съёмки");
  await expect(
    page
      .getByRole("article", { name: "Документ плана" })
      .getByRole("heading", { name: "Требования для съёмки", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Референс: Основной референс", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Открыть референс", exact: true }),
  ).toHaveAttribute("href", "https://example.org/reference");
  await expect(
    page
      .getByRole("region", { name: "Референс: Основной референс", exact: true })
      .locator(".reference-domain"),
  ).toHaveText("example.org");
  await expect(
    page.getByRole("img", {
      name: "Предпросмотр: Изображение для публикации",
      exact: true,
    }),
  ).toBeVisible();
  await planAction(page, "Экспорт");
  const exported = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  ) as PortablePlan;
  expect(Object.keys(exported).sort()).toEqual([
    "blocks",
    "schemaVersion",
    "tasks",
    "title",
  ]);
  expect(
    exported.blocks.slice(0, plan.blocks.length).map((block) => block.id),
  ).toEqual(plan.blocks.map((block) => block.id));
  expect(exported.tasks).toEqual(plan.tasks);
  expect(exported.blocks[0]).toMatchObject(plan.blocks[0]);
  expect(exported.blocks[2]).toMatchObject({
    id: "requirements",
    content: text("Требования для съёмки"),
  });
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toHaveCount(1);
  await expect(
    page.locator('.bn-block-outer[data-id="duplicate"]'),
  ).toBeHidden();
  await expect(
    page.locator(
      ".plan-outline,.block-inspector,.plan-inspector,[data-selected=true],[contenteditable=true]",
    ),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Редактировать", exact: true })
    .click();
  await expect(
    page.locator('.bn-block-outer[data-id="duplicate"]'),
  ).toBeHidden();
  await page
    .getByRole("navigation", { name: "Структура документа" })
    .getByRole("button", { name: "Заголовок документа", exact: true })
    .click();
  await expect(
    page.locator('.bn-block-outer[data-id="duplicate"]'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Другие действия", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Другие действия", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});
