import { expect, test } from "@playwright/test";
import { demoPlan } from "../../src/features/plans/demo";

test("approved cobalt opening preserves plan access and GPT actions on desktop and mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".dashboard-app-bar")).toBeVisible();
  await expect(page.locator(".dashboard-opening")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Контент-планы" })).toBeVisible();
  await expect(page.locator(".recent-plan")).toBeVisible();
  await expect(page.getByRole("link", { name: demoPlan.title })).toHaveCount(1);
  await expect(page.getByRole("link", { name: demoPlan.title, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Новый план", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Из GPT", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Импорт JSON", exact: true })).toBeVisible();

  const stat = page.locator(".library-stats").getByRole("button", { name: /Не завершено/ });
  await stat.click();
  await expect(stat).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Все планы", exact: true }).click();
  await expect(stat).toHaveAttribute("aria-pressed", "false");

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const measures = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(measures.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(measures.viewport + 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const files = page.getByRole("button", { name: "Файлы", exact: true });
  await files.click();
  await expect(files).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Из GPT", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Импорт JSON", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(files).toHaveAttribute("aria-expanded", "false");
});

test("cobalt editor preserves the MCP entry point and reader class", async ({ page }) => {
  await page.goto("/");
  await page.locator(".dashboard-actions").getByRole("button", { name: "Новый план", exact: true }).click();
  await expect(page.locator(".cobalt-editor-bar")).toBeVisible();
  await expect(page.locator(".cobalt-editor-stage")).toBeVisible();
  await expect(page.getByRole("button", { name: "Синхронизация с ChatGPT", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "К планам", exact: true }).click();
  await page.goto("/view");
  await expect(page.locator(".cobalt-reader-bar")).toBeVisible();
});
