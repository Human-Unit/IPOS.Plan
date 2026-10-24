import { test, expect, type Page } from "@playwright/test";
import { planAction } from "./actions";
import { readFile } from "node:fs/promises";
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
  await page.locator(".bn-editor").waitFor();
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
  context,
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
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Поделиться", exact: true }).click();
  const share = await page.getByLabel("Ссылка на снимок").inputValue();
  const viewer = await context.newPage();
  viewer.on("pageerror", (e) => errors.push(e.message));
  await viewer.goto(share);
  await expect(viewer.locator(".task-brief").first()).toContainText("Ислом, Маруф");
  await expect(viewer.locator('a[href*="/activists/"]')).toHaveCount(0);
  await viewer.reload();
  await expect(viewer.locator(".task-brief").first()).toContainText("Ислом, Маруф");
  await viewer.close();
  expect(errors).toEqual([]);
});

test("four people, shared work in two plans, completion, workload filters and profile-to-brief navigation", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.clock.setFixedTime(new Date("2026-10-22T07:00:00Z"));
  const islam = await createPersonUI(page, "Ислом", true);
  const amina = await createPersonUI(page, "Амина", true);
  const maruf = await createPersonUI(page, "Маруф");
  const aziz = await createPersonUI(page, "Азиз");
  const first = await importAssignmentPlan(page, "Неделя первая", "");
  await assignUI(page, "Рилс — История кампуса", ["Ислом", "Маруф"]);
  await assignUI(page, "Карусель — Советы первокурсникам", ["Амина"]);
  const second = await importAssignmentPlan(page, "Неделя вторая", "");
  await assignUI(page, "Рилс — История кампуса", ["Ислом"]);
  await page
    .getByRole("combobox", {
      name: "Статус задачи: Рилс — История кампуса",
      exact: true,
    })
    .selectOption("done");
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();
  await page.goto(islam);
  const summary = page.getByLabel("Сводка всех заданий профиля");
  for (const [label, value] of [
    ["Всего", "2"],
    ["Готово", "1"],
    ["В работе", "1"],
    ["Просрочено", "1"],
  ]) {
    await expect(
      summary
        .locator("div")
        .filter({ has: page.getByText(label, { exact: true }) })
        .locator("dd"),
    ).toHaveText(value);
  }
  const taskRow = page
    .getByRole("list", { name: "Назначенные задания" })
    .locator("li")
    .filter({ hasText: "Неделя первая" });
  await taskRow
    .getByRole("link", { name: "Рилс — История кампуса", exact: true })
    .click();
  await expect(page).toHaveURL(first + "#task=reel");
  await expect(
    page.locator('.task-brief[data-plan-block="reel-block"]'),
  ).toHaveAttribute("data-selected", "true");
  await page.goto("/activists/workload");
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: "Ислом", exact: true }) });
  await expect(row.locator("td")).toHaveText(["2", "1", "0", "1", "1"]);
  await page.getByLabel("Статус задач в нагрузке").selectOption("done");
  await expect(row.locator("td")).toHaveText(["1", "0", "0", "1", "0"]);
  await page.getByRole("button", { name: "Сбросить срез" }).click();
  await page
    .getByLabel("План в нагрузке")
    .selectOption(new URL(second).pathname.split("/").at(-1)!);
  await expect(row.locator("td")).toHaveText(["1", "0", "0", "1", "0"]);
  await page.goto(amina);
  await expect(page.locator(".people-heading .panel-eyebrow")).toHaveText(
    "Активист",
  );
  await expect(
    page.getByRole("list", { name: "Назначенные задания" }).locator("li"),
  ).toHaveCount(1);
  await page.goto(maruf);
  await expect(page.locator(".people-heading .panel-eyebrow")).toHaveText(
    "Кандидат",
  );
  await page.goto(aziz);
  await expect(
    page.getByText("Нет подтверждённых привязок к заданиям.", { exact: false }),
  ).toBeVisible();
});

test("people-aware backup restore copies identities and old backups retain distinct unverified candidates", async ({
  page,
}) => {
  test.setTimeout(120000);
  await createPersonUI(page, "Ислом", true);
  await createPersonUI(page, "Маруф");
  await importAssignmentPlan(page, "План для восстановления", "");
  await assignUI(page, "Рилс — История кампуса", ["Ислом", "Маруф"]);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Резервная копия", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Скачать все данные" }).click();
  const raw = await readFile((await (await download).path())!, "utf8");
  const backup = JSON.parse(raw);
  expect(backup.formatVersion).toBe(2);
  expect(backup.people).toHaveLength(2);
  await page
    .locator('input[aria-label="Файл резервной копии"]')
    .setInputFiles({
      name: "people.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await expect(page.getByRole("dialog")).toContainText(
    "Профили всегда добавляются отдельными копиями",
  );
  await page
    .getByRole("button", { name: "Подтвердить восстановление", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("профилей: 2");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.goto("/activists");
  await expect(
    page.getByRole("list", { name: "Локальные профили" }).locator("li"),
  ).toHaveCount(4);
  const profileLinks = await page
    .locator(".people-list .person-name")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  expect(new Set(profileLinks).size).toBe(4);
  await page.goto("/");
  const legacy = {
    app: "IPOS.Plan",
    formatVersion: 1,
    createdAt: backup.createdAt,
    schemas: { database: 1, portable: 1 },
    plans: [],
    revisions: [],
    activity: [],
    settings: [
      {
        key: "activist:old-one",
        value: {
          name: "Азиз",
          createdAt: backup.createdAt,
          source: "assignment",
        },
      },
      {
        key: "activist:old-two",
        value: {
          name: "Азиз",
          createdAt: backup.createdAt,
          source: "assignment",
        },
      },
    ],
  };
  await page
    .locator('input[aria-label="Файл резервной копии"]')
    .setInputFiles({
      name: "old.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
  await page
    .getByRole("button", { name: "Подтвердить восстановление", exact: true })
    .click();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.goto("/activists");
  await page.getByRole("searchbox", { name: "Поиск людей" }).fill("Азиз");
  await expect(page.locator(".people-list > li")).toHaveCount(2);
  await expect(page.locator(".people-list .person-identity")).toContainText([
    "Кандидат",
    "Кандидат",
  ]);
});

test("inline candidate creation, unlinking and normal typing keep assignment metadata explicit", async ({
  page,
}) => {
  const plan = await importAssignmentPlan(page, "Новый участник", "");
  await page
    .getByRole("button", {
      name: "Свойства задачи: Рилс — История кампуса",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Добавить нового человека", exact: true })
    .click();
  const form = page.locator(".inline-person-form");
  await form.getByLabel("Имя и фамилия").fill("Азиз");
  await form
    .getByRole("button", { name: "Сохранить профиль", exact: true })
    .click();
  await expect(
    page.locator(
      '.task-brief[data-plan-block="reel-block"] a[href*="/activists/"]',
    ),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Применить назначение", exact: true })
    .click();
  await expect(
    page
      .locator('.task-brief[data-plan-block="reel-block"]')
      .getByRole("link", { name: "Азиз", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Снять привязки людей", exact: true })
    .click();
  await expect(
    page.locator(
      '.task-brief[data-plan-block="reel-block"] a[href*="/activists/"]',
    ),
  ).toHaveCount(0);
  const text = page.getByLabel("Ответственные", { exact: true });
  await text.click();
  await text.pressSequentially("Съёмочная группа");
  await expect(text).toHaveValue("Съёмочная группа");
  await expect(text).toBeFocused();
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();
  await page.goto(plan + "#task=reel");
  await page.locator(".bn-editor").waitFor();
  await expect(
    page.locator('.task-brief[data-plan-block="reel-block"]'),
  ).toContainText("Съёмочная группа");
  await page.goto("/activists");
  await expect(page.locator(".people-list > li")).toHaveCount(1);
  await expect(page.locator(".people-list .person-identity")).toContainText(
    "Кандидат",
  );
});
