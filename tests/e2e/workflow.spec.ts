import { expect, test, type Page } from "@playwright/test";
import { demoPlan } from "../../src/features/plans/demo";
import { planAction } from "./actions";
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Сохранено локально" }),
  ).toBeVisible();
}
async function noOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > innerWidth + 1;
      })
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        class: el.className,
        right: el.getBoundingClientRect().right,
      })),
  }));
  expect(layout.scroll <= layout.width, JSON.stringify(layout)).toBe(true);
}
test("create, slash heading, tasks, persistence, JSON, snapshot and restore", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.getByRole("link", { name: demoPlan.title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Новый план", exact: true }).click();
  await page.locator(".bn-editor").waitFor();
  await page
    .getByLabel("Название плана", { exact: true })
    .fill("Тестовый план");
  await page.locator(".bn-editor").click();
  await page.keyboard.type("/");
  await page.getByRole("option", { name: "Заголовок", exact: true }).click();
  await page.keyboard.insertText("Наше событие");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Задача", exact: true }).click();
  await page.getByLabel("Название задачи").fill("Подготовить анонс");
  await page.getByLabel("Ответственные", { exact: true }).fill("Редактор");
  await page
    .getByRole("button", { name: "Выбрать дедлайн", exact: true })
    .click();
  const calendar = page.getByRole("dialog", {
    name: "Календарь дедлайна",
    exact: true,
  });
  const today = new Date();
  const months = (today.getFullYear() - 2026) * 12 + today.getMonth() - 9;
  for (let i = 0; i < Math.abs(months); i++)
    await calendar
      .getByRole("button", {
        name:
          months > 0
            ? "Перейти к предыдущему месяцу"
            : "Перейти к следующему месяцу",
        exact: true,
      })
      .click();
  await calendar.getByRole("button", { name: /25 октября 2026/ }).click();
  await page.getByLabel("Статус", { exact: true }).selectOption("in_progress");
  await saved(page);
  const editorUrl = page.url();
  await page.reload();
  await page
    .getByRole("region", { name: "Задача: Подготовить анонс", exact: true })
    .getByRole("button", { name: /^Свойства задачи:/ })
    .click();
  await expect(page.getByLabel("Название задачи")).toHaveValue(
    "Подготовить анонс",
  );
  await expect(
    page.getByRole("button", { name: "Выбрать дедлайн", exact: true }),
  ).toContainText("25.10.2026");
  await expect(page.getByLabel("Статус", { exact: true })).toHaveValue(
    "in_progress",
  );
  await expect(
    page.getByRole("heading", { name: "Наше событие" }),
  ).toBeVisible();
  await planAction(page, "Сохранить версию");
  await expect(
    page.getByText("Версия сохранена", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Подготовить анонс" }),
  ).toBeVisible();
  await expect(page.getByLabel("Название задачи")).toHaveCount(0);
  expect(await page.locator('[contenteditable="true"]').count()).toBe(0);
  await noOverflow(page);
  await planAction(page, "Экспорт");
  const portable = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  );
  expect(portable.title).toBe("Тестовый план");
  expect(portable).not.toHaveProperty("id");
  expect(portable).not.toHaveProperty("updatedAt");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать .json" }).click();
  expect((await downloadEvent).suggestedFilename()).toMatch(/\.json$/);
  await page.getByRole("button", { name: "Копировать JSON" }).click();
  await expect(
    page.getByText("JSON скопирован", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Поделиться", exact: true }).click();
  await page.getByText("Другой способ: ссылка без публикации", { exact: true }).click();
  const shareUrl = await page.getByLabel("Самодостаточная ссылка").inputValue();
  expect(shareUrl).toContain("/view#p=");
  expect(new URL(shareUrl).search).toBe("");
  await page.getByRole("button", { name: "Скопировать", exact: true }).click();
  await expect(
    page.getByText("Ссылка скопирована", { exact: true }),
  ).toBeVisible();
  const viewer = await context.newPage();
  await viewer.goto(shareUrl);
  await expect(
    viewer.getByRole("heading", { name: "Тестовый план" }),
  ).toBeVisible();
  await expect(
    viewer.getByRole("heading", { name: "Подготовить анонс" }),
  ).toBeVisible();
  expect(
    await viewer
      .locator("input,select,textarea,[contenteditable=true]")
      .count(),
  ).toBe(0);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .getByRole("button", { name: "Редактировать", exact: true })
    .click();
  await page
    .getByLabel("Название плана", { exact: true })
    .fill("Изменённый план");
  await page
    .getByRole("region", { name: "Задача: Подготовить анонс", exact: true })
    .getByRole("button", { name: /^Свойства задачи:/ })
    .click();
  await page.getByLabel("Статус", { exact: true }).selectOption("done");
  await saved(page);
  await viewer.reload();
  await expect(
    viewer.getByRole("heading", { name: "Тестовый план" }),
  ).toBeVisible();
  await expect(viewer.getByText("В работе", { exact: true })).toBeVisible();
  await planAction(page, "Импорт");
  await page.getByLabel("JSON плана", { exact: true }).fill("{bad");
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Некорректный JSON" }),
  ).toBeVisible();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify({ ...portable, title: "Импортированная копия" }));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await expect(
    page
      .locator(".import-summary")
      .getByText("Импортированная копия", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".import-preview .plan-cover")).toHaveCount(1);
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue(
    "Импортированная копия",
  );
  await planAction(page, "История");
  await page.getByRole("button", { name: /Сохранённая версия/ }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Тестовый план", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".revision-preview .plan-cover")).toHaveCount(1);
  await page.getByRole("button", { name: "Восстановить эту версию" }).click();
  await page
    .getByRole("button", { name: "Подтвердить восстановление" })
    .click();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue(
    "Тестовый план",
  );
  await page
    .getByRole("region", { name: "Задача: Подготовить анонс", exact: true })
    .getByRole("button", { name: /^Свойства задачи:/ })
    .click();
  await expect(page.getByLabel("Статус", { exact: true })).toHaveValue(
    "in_progress",
  );
  await page.reload();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue(
    "Тестовый план",
  );
  expect(page.url()).toBe(editorUrl);
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
    await viewer.setViewportSize({ width, height: 900 });
    await noOverflow(viewer);
  }
  await viewer.close();
  expect(errors).toEqual([]);
});
test("dashboard import, duplicate, delete, empty state and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: demoPlan.title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Импорт JSON" }).click();
  await page.getByLabel("Файл .json · до 1 МБ").setInputFiles({
    name: "plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...demoPlan, title: "Файл из другого браузера" }),
    ),
  });
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue(
    "Файл из другого браузера",
  );
  await page.getByRole("button", { name: "К планам", exact: true }).click();
  await page
    .getByRole("button", { name: `Дублировать ${demoPlan.title}` })
    .click();
  await expect(
    page.getByRole("link", { name: `${demoPlan.title} — копия`, exact: true }),
  ).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
  }
  for (const title of [
    "Файл из другого браузера",
    `${demoPlan.title} — копия`,
    demoPlan.title,
  ]) {
    await page
      .getByRole("button", { name: `Удалить ${title}`, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Удалить план", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toHaveCount(0);
  }
  await expect(
    page.getByText("Начните с первого плана", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Начните с первого плана", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});
test("invalid or missing share snapshot is a useful error", async ({
  page,
}) => {
  await page.goto("/view");
  await expect(
    page.getByRole("heading", { name: "Не удалось открыть снимок" }),
  ).toBeVisible();
  await page.goto("/view#p=invalid");
  await expect(
    page.getByRole("heading", { name: "Не удалось открыть снимок" }),
  ).toBeVisible();
  await noOverflow(page);
});
