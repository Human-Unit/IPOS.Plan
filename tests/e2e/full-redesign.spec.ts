import { expect, test } from "@playwright/test";
import { productivityFixture } from "./productivity-fixture";
import { planAction } from "./actions";

test.use({ reducedMotion: "reduce" });

test("structure and task navigation keep filters and the complete document across panel modes", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  const fixture = productivityFixture(new URL(page.url()).origin);
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page.getByLabel("JSON плана", { exact: true }).fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page).toHaveURL(/\/plan\/[^/#?]+$/);
  const url = page.url();

  for (const width of [1366, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await page.locator(".bn-editor").waitFor();
    if (width < 1200)
      await page.getByRole("button", { name: "Структура", exact: true }).click();
    const panel = width >= 1200
      ? page.getByRole("complementary", { name: "Навигация плана" })
      : page.getByRole("dialog", { name: "Структура плана" });
    await expect(panel.getByRole("navigation", { name: "Структура документа" })).toBeVisible();
    await expect(panel.getByRole("searchbox", { name: "Поиск задач", exact: true })).toBeHidden();
    await panel.getByRole("radio", { name: "Задачи", exact: true }).click();
    const search = panel.getByRole("searchbox", { name: "Поиск задач", exact: true });
    await search.fill("АМИНА");
    await expect(panel.getByRole("navigation", { name: "Результаты поиска задач" }).locator("button")).toHaveCount(2);
    await panel.getByRole("radio", { name: "Структура", exact: true }).click();
    await expect(search).toBeHidden();
    await panel.getByRole("radio", { name: "Задачи", exact: true }).click();
    await expect(search).toHaveValue("АМИНА");
    await panel.getByRole("navigation", { name: "Быстрый переход к заданиям" }).locator("button").nth(2).click();
    await expect(page.locator(".task-jump")).toContainText("3 / 5");
    await expect(page.locator(".task-brief")).toHaveCount(5);
    await page.getByRole("button", { name: "Поиск задач", exact: true }).click();
    await expect(page.getByRole("searchbox", { name: "Поиск задач", exact: true })).toBeFocused();
    if (width < 1200) await page.keyboard.press("Escape");
  }
  await planAction(page, "Экспорт");
  const exported = JSON.parse(await page.getByLabel("JSON для экспорта").inputValue());
  expect(exported.tasks).toEqual(fixture.tasks);
  expect(exported.blocks).toEqual(fixture.blocks);
});

test("narrow editor keeps named actions and native keyboard mode switching", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/");
    await expect(page.locator(".plan-row").first()).toBeVisible();
    const order = await page.locator(".plan-list").evaluate((el) =>
      Boolean(el.compareDocumentPosition(document.querySelector(".dashboard-operations")!) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    expect(order).toBe(true);
    await page.locator(".plan-title").first().click();
    await page.locator(".bn-editor").waitFor();
    for (const name of ["Предпросмотр", "Режим фокуса", "Другие действия", "Поделиться"]) {
      const button = page.getByRole("button", { name, exact: true });
      await expect(button).toBeVisible();
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const workspace = page.getByRole("radio", { name: "Рабочий стол", exact: true });
    await workspace.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Документ", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("radio", { name: "Документ", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("[contenteditable=true]")).toHaveCount(0);
    await workspace.click();
    await expect(page.locator(".bn-editor")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
