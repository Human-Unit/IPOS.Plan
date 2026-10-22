import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { productivityFixture } from "./productivity-fixture";

test("assignments panel jumps between tasks and names survive into the local library backup", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  const fixture = productivityFixture(new URL(page.url()).origin);
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page.getByLabel("JSON плана", { exact: true }).fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page.locator(".task-brief")).toHaveCount(5);
  await page.getByRole("button", { name: "Структура", exact: true }).click();
  const assignmentNav = page.getByRole("navigation", { name: "Быстрый переход к заданиям" });
  await expect(assignmentNav.locator("button")).toHaveCount(5);
  await expect(assignmentNav).toContainText("Амина");
  await assignmentNav.locator("button").nth(2).click();
  await expect(page.locator(".task-jump")).toContainText("3 / 5");
  await page.getByRole("button", { name: "Следующая задача" }).click();
  await expect(page.locator(".task-jump")).toContainText("4 / 5");
  await page.getByRole("button", { name: "Свойства", exact: true }).click();
  const assignee = page.locator('.block-inspector input').filter({ hasNot: page.locator("span") }).last();
  // Use the explicit, localized accessible field rather than implementation IDs.
  const field = page.getByRole("textbox", { name: "Ответственные", exact: true });
  await expect(field).toBeVisible();
  await field.fill("Ислом, Маруф");
  await field.press("Tab");
  await expect(page.locator(".task-brief").nth(3)).toContainText("Ислом, Маруф");
  await page.getByRole("button", { name: "К планам" }).click();
  const directory = page.locator(".activist-directory");
  await directory.locator("summary").click();
  await expect(directory).toContainText("Ислом");
  await expect(directory).toContainText("Маруф");

  await page.getByRole("button", { name: "Резервная копия" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Скачать все данные" }).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  const names = backup.settings.filter((row: { key: string }) =>
    row.key.startsWith("activist:"),
  ).map((row: { value: { name: string } }) => row.value.name);
  expect(names).toContain("Ислом");
  expect(names).toContain("Маруф");
});
