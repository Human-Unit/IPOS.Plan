import { expect, test } from "@playwright/test";
import type { PortablePlan } from "../../src/lib/schema/plan";
import { planAction } from "./actions";

const brief: PortablePlan = {
  schemaVersion: 1,
  title: "Контент-план · редакционный бриф",
  blocks: [
    { id: "brief-task", type: "task", props: { taskId: "reel" } },
    {
      id: "brief-ref",
      type: "reference",
      props: {
        url: "https://example.org/reference",
        title: "Референс ролика",
        note: "Повторить композицию кадра",
      },
    },
    {
      id: "brief-photo",
      type: "image",
      props: {
        url: "http://127.0.0.1:3105/qa-portrait.svg",
        caption: "Портретный референс",
      },
    },
    {
      id: "next-section",
      type: "heading",
      props: { level: 2 },
      content: [{ type: "text", text: "Следующая публикация", styles: {} }],
    },
  ],
  tasks: {
    reel: {
      id: "reel",
      title: "Рилс — подготовка съёмки",
      description:
        "Снять сцену по референсу.\nТребования: вертикальный формат, FullHD / 60fps.",
      assignee: "Редактор, монтажёр",
      deadline: "2026-10-15",
      status: "in_progress",
      priority: "medium",
    },
  },
};

test("editorial brief, responsive inspectors and unchanged portable data", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await context.route("**/qa-portrait.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="420"><rect width="240" height="420" fill="#e8eaf2"/><circle cx="120" cy="130" r="55" fill="#b0b9cd"/><path d="M30 350 Q120 170 210 350" fill="#7d8da9"/></svg>',
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(brief));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  const task = page.getByRole("region", {
    name: `Задача: ${brief.tasks.reel.title}`,
    exact: true,
  });
  await task.waitFor();
  // Measure the resting panel geometry after the transient import confirmation.
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  const section = page.locator('.bn-block[data-id="brief-task"]');
  for (const width of [1440, 1920, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(task.locator(".brief-fact-deadline dd time")).toHaveText(
      "15.10.2026",
    );
    await expect(task.locator(".brief-fact-deadline dd")).toBeVisible();
    await expect(
      task.getByText("Редактор, монтажёр", { exact: true }),
    ).toBeVisible();
    await expect(
      section.getByRole("img", { name: "Портретный референс", exact: true }),
    ).toBeVisible();
    await expect(
      section.getByRole("link", { name: "Референс ролика", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const boxes = await section.evaluate((el) => {
      const copy = el.querySelector(".brief-body")!.getBoundingClientRect();
      const image = el.querySelector(".brief-image")!.getBoundingClientRect();
      return { below: image.top >= copy.bottom - 1 };
    });
    expect(boxes.below).toBe(true);
    await task.getByRole("button", { name: /^Свойства задачи:/ }).click();
    await expect(
      page.getByLabel("Название задачи", { exact: true }),
    ).toHaveValue(brief.tasks.reel.title);
    await expect(
      page.locator('.task-brief[data-plan-block="brief-task"]'),
    ).toHaveAttribute("data-selected", "true");
    if (width < 1200) {
      const sheet = page.getByRole("dialog");
      await expect(sheet).toBeVisible();
      if (width < 768)
        await expect
          .poll(async () => {
            const bounds = (await sheet.boundingBox())!;
            return Math.round(bounds.y + bounds.height);
          })
          .toBe(1000);
      else
        await expect
          .poll(async () => {
            const bounds = (await sheet.boundingBox())!;
            return Math.round(bounds.x + bounds.width);
          })
          .toBe(width);
      await sheet.getByRole("button", { name: "Закрыть", exact: true }).click();
      await page
        .getByRole("button", { name: "Структура", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Обложка", exact: true })
        .click();
      await expect(sheet).toHaveCount(0);
    } else {
      await expect(
        page.getByRole("complementary", { name: "Навигация плана" }),
      ).toBeVisible();
      await expect(
        page.getByRole("complementary", { name: "Свойства выбранного блока" }),
      ).toBeVisible();
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("region", {
      name: "Изображение: Портретный референс",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("URL изображения")).toHaveValue(
    brief.blocks[2].type === "image" ? brief.blocks[2].props.url : "",
  );
  await page.getByLabel("Подпись изображения").fill("Обновлённая подпись");
  await expect(
    section.getByRole("img", { name: "Обновлённая подпись", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Сохранено локально" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    section.getByRole("img", { name: "Обновлённая подпись", exact: true }),
  ).toBeVisible();
  await planAction(page, "Экспорт");
  const exported = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  ) as PortablePlan;
  expect(exported.schemaVersion).toBe(1);
  expect(exported.tasks).toEqual(brief.tasks);
  expect(exported.blocks.slice(0, 4).map((b) => b.id)).toEqual(
    brief.blocks.map((b) => b.id),
  );
  expect(exported.blocks[0].props).toEqual({ taskId: "reel" });
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  await expect(
    page.locator(
      ".plan-outline,.block-inspector,[data-selected=true],[contenteditable=true]",
    ),
  ).toHaveCount(0);
  expect(
    await page
      .locator(".plan-paper")
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeCloseTo((210 * 96) / 25.4, 1);
  await expect(
    section.getByRole("img", { name: "Обновлённая подпись", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
