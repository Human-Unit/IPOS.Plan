import { expect, test } from "@playwright/test";
import type { PortablePlan } from "../../src/lib/schema/plan";
import { planAction } from "./actions";

const id = "af9ccb80-b216-4c60-86f4-3f12ea9895cf";
const timestamp = "2026-11-22T11:00:00.000Z";
const cloudDocument: PortablePlan = {
  schemaVersion: 1,
  title: "Два Reels",
  blocks: [
    { type: "task", props: { taskId: "reel-one" } },
    { type: "reference", props: { url: "https://example.org/ref-one", title: "Референс", note: "" } },
    { type: "task", props: { taskId: "reel-two" } },
    { type: "reference", props: { url: "https://example.org/ref-two", title: "Референс", note: "" } },
  ],
  tasks: {
    "reel-one": { id: "reel-one", title: "Первый Reels", description: "Кадр 1: вход", assignee: "Ислом", status: "todo", priority: "medium" },
    "reel-two": { id: "reel-two", title: "Второй Reels", description: "Кадр 1: детали", assignee: "Гулнамо, Шехрона", status: "todo", priority: "medium" },
  },
};

const cloud = (version: number, document = cloudDocument) => ({
  id, version, createdAt: timestamp, updatedAt: timestamp, document,
});

test("connects one local plan only after confirmation and applies only the reviewed cloud version", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let connected = 0;
  let remote = cloud(2);
  let uploaded: PortablePlan | undefined;
  let sent = 0;
  await page.route("**/api/ai/plans", async (route) => {
    expect(route.request().method()).toBe("POST");
    connected++;
    uploaded = route.request().postDataJSON().document;
    await route.fulfill({ status: 201, json: cloud(1, uploaded) });
  });
  await page.route("**/api/ai/plans/" + id, async (route) => {
    if (route.request().method() === "PUT") {
      sent++;
      expect(route.request().postDataJSON().expectedVersion).toBe(1);
      await route.fulfill({ status: 409, json: { error: "Серверный план изменился." } });
    } else {
      await route.fulfill({ json: remote });
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Новый план", exact: true }).click();
  await page.locator(".bn-editor").waitFor();
  await page.getByRole("button", { name: "Синхронизация с ChatGPT", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /Подключение к ChatGPT/ });
  await expect(dialog).toBeVisible();
  expect(connected).toBe(0);
  await dialog.getByRole("button", { name: "Подключить этот план" }).click();
  await expect(dialog).toContainText("версия 1");
  expect(connected).toBe(1);
  expect(uploaded).toMatchObject({ title: "Новый контент-план", tasks: {} });
  await dialog.getByRole("button", { name: "Отправить локальные изменения" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Серверный план изменился.");
  expect(sent).toBe(1);

  const check = dialog.getByRole("button", { name: "Проверить изменения из GPT" });
  const apply = dialog.getByRole("button", { name: "Применить серверную версию" });
  await check.click();
  await expect(dialog.getByRole("region", { name: "Предпросмотр серверных изменений" })).toBeVisible();
  await expect(apply).toBeDisabled();
  remote = cloud(3);
  await dialog.getByRole("checkbox").check();
  await apply.click();
  await expect(dialog.getByRole("alert")).toContainText("изменился во время просмотра");
  await expect(apply).toHaveCount(0);
  await check.click();
  await expect(apply).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await apply.click();
  await expect(dialog.getByRole("status")).toContainText("Предыдущая локальная версия сохранена");
  await dialog.locator("[data-slot=dialog-footer]").getByRole("button", { name: "Закрыть" }).click();
  await page.reload();
  await expect(page.locator(".task-brief")).toHaveCount(2);
  await planAction(page, "История");
  await expect(page.getByText("До импорта", { exact: false }).first()).toBeVisible();
});

test("imports a generated Reels plan as a separate editable IndexedDB document", async ({ page }) => {
  await page.route("**/api/ai/plans", (route) => route.fulfill({
    json: { plans: [{ id, title: cloudDocument.title, version: 2, updatedAt: timestamp }], nextCursor: null },
  }));
  await page.route("**/api/ai/plans/" + id, (route) => route.fulfill({ json: cloud(2) }));
  await page.goto("/");
  const seed = page.getByRole("link", { name: /День студента/ });
  await expect(seed).toBeVisible();
  await page.getByRole("button", { name: "Из GPT", exact: true }).click();
  await page.getByRole("button", { name: "Два Reels · версия 2" }).click();
  const preview = page.getByRole("region", { name: "Предпросмотр импортируемого плана" });
  await expect(preview).toContainText("Гулнамо, Шехрона");
  await expect(preview.getByRole("link", { name: "Референс" }).first()).toHaveAttribute("href", "https://example.org/ref-one");
  await page.getByRole("button", { name: "Создать локальную копию" }).click();
  await expect(page).toHaveURL(/\/plan\//);
  await page.locator(".bn-editor").waitFor();
  await page.getByLabel("Название плана", { exact: true }).fill("Два Reels — правки");
  await expect(page.getByRole("status").filter({ hasText: "Сохранено локально" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue("Два Reels — правки");
  await planAction(page, "Экспорт");
  const exported = JSON.parse(await page.getByLabel("JSON для экспорта").inputValue());
  expect(exported).toMatchObject({ schemaVersion: 1, tasks: cloudDocument.tasks });
  for (const task of Object.values(exported.tasks)) expect(task).not.toHaveProperty("deadline");
  await page.goto("/");
  await expect(seed).toBeVisible();
  await expect(page.getByRole("link", { name: "Два Reels — правки" })).toBeVisible();
});
