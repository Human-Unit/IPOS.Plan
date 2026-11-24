import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { productivityFixture } from "./productivity-fixture";
import { planAction } from "./actions";
test("library backup downloads, confirms safe copies, skips conflicts and rejects corrupted input", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".plan-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Резервная копия", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Скачать все данные" }).click();
  const file = await download;
  const raw = await readFile((await file.path())!, "utf8");
  const backup = JSON.parse(raw);
  expect(backup.app).toBe("IPOS.Plan");
  expect(backup.activity.length).toBeGreaterThan(0);
  await page
    .locator('input[aria-label="Файл резервной копии"]')
    .setInputFiles({
      name: "library.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await expect(page.getByRole("dialog")).toContainText(
    "Существующие планы и история останутся",
  );
  await expect(
    page.getByRole("radio", { name: /Добавить новыми копиями/ }),
  ).toBeChecked();
  await expect(page.locator(".plan-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Подтвердить восстановление" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Восстановлено планов: 1",
  );
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(page.locator(".plan-row")).toHaveCount(2);
  await page
    .locator('input[aria-label="Файл резервной копии"]')
    .setInputFiles({
      name: "library.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await page.getByRole("radio", { name: /Пропустить планы/ }).check();
  await page
    .getByRole("button", { name: "Подтвердить восстановление" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Пропущено планов: 1");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page
    .locator('input[aria-label="Файл резервной копии"]')
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"formatVersion":999}'),
    });
  await expect(
    page.locator('[data-sonner-toast][data-type="error"]'),
  ).toContainText("Несовместимая");
  await expect(page.locator(".plan-row")).toHaveCount(2);
});

test("Russian search, task navigation and local deadline counts work at five viewport sizes without changing data", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date("2026-10-22T07:00:00Z"));
  await page.goto("/");
  const fixture = productivityFixture(new URL(page.url()).origin);
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page).toHaveURL(/\/plan\/[^/#?]+$/);
  await page.locator(".bn-editor").waitFor();
  await expect(page.locator(".task-brief")).toHaveCount(5);
  const planUrl = page.url();
  await expect(page.locator(".deadline-hint")).toContainText([
    "Просрочено на 1 день",
    "Дедлайн сегодня",
    "Дедлайн завтра",
    "До дедлайна 4 дня",
  ]);
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 700],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const stats = page.getByLabel("Задачи во всей библиотеке");
    // The demonstration plan also has tasks; verify imported fixture through search, then exact task filters below.
    await expect(stats).toBeVisible();
    await page
      .getByRole("searchbox", { name: "Поиск планов", exact: true })
      .fill("ГРАФИЧЕСКИЙ ДИЗАЙН");
    await expect(page.locator(".plan-row")).toHaveCount(1);
    await page
      .getByRole("searchbox", { name: "Поиск планов", exact: true })
      .fill("Не существует");
    await expect(
      page.getByText("Планы не найдены.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Сбросить фильтры", exact: true })
      .first()
      .click();
    await page
      .getByRole("searchbox", { name: "Поиск планов", exact: true })
      .fill("МАЛИКА");
    const resultRow = page.locator(".plan-row");
    await expect(resultRow).toHaveCount(1);
    await expect(resultRow).toContainText("Ответственные: Малика");
    const overdue = stats.getByRole("button", { name: /^Просроченные задачи во всех планах:/ });
    await overdue.press("Enter");
    await expect(overdue).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("searchbox", { name: "Поиск планов", exact: true })).toHaveValue("");
    await expect(resultRow).toContainText("Просрочено: Reels — Один день студента · 21.10.2026 · Амина");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto(planUrl);
    await page
      .getByRole("button", { name: "Поиск задач", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Поиск задач", exact: true })
      .fill("АМИНА");
    await expect(
      page
        .getByRole("navigation", { name: "Результаты поиска задач" })
        .locator("button"),
    ).toHaveCount(2);
    await page.getByRole("button", { name: "Просрочено", exact: true }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Результаты поиска задач" })
        .locator("button"),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "На проверке", exact: true })
      .click();
    const result = page.getByRole("navigation", {
      name: "Результаты поиска задач",
    });
    await expect(result).toContainText("Stories — Вопросы первокурсников");
    await page.getByLabel("Приоритет в поиске").selectOption("low");
    await expect(
      page.getByText("Задачи не найдены", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Сбросить", exact: true }).click();
    await page.getByLabel("Ответственный в поиске").selectOption("Никита");
    await expect(result.locator("button")).toHaveCount(1);
    await result.locator("button").click();
    await expect(page.locator(".editor-workspace .task-brief")).toHaveCount(5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await planAction(page, "Экспорт");
  const exported = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  );
  expect(exported.tasks).toEqual(fixture.tasks);
  expect(exported.blocks).toEqual(fixture.blocks);
  expect(errors).toEqual([]);
});

test("built-in and custom templates insert editable whole briefs with fresh IDs; blank task remains", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Новый план", exact: true }).click();
  await page.getByRole("button", { name: "Шаблоны", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Задача из шаблона" });
  await dialog.getByLabel("Шаблон", { exact: true }).selectOption("builtin-3");
  await expect(dialog.locator(".task-brief")).toHaveCount(1);
  await expect(dialog).toContainText("Размеры и форматы");
  await dialog.getByRole("button", { name: "Вставить задачу" }).click();
  const briefs = page.locator(".editor-workspace > .plan-paper .task-brief");
  await expect(briefs).toHaveCount(1);
  await briefs
    .first()
    .getByRole("textbox", { name: /^Название:/ })
    .fill("Афиша — День студента");
  await briefs
    .first()
    .getByRole("button", { name: /^Действия задачи:/ })
    .click();
  await page.getByRole("menuitem", { name: "Сохранить как шаблон" }).click();
  await page.getByLabel("Название шаблона", { exact: true }).fill("Моя афиша");
  await page
    .getByRole("button", { name: "Сохранить шаблон", exact: true })
    .click();
  await page.getByRole("button", { name: "Шаблоны", exact: true }).click();
  await dialog
    .getByLabel("Шаблон", { exact: true })
    .selectOption({ label: "Моя афиша" });
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await dialog.getByRole("button", { name: "Вставить задачу" }).click();
  await expect(briefs).toHaveCount(2);
  expect(
    await briefs.evaluateAll(
      (nodes) =>
        new Set(nodes.map((n) => n.getAttribute("data-plan-block"))).size,
    ),
  ).toBe(2);
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();
  await page.reload();
  await expect(briefs).toHaveCount(2);
  await page.getByRole("button", { name: "Задача", exact: true }).click();
  await expect(briefs).toHaveCount(3);
  await expect(
    page.getByRole("textbox", { name: "Название: Новая задача", exact: true }),
  ).toBeVisible();
});
