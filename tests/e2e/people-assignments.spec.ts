import { test, expect, type Page } from "@playwright/test";
import { planAction } from "./actions";
export async function createPersonUI(page: Page, name: string, active = false) {
  await page.goto("/activists");
  await page
    .getByRole("button", { name: "Добавить человека", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Добавить человека" });
  await dialog.getByLabel("Имя и фамилия", { exact: true }).fill(name);
  if (active)
    await dialog.getByLabel("Членство", { exact: true }).selectOption("active");
  await dialog
    .getByRole("button", { name: "Сохранить профиль", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  return page.url();
}
export async function importAssignmentPlan(
  page: Page,
  title = "Работа медиасектора",
  raw = "Ислам / съёмочная группа",
) {
  await page.goto("/");
  const fixture = {
    schemaVersion: 1,
    title,
    tasks: {
      reel: {
        id: "reel",
        title: "Рилс — История кампуса",
        status: "in_progress",
        priority: "high",
        assignee: raw,
        deadline: "2026-10-21",
      },
      carousel: {
        id: "carousel",
        title: "Карусель — Советы первокурсникам",
        status: "review",
        priority: "medium",
        deadline: "2026-10-23",
      },
    },
    blocks: [
      { id: "reel-block", type: "task", props: { taskId: "reel" } },
      {
        id: "requirements",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Репортажные кадры, крупные детали и согласованные титры.",
            styles: {},
          },
        ],
      },
      { id: "carousel-block", type: "task", props: { taskId: "carousel" } },
    ],
  };
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page.locator(".task-brief")).toHaveCount(2);
  return page.url();
}
export async function assignUI(page: Page, title: string, names: string[]) {
  await page
    .getByRole("button", { name: `Свойства задачи: ${title}`, exact: true })
    .click();
  for (const name of names)
    await page
      .getByRole("checkbox", { name: new RegExp(`^Назначить ${name} \\(`) })
      .check();
  const keep = page.getByRole("checkbox", {
    name: /^Сохранить исходный текст/,
  });
  if (await keep.count()) await keep.uncheck();
  await page
    .getByRole("button", { name: "Применить назначение", exact: true })
    .click();
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();
}
test("explicit multi-person assignment preserves legacy text until confirmation and navigates exact briefs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const islam = await createPersonUI(page, "Ислом", true);
  await createPersonUI(page, "Маруф");
  const plan = await importAssignmentPlan(page);
  const reel = page.locator('.task-brief[data-plan-block="reel-block"]');
  await expect(reel).toContainText("Ислам / съёмочная группа");
  await expect(reel.locator('a[href*="/activists/"]')).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Свойства задачи: Рилс — История кампуса",
      exact: true,
    })
    .click();
  await page.getByRole("checkbox", { name: /^Назначить Ислом \(/ }).check();
  await page.getByRole("checkbox", { name: /^Назначить Маруф \(/ }).check();
  await expect(
    page.getByRole("checkbox", { name: /^Сохранить исходный текст/ }),
  ).toBeChecked();
  await expect(reel).toContainText("Ислам / съёмочная группа");
  await page
    .getByRole("checkbox", { name: /^Сохранить исходный текст/ })
    .uncheck();
  await page.getByRole("button", { name: "Применить назначение" }).click();
  await expect(
    reel.getByRole("link", { name: "Ислом", exact: true }),
  ).toBeVisible();
  await expect(
    reel.getByRole("link", { name: "Маруф", exact: true }),
  ).toBeVisible();
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();
  await page.reload();
  await reel.getByRole("link", { name: "Ислом", exact: true }).click();
  await expect(page).toHaveURL(islam);
  await page.goto(plan + "#task=carousel");
  await expect(
    page.locator('.task-brief[data-plan-block="carousel-block"]'),
  ).toHaveAttribute("data-selected", "true");
  await page.goto(plan + "#task=missing");
  await expect(page.locator('.media-progress[role="alert"]')).toContainText(
    "Задание по ссылке не найдено",
  );
  await page.goto(plan + "#task=reel");
  await planAction(page, "Экспорт");
  const json = await page.getByLabel("JSON для экспорта").inputValue();
  expect(JSON.parse(json).tasks.reel.assignee).toBe("Ислом, Маруф");
  expect(json).not.toContain("personId");
  expect(json).not.toContain("assignments");
  expect(errors).toEqual([]);
});
