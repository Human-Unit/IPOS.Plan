import { expect, test, type Page } from "@playwright/test";
import { demoPlan } from "../../src/features/plans/demo";
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Сохранено локально" }),
  ).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
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
  await expect(page.getByRole("link", { name: demoPlan.title })).toBeVisible();
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
  await page.getByLabel("Дедлайн", { exact: true }).fill("2026-10-25");
  await page.getByLabel("Статус", { exact: true }).selectOption("in_progress");
  await saved(page);
  const editorUrl = page.url();
  await page.reload();
  await page
    .getByRole("region", { name: "Задача: Подготовить анонс", exact: true })
    .click();
  await expect(page.getByLabel("Название задачи")).toHaveValue(
    "Подготовить анонс",
  );
  await expect(page.getByLabel("Статус", { exact: true })).toHaveValue(
    "in_progress",
  );
  await expect(
    page.getByRole("heading", { name: "Наше событие" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Сохранить версию", exact: true })
    .click();
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
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
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
  const shareUrl = await page.getByLabel("Ссылка на снимок").inputValue();
  expect(shareUrl).toContain("/view#p=");
  expect(new URL(shareUrl).search).toBe("");
  await page.getByRole("button", { name: "Копировать ссылку" }).click();
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
    .click();
  await page.getByLabel("Статус", { exact: true }).selectOption("done");
  await saved(page);
  await viewer.reload();
  await expect(
    viewer.getByRole("heading", { name: "Тестовый план" }),
  ).toBeVisible();
  await expect(viewer.getByText("В работе", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Импорт", exact: true }).click();
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
      .getByRole("dialog")
      .getByText("Импортированная копия", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue(
    "Импортированная копия",
  );
  await page.getByRole("button", { name: "История", exact: true }).click();
  await page.getByRole("button", { name: /Сохранённая версия/ }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Тестовый план", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Восстановить эту версию" }).click();
  await page
    .getByRole("button", { name: "Подтвердить восстановление" })
    .click();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue(
    "Тестовый план",
  );
  await page
    .getByRole("region", { name: "Задача: Подготовить анонс", exact: true })
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
  await expect(page.getByRole("link", { name: demoPlan.title })).toBeVisible();
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
    page.getByRole("link", { name: `${demoPlan.title} — копия` }),
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
