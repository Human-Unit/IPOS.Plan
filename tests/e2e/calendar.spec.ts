import { expect, test } from "@playwright/test";

test("calendar shows separate deadlines and planned dates with live task and participant filters", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-24T12:00:00Z"));
  await page.goto("/activists");
  await page.getByRole("button", { name: "Добавить человека" }).click();
  await page.getByLabel("Имя и фамилия").fill("Амина");
  await page.getByRole("button", { name: "Сохранить профиль" }).click();
  await page.waitForURL(/\/activists\/[0-9a-f-]+$/);
  const personId = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.goto("/");
  const fixture = {
    schemaVersion: 1,
    title: "Редакционная неделя",
    tasks: {
      script: { id: "script", title: "Написать сценарий", status: "in_progress", priority: "high", deadline: "2026-11-23" },
      shoot: { id: "shoot", title: "Записать интервью", status: "todo", priority: "medium", deadline: "2026-11-25", assignee: "Амина" },
    },
    blocks: [
      { id: "brief-1", type: "task", props: { taskId: "script" } },
      { id: "brief-2", type: "task", props: { taskId: "shoot" } },
    ],
  };
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page.getByLabel("JSON плана", { exact: true }).fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page).toHaveURL(/\/plan\//);
  const planId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("button", { name: "Свойства задачи: Написать сценарий" }).click();
  await page.getByRole("checkbox", { name: /^Назначить Амина/ }).check();
  await page.getByRole("button", { name: "Применить назначение" }).click();
  await page.getByRole("button", { name: "Выбрать дату публикации", exact: true }).click();
  const picker = page.locator('[aria-label="Календарь плановой публикации"]');
  await picker.getByRole("button", { name: /26 ноября/ }).click();
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();

  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "Календарь", exact: true })).toBeVisible();
  const grid = page.locator(".calendar-grid");
  await expect(grid.getByRole("link", { name: /Просрочен.*Написать сценарий/ })).toBeVisible();
  await expect(grid.getByRole("link", { name: /Плановая публикация.*Написать сценарий/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Дедлайны на 7 дней" })).toBeVisible();
  await page.getByRole("button", { name: "Неделя", exact: true }).click();
  await expect(grid.locator(".calendar-day")).toHaveCount(7);
  await page.getByRole("button", { name: "Следующий период" }).click();
  await expect(grid.getByRole("link", { name: /Написать сценарий/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Сегодня", exact: true }).click();
  await page.getByLabel("План", { exact: true }).selectOption(planId);
  await page.getByLabel("Участник", { exact: true }).selectOption(personId);
  await expect(grid.getByRole("link", { name: /Записать интервью/ })).toHaveCount(0);
  await page.getByLabel("Статус", { exact: true }).selectOption("todo");
  await expect(grid.getByRole("link")).toHaveCount(0);
  await page.getByLabel("Статус", { exact: true }).selectOption("in_progress");
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await grid.getByRole("link", { name: /Плановая публикация.*Написать сценарий/ }).click();
  await expect(page).toHaveURL(/#task=script$/);
  await expect(page.locator('.task-brief[data-plan-block="brief-1"]')).toHaveAttribute("data-selected", "true");
});
