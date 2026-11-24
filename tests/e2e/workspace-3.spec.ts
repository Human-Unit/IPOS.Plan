import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { PortablePlan } from "../../src/lib/schema/plan";
import { planAction } from "./actions";

const text = (text: string) => [{ type: "text" as const, text, styles: {} }];
const fixture: PortablePlan = {
  schemaVersion: 1,
  title: "Контент-план — Октябрь 2026",
  tasks: Object.fromEntries(
    [
      "Рилс — Кампус",
      "Рилс — Команда",
      "Карусель — Люди",
      "Дизайн — Афиша",
      "Фотография — Очень длинное название задания, которое должно переноситься и оставаться полностью доступным",
    ].map((title, i) => [
      `t${i}`,
      {
        id: `t${i}`,
        title,
        description:
          i === 4
            ? undefined
            : i === 1
              ? "Короткая история"
              : "Снять живую историю о студенческой жизни. ".repeat(5),
        status: i === 1 ? "done" : "todo",
        priority: "medium",
        assignee: "Редактор, оператор",
      },
    ]),
  ),
  blocks: [],
  typography: { requirement: { fontFamily: "Georgia", fontSize: 18 } },
};
fixture.blocks = [
  {
    id: "title",
    type: "heading",
    props: { level: 1 },
    content: text("Октябрь 2026"),
  },
  ...Array.from({ length: 5 }, (_, i) => [
    {
      id: `task-${i}`,
      type: "task" as const,
      props: { taskId: `t${i}` },
      ...(i === 4
        ? {
            children: [
              {
                id: "original-child",
                type: "paragraph" as const,
                content: text("Оригинальное вложенное содержание"),
              },
            ],
          }
        : {}),
    },
    {
      id: `paragraph-${i}`,
      type: "paragraph" as const,
      content: text(`Инструкция ${i}`),
    },
    { id: `divider-${i}`, type: "divider" as const },
  ]).flat(),
];
fixture.blocks.splice(3, 0, {
  id: "requirement",
  type: "bulletListItem",
  content: text("Технические требования"),
  children: [
    {
      id: "nested",
      type: "paragraph",
      content: text("Вертикальный формат 9:16"),
    },
  ],
});

async function load(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page.locator(".task-brief")).toHaveCount(5);
}
async function exported(page: import("@playwright/test").Page) {
  await planAction(page, "Экспорт");
  const value = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  ) as PortablePlan;
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  return value;
}

test("workspace/document share canonical data; direct task commands and undo preserve complete briefs", async ({
  page,
}) => {
  await load(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const initial = await exported(page);
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 700],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(".mode-workspace")).toBeVisible();
    await expect(page.locator(".task-status:visible")).toHaveCount(5);
    const identity = await page.locator(".editor-identity").boundingBox();
    const modes = await page.locator(".experience-switch").boundingBox();
    expect(
      identity!.x + identity!.width <= modes!.x + 1 ||
        identity!.y + identity!.height <= modes!.y + 1,
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByText("Документ", { exact: true }).click();
    await expect(
      page.locator("[contenteditable=true],.brief-insert,.workspace-controls"),
    ).toHaveCount(0);
    const paper = await page.locator(".plan-paper").boundingBox();
    expect(paper!.width).toBeLessThanOrEqual(794);
    await page.getByRole("radio", { name: "Рабочий стол", exact: true }).click();
  }
  expect(await exported(page)).toEqual(initial);
  await page.setViewportSize({ width: 1440, height: 900 });
  const task = page.locator('.task-brief[data-plan-block="task-0"]');
  await task
    .getByLabel("Название: Рилс — Кампус", { exact: true })
    .fill("Рилс — Новая идея");
  await task
    .getByLabel("Статус задачи: Рилс — Новая идея", { exact: true })
    .selectOption("review");
  await task
    .getByRole("button", {
      name: "Свернуть задачу: Рилс — Новая идея",
      exact: true,
    })
    .click();
  await expect(
    page.locator('.bn-block-outer[data-id="requirement"]'),
  ).toBeHidden();
  await page.emulateMedia({ media: "print" });
  await expect(task.locator("select.task-status")).toBeHidden();
  await expect(task.locator(".print-task-status")).toBeVisible();
  await expect(task.locator(".print-task-description")).toBeVisible();
  await expect(
    page.locator('.bn-block-outer[data-id="requirement"]'),
  ).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await task
    .getByRole("button", {
      name: "Развернуть задачу: Рилс — Новая идея",
      exact: true,
    })
    .click();
  await expect(
    page.locator('.bn-block-outer[data-id="requirement"]'),
  ).toBeVisible();
  await task
    .getByRole("button", {
      name: "Действия задачи: Рилс — Новая идея",
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", { name: "Дублировать задачу", exact: true })
    .click();
  await expect(page.locator(".task-brief")).toHaveCount(6);
  const copy = await exported(page);
  expect(
    Object.values(copy.tasks).filter((t) => t.title.endsWith("— копия")),
  ).toHaveLength(1);
  expect(copy.blocks.filter((b) => b.type === "bulletListItem")).toHaveLength(
    2,
  );
  await task
    .getByRole("button", {
      name: "Действия задачи: Рилс — Новая идея",
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", { name: "Переместить ниже", exact: true })
    .click();
  const moved = await exported(page);
  expect(moved.blocks.filter((b) => b.type === "task")[1].id).toBe("task-0");
  expect(moved.blocks.find((b) => b.id === "requirement")?.children).toEqual(
    fixture.blocks.find((b) => b.id === "requirement")?.children,
  );
  await task
    .getByRole("button", {
      name: "Действия задачи: Рилс — Новая идея",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Control+z");
  expect(
    (await exported(page)).blocks.filter((block) => block.type === "task")[0]
      .id,
  ).toBe("task-0");
  await page
    .getByRole("button", { name: "Другие действия", exact: true })
    .focus();
  await page.keyboard.press("Control+Shift+z");
  expect(
    (await exported(page)).blocks.filter((block) => block.type === "task")[1]
      .id,
  ).toBe("task-0");
  await expect(
    page.getByRole("status").filter({ hasText: "Сохранено локально" }),
  ).toBeVisible();
  await page.reload();
  expect((await exported(page)).blocks).toEqual(moved.blocks);
  await task.getByRole("button", { name: "Требование", exact: true }).click();
  await page.keyboard.type("Новое требование из задания");
  await task.getByRole("button", { name: "Референс", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Свойства выбранного блока" }),
  ).toBeVisible();
  const added = await exported(page);
  expect(added.blocks.some((block) => block.type === "reference")).toBe(true);
  expect(JSON.stringify(added.blocks)).toContain("Новое требование из задания");
  expect(errors).toEqual([]);
});

test("portable files, paste, drop, replacement, JSON, snapshot and DOCX preserve image bytes", async ({
  page,
  context,
}) => {
  await load(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const task = page.locator('.task-brief[data-plan-block="task-0"]');
  const attach = page.waitForEvent("filechooser");
  await task.getByRole("button", { name: "Файл", exact: true }).press("Enter");
  await (await attach).setFiles({
    name: "seal.png",
    mimeType: "image/png",
    buffer: await readFile("public/msu-university-seal.png"),
  });
  await expect(
    page.getByRole("img", { name: "seal.png", exact: true }),
  ).toBeVisible();
  const portable = await exported(page);
  const image = portable.blocks.find((block) => block.type === "image")!;
  expect(image.type === "image" && image.props.url).toMatch(
    /^data:image\/(webp|png);base64,/,
  );
  // Export reads the current draft; it does not flush the 700ms autosave.
  // Wait for persisted state before testing reload on faster CI runners.
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "seal.png", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Изображение: seal.png", exact: true })
    .click();
  const replace = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Заменить файлом", exact: true })
    .click();
  await (await replace).setFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: await readFile("public/msu-university-seal.png"),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Сохранено локально" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Закрыть свойства", exact: true })
    .click();
  await page.evaluate(
    async (bytes) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": new Blob([Uint8Array.from(bytes)], {
            type: "image/png",
          }),
        }),
      ]);
    },
    [...(await readFile("public/msu-university-seal.png"))],
  );
  await task.locator(".task-description-input").click();
  await page.keyboard.press("Control+v");
  await expect(page.locator(".brief-image")).toHaveCount(2);
  const transfer = await page.evaluateHandle(
    (bytes) => {
      const data = new DataTransfer();
      data.items.add(
        new File([Uint8Array.from(bytes)], "drop.png", { type: "image/png" }),
      );
      return data;
    },
    [...(await readFile("public/msu-university-seal.png"))],
  );
  await task.dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.locator(".brief-image")).toHaveCount(3);
  await expect(page.locator('[data-content-type="mediaStrip"]')).toHaveCount(1);
  await page
    .getByRole("button", { name: "Увеличить изображение", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  const event = page.waitForEvent("download");
  await planAction(page, "Экспорт");
  await page
    .getByRole("button", { name: "Скачать .docx", exact: true })
    .click();
  const bytes = await readFile((await (await event).path())!);
  expect(bytes.toString("utf8")).toContain("Оригинальное вложенное содержание");
  expect(bytes.toString("utf8")).toContain("word/media/export-");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Поделиться", exact: true }).click();
  await page.getByRole("button", { name: "Ссылка на снимок", exact: true }).click();
  const link = await page.getByLabel("Самодостаточная ссылка").inputValue();
  const viewer = await context.newPage();
  await viewer.goto(link);
  await expect(
    viewer.getByRole("img", { name: "seal.png", exact: true }),
  ).toBeVisible();
  await viewer.reload();
  await expect(
    viewer.getByRole("img", { name: "seal.png", exact: true }),
  ).toBeVisible();
  await expect(
    viewer.locator("input,textarea,select,[contenteditable=true]"),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
