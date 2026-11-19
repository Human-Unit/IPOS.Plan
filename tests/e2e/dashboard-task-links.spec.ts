import { expect, test } from "@playwright/test";

test("completed workload links directly to the matching brief, including after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Готово/ }).click();
  const results = page.getByRole("list", { name: "Найденные задачи" });
  await expect(results.getByRole("link")).toHaveCount(1);
  const brief = results.getByRole("link", { name: /Составить список кадров/ });
  await expect(brief).toContainText("Фотограф медиасектора");
  await expect(brief).toContainText("Без дедлайна");
  for (const width of [320, 390, 768, 1024, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(brief).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await brief.focus();
  await page.keyboard.press("Enter");
  const target = page.locator('.task-brief[aria-label="Задача: Составить список кадров"]');
  await expect(target).toHaveAttribute("data-selected", "true");
  await expect(target).toBeFocused();
  await page.reload();
  await expect(target).toBeFocused();
});

test("a custom publication address can be typed, cleared, pasted and submitted", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Контент-план — День студента" }).click();
  await page.getByRole("button", { name: "Поделиться", exact: true }).click();
  await page.getByText("Настроить адрес (необязательно)").click();
  const slug = page.getByLabel("Имя в адресе (латиница)");
  await slug.fill("");
  await expect(slug).toHaveValue("");
  await slug.pressSequentially("reels-noyabr");
  await expect(slug).toHaveValue("reels-noyabr");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() => navigator.clipboard.writeText("Съёмка в МГУ"));
  await slug.press("ControlOrMeta+a");
  await slug.press("ControlOrMeta+v");
  await expect(slug).toHaveValue("Съёмка в МГУ");
  await slug.press("Tab");
  await expect(slug).toHaveValue("syomka-v-mgu");
  await expect(page.locator("#slug-preview")).toContainText("/p/syomka-v-mgu-");
  await page.route("**/api/publications", route => route.fulfill({
    status: 201,
    json: { id: "syomka-v-mgu-0123456789abcdef", managerKey: "test-only" },
  }));
  const publish = page.getByRole("button", { name: "Опубликовать", exact: true });
  await publish.click();
  await page.getByLabel("Код доступа к публикации").fill("test-only");
  const submitted = page.waitForRequest(request => request.url().endsWith("/api/publications"));
  await publish.click();
  expect((await submitted).postDataJSON().slug).toBe("syomka-v-mgu");
  await expect(page.getByLabel("Ссылка на страницу")).toHaveValue(/\/p\/syomka-v-mgu-0123456789abcdef$/);
});
