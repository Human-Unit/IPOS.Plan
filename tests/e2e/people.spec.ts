import { expect, test, type Page } from "@playwright/test";

async function addPerson(page: Page, name: string, active = false) {
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
test("directory keeps duplicate names distinct and supports candidate review, aliases, filters and persisted edits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Активисты", exact: true }).click();
  const first = await addPerson(page, "Ислом", true);
  await page
    .getByRole("button", { name: "Редактировать профиль", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Редактировать профиль" });
  await edit.getByLabel("Другие написания имени").fill("Ислам");
  await edit.getByLabel("Роль", { exact: true }).fill("Оператор");
  await edit.getByRole("checkbox", { name: "Видео", exact: true }).check();
  await edit
    .getByLabel("Локальные заметки")
    .fill("Предпочитает репортажные съёмки");
  await edit
    .getByRole("button", { name: "Сохранить профиль", exact: true })
    .click();
  await page.reload();
  await expect(page.getByText("Другие написания: Ислам")).toBeVisible();
  await expect(page.getByText("Предпочитает репортажные съёмки")).toBeVisible();
  await page.getByRole("link", { name: "К активистам", exact: true }).click();
  const second = await addPerson(page, "Ислом");
  expect(first).not.toBe(second);
  await expect(page.locator(".people-heading .panel-eyebrow")).toHaveText(
    "Кандидат",
  );
  await page.getByRole("link", { name: "К активистам", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Локальные профили" }).locator("li"),
  ).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Поиск людей" }).fill("ИСЛАМ");
  await expect(
    page.getByRole("list", { name: "Локальные профили" }).locator("li"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await page.getByLabel("Статус участника").selectOption("candidate");
  await expect(
    page.getByRole("list", { name: "Локальные профили" }).locator("li"),
  ).toHaveCount(1);
  await page.getByLabel("Специализация участника").selectOption("design");
  await expect(
    page.getByText("Нет людей по выбранным условиям.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await expect(
    page.getByRole("list", { name: "Локальные профили" }).locator("li"),
  ).toHaveCount(2);
});
