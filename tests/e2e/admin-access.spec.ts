import { expect, test } from "@playwright/test";

test("admin workspace requires a signed session", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Вход в админку" })).toBeVisible();
  await expect(page.locator(".admin-login-brand")).toContainText("IPOS.Plan");
  await expect(page.getByText("Черновики планов остаются в этом браузере.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "К контент-планам" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 680 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("bad credentials do not create a session", async ({ page }) => {
  test.skip(!process.env.IPOS_TEST_ADMIN_PASSWORD, "Requires a configured admin test server.");
  await page.goto("/admin/login");
  await page.getByLabel("Пароль администратора").fill("incorrect-password-not-the-real-admin-secret");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("alert")).toContainText("Неверный пароль");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("cross-origin login attempts are rejected", async ({ request }) => {
  const result = await request.post("/api/admin/session", {
    headers: { Origin: "https://untrusted.invalid" },
    data: { password: "not-a-real-admin-password" },
  });
  expect(result.status()).toBe(403);
  expect(result.headers()["set-cookie"]).toBeUndefined();
});

test("owner can open admin and create a local plan", async ({ page }) => {
  test.skip(!process.env.IPOS_TEST_ADMIN_PASSWORD, "Provide credentials only in the test runner environment.");
  await page.goto("/admin/login");
  await page.getByLabel("Пароль администратора").fill(process.env.IPOS_TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Мои планы" })).toBeVisible();
  await page.getByRole("button", { name: "Новый план" }).click();
  await expect(page).toHaveURL(/\/plan\/[^/]+$/);
  await expect(page.locator(".bn-editor")).toBeVisible();
});
