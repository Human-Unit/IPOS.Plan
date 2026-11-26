import { expect, test } from "@playwright/test";

test("analytics uses saved records and updates when the board changes the same task in another tab", async ({ page, context }) => {
  const now = new Date("2026-11-24T12:00:00Z");
  await page.clock.setFixedTime(now);
  await page.goto("/analytics");
  await expect(page.getByText("Добавьте задания в план, чтобы увидеть показатели.")).toBeVisible();
  await page.evaluate(async (createdAt) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("ipos-content-plans");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = database.transaction(["plans", "activity", "settings"], "readwrite");
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const id = crypto.randomUUID();
    tx.objectStore("settings").put({
      key: "person:" + id,
      value: { id, displayName: "Самира", aliases: [], role: "Редактор", specializations: ["copywriting"], membershipStatus: "active", notes: "", createdAt, updatedAt: createdAt, version: 1 },
    });
    tx.objectStore("plans").put({
      id: "analytics-plan", createdAt, updatedAt: createdAt, schemaVersion: 1, version: 1, title: "Тест сводки",
      blocks: [
        { type: "task", id: "native", props: { taskId: "article" } },
        { type: "task", id: "repeated", props: { taskId: "article" } },
      ],
      tasks: { article: { id: "article", title: "Сверить интервью", priority: "medium", status: "in_progress", assignee: "Самира", deadline: "2026-11-23" } },
      assignments: { article: { legacyText: "", people: [{ personId: id, name: "Самира" }] } },
      editorial: { article: { publicationDate: "2026-11-27", stage: "editing", review: { state: "approved", action: "approve", updatedAt: createdAt } } },
    });
    tx.objectStore("activity").put({ id: "event-1", planId: "analytics-plan", createdAt, type: "TASK_REVIEW_CHANGED", message: "Зафиксировано согласование" });
    await done;
    database.close();
  }, now.toISOString());
  await page.reload();
  const metric = (name: string) => page.locator('[data-metric="' + name + '"] dd');
  await expect(metric("outstanding")).toHaveText("1");
  await expect(metric("overdue")).toHaveText("1");
  await expect(metric("upcoming")).toHaveText("1");
  const publications = page.getByRole("region", { name: "Ближайшие публикации" });
  await expect(publications.getByText(/Готово к публикации/)).toBeVisible();
  const workload = page.getByRole("row", { name: /Самира/ });
  await expect(workload.locator("td")).toHaveText(["1", "1", "1", "0"]);
  const history = page.getByRole("region", { name: "Активность за 7 дней" });
  const today = history.getByRole("listitem").filter({ hasText: "24 ноября" }).locator("strong");
  await expect(today).toHaveText("1");

  const board = await context.newPage();
  await board.clock.setFixedTime(now);
  await board.goto("/board");
  await board.getByRole("combobox", { name: "Переместить задачу: Сверить интервью" }).selectOption("published");
  await expect(board.getByRole("status")).toContainText("перемещена");
  await expect(metric("completed")).toHaveText("1");
  await expect(metric("outstanding")).toHaveText("0");
  await expect(metric("upcoming")).toHaveText("0");
  await expect(workload.locator("td")).toHaveText(["1", "0", "0", "1"]);
  await expect(today).toHaveText("3");
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await board.close();
});
