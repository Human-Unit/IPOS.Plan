import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { productivityFixture } from "./productivity-fixture";

test("assignments panel jumps between tasks and saved legacy names survive into the local library backup", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  // 3.3 preserves saved 3.2 names, but typing an ambiguous string must no
  // longer split it or create identities. Restore actual old saved rows first.
  const createdAt = "2026-10-22T00:00:00Z";
  await page.locator('input[aria-label="Файл резервной копии"]').setInputFiles({
    name: "legacy-names.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      app: "IPOS.Plan", formatVersion: 1, createdAt,
      schemas: { database: 1, portable: 1 },
      plans: [], revisions: [], activity: [],
      settings: ["Ислом", "Маруф"].map((name, index) => ({
        key: `activist:legacy-${index}`,
        value: { name, createdAt, source: "assignment" },
      })),
    })),
  });
  await page.getByRole("button", { name: "Подтвердить восстановление", exact: true }).click();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  const fixture = productivityFixture(new URL(page.url()).origin);
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page.getByLabel("JSON плана", { exact: true }).fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await page.locator(".bn-editor").waitFor();
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
  // Use the explicit, localized accessible field rather than implementation IDs.
  const field = page.getByRole("textbox", { name: "Ответственные", exact: true });
  await expect(field).toBeVisible();
  await field.fill("Ислом, Маруф");
  await field.press("Tab");
  await expect(page.locator(".task-brief").nth(3)).toContainText("Ислом, Маруф");
  // The inspector is a modal sheet below 1440px. Close it before using
  // the top-level navigation, which is intentionally inert behind the dialog.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Свойства блока" })).toBeHidden();
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
  expect(names).toHaveLength(2);
  expect(backup.people).toHaveLength(2);
  expect(backup.people.every((person: { membershipStatus: string }) => person.membershipStatus === "candidate")).toBe(true);
  const saved = backup.plans.find((plan: { title: string }) => plan.title === fixture.title);
  expect(saved.tasks.photo.assignee).toBe("Ислом, Маруф");
  expect(saved.assignments).toBeUndefined();
});
