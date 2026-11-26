import { expect, test } from "@playwright/test";
import { planAction } from "./actions";

test("editorial review keeps private feedback, persists approval and resets it after a brief edit", async ({ page }) => {
  await page.goto("/");
  const fixture = {
    schemaVersion: 1, title: "Подготовка выпуска",
    blocks: [{ type: "task", id: "feature", props: { taskId: "release" } }],
    tasks: {
      release: { id: "release", title: "Подготовить интервью", status: "in_progress", priority: "medium" },
    },
  };
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page.getByLabel("JSON плана", { exact: true }).fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page).toHaveURL(/\/plan\//);
  const show = async () => {
    await page.getByRole("button", { name: "Свойства задачи: Подготовить интервью" }).click();
    await page.getByText("Редакционное согласование", { exact: true }).click();
  };
  await show();
  const panel = page.locator(".task-approval");
  const state = panel.getByRole("status");
  await expect(state).toHaveText("Черновик");
  await panel.getByRole("button", { name: "Отправить на согласование" }).click();
  await expect(state).toHaveText("На согласовании");
  await expect(panel.getByRole("button", { name: "Запросить правки" })).toBeDisabled();
  await panel.getByLabel("Обратная связь", { exact: true }).fill("Сверить факты перед выпуском");
  await panel.getByRole("button", { name: "Запросить правки" }).click();
  await expect(state).toHaveText("Нужны правки");
  await expect(panel).toContainText("Сверить факты перед выпуском");
  await panel.getByRole("button", { name: "Отправить на согласование" }).click();
  await panel.getByLabel("Обратная связь", { exact: true }).fill("Факты сверены");
  await panel.getByRole("button", { name: "Сохранить отзыв" }).click();
  await expect(panel).toContainText("Факты сверены");
  await panel.getByRole("button", { name: "Одобрить", exact: true }).click();
  await expect(state).toHaveText("Готово к публикации");
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();

  await page.reload();
  await show();
  await expect(state).toHaveText("Готово к публикации");
  await expect(panel).toContainText("Факты сверены");
  await planAction(page, "Экспорт");
  const json = await page.getByLabel("JSON для экспорта").inputValue();
  expect(JSON.parse(json).tasks.release.status).toBe("in_progress");
  expect(json).not.toContain("Факты сверены");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();

  await page.getByLabel("Название задачи", { exact: true }).fill("Переписать вступление");
  await expect(state).toHaveText("Черновик");
  await expect(panel).toContainText("Бриф изменился после проверки");
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();
});
