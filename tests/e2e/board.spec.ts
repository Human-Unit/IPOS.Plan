import { expect, test } from "@playwright/test";

test("board supports mouse and keyboard moves, retains one task and updates the native brief", async ({ page }) => {
  await page.goto("/");
  const fixture = {
    schemaVersion: 1, title: "Доска редакции",
    blocks: [
      { id: "original-brief", type: "task", props: { taskId: "work" } },
      { id: "repeat", type: "task", props: { taskId: "work" } },
    ],
    tasks: { work: { id: "work", title: "Интервью с редактором", status: "todo", priority: "medium" } },
  };
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page.getByLabel("JSON плана", { exact: true }).fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page).toHaveURL(/\/plan\//);
  const planId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.goto("/board");
  await page.getByLabel("План", { exact: true }).selectOption(planId);
  const card = page.locator(".board-card").filter({ hasText: "Интервью с редактором" });
  await expect(card).toHaveCount(1);
  const stage = (id: string) => page.locator('.board-column[data-stage="' + id + '"]');
  await expect(stage("idea").locator(".board-card")).toHaveCount(1);

  await card.dragTo(stage("production").getByText("Нет задач"));
  await expect(stage("production").locator(".board-card")).toHaveCount(1);
  const select = stage("production").getByRole("combobox", { name: "Переместить задачу: Интервью с редактором" });
  await select.focus();
  await page.keyboard.press("ArrowDown");
  const editing = stage("editing").getByRole("combobox", { name: "Переместить задачу: Интервью с редактором" });
  await expect(editing).toHaveValue("editing");
  await expect(editing).toBeFocused();
  await page.reload();
  await expect(editing).toHaveValue("editing");
  await stage("editing").getByRole("link", { name: "Интервью с редактором", exact: true }).click();
  await expect(page).toHaveURL(/#task=work$/);
  const brief = page.locator('.task-brief[data-plan-block="original-brief"]');
  await expect(brief).toHaveAttribute("data-selected", "true");
  await brief.getByRole("button", { name: "Свойства задачи: Интервью с редактором" }).click();
  await expect(page.getByLabel("Этап производства")).toHaveValue("editing");
  await expect(page.getByLabel("Статус", { exact: true })).toHaveValue("in_progress");
});
