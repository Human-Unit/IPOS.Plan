import { expect, test, type Page } from "@playwright/test";
import { demoPlan } from "../../src/features/plans/demo";
import { planAction } from "./actions";
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Сохранено локально" }),
  ).toBeVisible();
}
test("stale tab never overwrites and can export its unsaved copy", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: demoPlan.title }).click();
  await page.getByLabel("Название плана", { exact: true }).waitFor();
  const other = await context.newPage();
  await other.goto(page.url());
  await other.getByLabel("Название плана", { exact: true }).waitFor();
  await page
    .getByLabel("Название плана", { exact: true })
    .fill("Изменения первой вкладки");
  await saved(page);
  await other
    .getByLabel("Название плана", { exact: true })
    .fill("Копия второй вкладки");
  await expect(
    other.getByRole("alert").filter({ hasText: "другой вкладке" }),
  ).toBeVisible();
  await planAction(other, "Экспорт");
  expect(
    JSON.parse(await other.getByLabel("JSON для экспорта").inputValue()).title,
  ).toBe("Копия второй вкладки");
  await page.reload();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue(
    "Изменения первой вкладки",
  );
});
test("sharing waits for an edit made during the first IndexedDB write", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: demoPlan.title }).click();
  const title = page.getByLabel("Название плана", { exact: true });
  await title.evaluate((element) => {
    const put = IDBObjectStore.prototype.put;
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setValue = Object.getOwnPropertyDescriptor(prototype, "value")!.set!;
    IDBObjectStore.prototype.put = function (value, key) {
      const request = key === undefined ? put.call(this, value) : put.call(this, value, key);
      if (this.name === "plans" && value?.title === "Перед первой записью") {
        IDBObjectStore.prototype.put = put;
        setValue.call(element, "Изменение во время записи");
        element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      }
      return request;
    };
  });
  await title.fill("Перед первой записью");
  await page.getByRole("button", { name: "Поделиться", exact: true }).click();
  await expect(title).toHaveValue("Изменение во время записи");
  await page.getByText("Другой способ: ссылка без публикации", { exact: true }).click();
  const url = await page.getByLabel("Самодостаточная ссылка").inputValue();
  const viewer = await context.newPage();
  await viewer.goto(url);
  await expect(viewer.getByRole("heading", { name: "Изменение во время записи", exact: true })).toBeVisible();
  await page.reload();
  await expect(title).toHaveValue("Изменение во время записи");
});

test("an interrupted browser write preserves the draft for the next explicit save", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: demoPlan.title }).click();
  const title = page.getByLabel("Название плана", { exact: true });
  await title.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === "plans" && value?.title === "Черновик после сбоя") {
        IDBObjectStore.prototype.put = put;
        throw new DOMException("Fixture write interrupted", "AbortError");
      }
      return key === undefined ? put.call(this, value) : put.call(this, value, key);
    };
  });
  await title.fill("Черновик после сбоя");
  await expect(page.getByRole("status").filter({ hasText: "Не сохранено" })).toBeVisible();
  await expect(title).toHaveValue("Черновик после сбоя");
  const persistedTitle = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("ipos-content-plans");
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      return await new Promise<string>((resolve, reject) => {
        const id = location.pathname.split("/").at(-1);
        if (!id) return reject(new Error("Expected an editor route"));
        const get = db.transaction("plans").objectStore("plans").get(id);
        get.onsuccess = () => resolve(get.result.title);
        get.onerror = () => reject(get.error);
      });
    } finally {
      db.close();
    }
  });
  expect(persistedTitle).toBe(demoPlan.title);
  await page.getByRole("button", { name: "Поделиться", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByLabel("Название плана", { exact: true })).toHaveValue("Черновик после сбоя");
});

test("references and slash blocks persist; deleted task supports undo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("link", { name: demoPlan.title }).click();
  await page
    .getByRole("region", {
      name: "Задача: Подготовить текст анонса",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("complementary", { name: "Навигация плана" })
    .getByRole("button", { name: "Референс", exact: true })
    .click();
  await page
    .getByLabel("Ссылка", { exact: true })
    .last()
    .fill("https://example.org/brief");
  await page
    .getByLabel("Название референса", { exact: true })
    .last()
    .fill("Бриф мероприятия");
  const slash = async (name: string, text?: string) => {
    await page
      .locator('.bn-editor [data-content-type="paragraph"]')
      .last()
      .click();
    await page.keyboard.press("End");
    await page.keyboard.type("/");
    await page.getByRole("option", { name, exact: true }).click();
    if (text) {
      await page.keyboard.insertText(text);
      await page.keyboard.press("Enter");
    }
  };
  await slash("Заметка", "Проверить подписи перед публикацией");
  await slash("Список", "Первый пункт");
  await slash("Нумерованный список", "Первый шаг");
  await slash("Цитата", "Комментарий участника");
  await slash("Разделитель");
  await slash("Изображение");
  await page
    .getByLabel("URL изображения")
    .fill(new URL("/icon.svg", page.url()).href);
  await page.getByLabel("Подпись изображения").fill("Знак плана");
  await saved(page);
  await page.reload();
  await page
    .getByRole("region", { name: "Референс: Бриф мероприятия", exact: true })
    .click();
  await expect(page.getByLabel("Название референса").last()).toHaveValue(
    "Бриф мероприятия",
  );
  await expect(page.getByRole("img", { name: "Знак плана" })).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Документ плана" })
      .getByText("Проверить подписи перед публикацией", { exact: true }),
  ).toBeVisible();
  const paragraph = page
    .locator('.bn-editor [data-content-type="paragraph"]')
    .last();
  await paragraph.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+c");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Комментарий участника",
  );
  await paragraph.click();
  const taskCard = page.getByRole("region", {
    name: "Задача: Подготовить текст анонса",
  });
  await taskCard.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await taskCard.hover({ position: { x: 10, y: 10 } });
  await page.getByRole("button", { name: "Открыть меню блока" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Удалить", exact: true }).click();
  await expect(page.locator(".task-brief")).toHaveCount(2);
  await saved(page);
  await page
    .locator('.bn-editor [data-content-type="paragraph"]')
    .last()
    .click();
  await page.keyboard.press("Control+z");
  await expect(page.locator(".task-brief")).toHaveCount(3);
  await taskCard.getByRole("button", { name: /^Свойства задачи:/ }).click();
  await expect(page.getByLabel("Название задачи").first()).toHaveValue(
    "Подготовить текст анонса",
  );
  await saved(page);
  await page.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Бриф мероприятия" }),
  ).toHaveAttribute("href", "https://example.org/brief");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
