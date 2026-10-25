import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { PortablePlan } from "../../src/lib/schema/plan";
import { planAction } from "./actions";

const text = (value: string) => [
  { type: "text" as const, text: value, styles: {} },
];
const brief: PortablePlan = {
  schemaVersion: 1,
  title: "Контент-план — Неделя студента",
  blocks: [
    {
      id: "source-title",
      type: "heading",
      props: { level: 1 },
      content: text("Неделя студента"),
    },
    { id: "reel", type: "task", props: { taskId: "one" } },
    {
      id: "requirements",
      type: "heading",
      props: { level: 3 },
      content: text("Требования"),
    },
    {
      id: "list",
      type: "bulletListItem",
      content: text("Вертикальный формат 9:16 · FullHD / 60fps"),
    },
    {
      id: "reference",
      type: "reference",
      props: {
        url: "https://www.instagram.com/reel/example/",
        title: "Ритм монтажа",
        note: "Живой темп и естественный свет",
      },
    },
    {
      id: "picture",
      type: "image",
      props: {
        url: "http://127.0.0.1:3105/qa-export.png",
        caption: "Референс композиции",
      },
    },
    {
      id: "callout",
      type: "callout",
      content: text("Перед съёмкой согласуйте локации. Контакт: @QA_EDITOR"),
    },
    { id: "break", type: "divider" },
    { id: "carousel", type: "task", props: { taskId: "two" } },
    { id: "design", type: "task", props: { taskId: "three" } },
    { id: "reel-two", type: "task", props: { taskId: "four" } },
    {
      id: "editor-note",
      type: "paragraph",
      content: text("Проверьте имена участников и подписи к фотографиям."),
    },
  ],
  tasks: {
    one: {
      id: "one",
      title: "Рилс — Один день студента",
      description:
        "Показать один день в университете через детали: утренний коридор, подготовку к паре и встречу с друзьями. Снять живую историю от первого лица, начать с цепляющего кадра и закончить приглашением присоединиться.",
      assignee: "Редактор, оператор, монтажёр",
      deadline: "2026-10-23",
      status: "in_progress",
      priority: "high",
    },
    two: {
      id: "two",
      title: "Карусель — Люди университета",
      description: "Собрать шесть карточек с короткими историями студентов.",
      assignee: "Дизайнер, редактор",
      status: "review",
      priority: "medium",
    },
    three: {
      id: "three",
      title: "Дизайн — Афиша встречи",
      assignee: "Дизайнер",
      status: "done",
      priority: "low",
    },
    four: {
      id: "four",
      title: "Рилс — Знакомство с медиасектором",
      status: "todo",
      priority: "medium",
    },
  },
  typography: { "editor-note": { fontFamily: "Georgia", fontSize: 17 } },
};
const sizes = [
  [1920, 1080],
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [320, 700],
];

async function importBrief(page: Page) {
  await page.route("**/qa-export.png", (route) =>
    route.fulfill({ path: "public/msu-university-seal.png" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(brief));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await page.locator('.task-brief[data-plan-block="reel"]').waitFor();
}

test("content-heavy workspace fits every viewport, panels resize and collapse, focus mode preserves data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await importBrief(page);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  // Real native containers replace CSS painted across source siblings. Media follows text.
  const taskCard = page.locator('.task-brief[data-plan-block="reel"]');
  const section = page.locator('.bn-block[data-id="reel"]');
  const description = await taskCard
    .locator(".task-description-input")
    .boundingBox();
  const facts = await taskCard.locator(".brief-facts").boundingBox();
  const media = await section.locator(".brief-image").boundingBox();
  expect(description).toBeTruthy();
  expect(facts).toBeTruthy();
  expect(media).toBeTruthy();
  expect(facts!.y - description!.y - description!.height).toBeLessThan(32);
  expect(media!.y).toBeGreaterThan(facts!.y + facts!.height);
  await expect(section.locator(":scope > .node-brief")).toHaveCount(1);
  await expect(section).toHaveCSS("border-bottom-style", "solid");
  await expect(
    section.locator('.bn-block-outer[data-id="requirements"]'),
  ).toBeVisible();
  await expect(
    section.locator('.bn-block-outer[data-id="callout"]'),
  ).toBeVisible();
  const lastNote = await section
    .locator('.bn-block-outer[data-id="callout"]')
    .boundingBox();
  const nextTask = await page
    .locator('.bn-block-outer[data-id="carousel"]')
    .boundingBox();
  expect(nextTask!.y).toBeGreaterThanOrEqual(lastNote!.y + lastNote!.height);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    const copy = await taskCard.locator(".brief-body").boundingBox();
    const image = await section.locator(".brief-image").boundingBox();
    expect(image!.y).toBeGreaterThanOrEqual(copy!.y + copy!.height - 1);
    const paper = page.locator(".plan-paper");
    const geometry = await paper.boundingBox();
    expect(geometry!.x).toBeGreaterThanOrEqual(0);
    expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(width);
    if (width >= 1200) expect(geometry!.width).toBeGreaterThan(794);
    await expect(
      page.locator('.bn-block-outer[data-id="source-title"]'),
    ).toBeHidden();
    const seal = page.locator(".plan-cover .plan-emblem");
    const sealBounds = await seal.boundingBox();
    expect(sealBounds!.width / sealBounds!.height).toBeCloseTo(1, 2);
    await taskCard.getByRole("button", { name: /^Свойства задачи:/ }).click();
    await expect(
      page.getByLabel("Название задачи", { exact: true }),
    ).toHaveValue(brief.tasks.one.title);
    if (width >= 1200) {
      const inspector = page.getByRole("complementary", {
        name: "Свойства выбранного блока",
      });
      const aside = await inspector.boundingBox();
      const sheet = await paper.boundingBox();
      expect(aside!.x).toBeGreaterThanOrEqual(sheet!.x + sheet!.width);
      await page.getByRole("button", { name: "Закрыть свойства" }).click();
      await expect(inspector).toHaveCount(0);
    } else {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect
        .poll(async () => {
          const bounds = (await dialog.boundingBox())!;
          return (
            bounds.x >= 0 &&
            bounds.x + bounds.width <= width &&
            (width >= 768 || Math.round(bounds.y + bounds.height) === height)
          );
        })
        .toBe(true);
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      if (width < 768)
        expect(Math.round(bounds!.y + bounds!.height)).toBe(height);
      await dialog
        .getByRole("button", { name: "Закрыть", exact: true })
        .click();
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const resize = page.getByRole("separator", {
    name: "Изменить ширину структуры плана",
  });
  const width = Number(await resize.getAttribute("aria-valuenow"));
  await resize.focus();
  await page.keyboard.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", String(width + 10));
  await page.reload();
  await expect(resize).toHaveAttribute("aria-valuenow", String(width + 10));
  await page.getByRole("button", { name: "Режим фокуса", exact: true }).click();
  await expect(
    page.locator(".workspace-outline,.workspace-inspector,.workspace-controls"),
  ).toHaveCount(0);
  await expect(page.locator(".plan-paper")).toBeVisible();
  await page
    .getByRole("button", { name: "Выйти из режима фокуса", exact: true })
    .click();
  await expect(page.locator(".workspace-outline")).toBeVisible();
  await planAction(page, "Экспорт");
  const exported = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  ) as PortablePlan;
  expect(exported.tasks).toEqual(brief.tasks);
  expect(exported.typography).toEqual(brief.typography);
  expect(
    exported.blocks.slice(0, brief.blocks.length).map((block) => block.id),
  ).toEqual(brief.blocks.map((block) => block.id));
  expect(exported.blocks[0]).toMatchObject(brief.blocks[0]);
  expect(errors).toEqual([]);
});

test("typography and alignment persist, DOCX remains editable and printing excludes editor chrome", async ({
  page,
}, testInfo) => {
  await importBrief(page);
  await page
    .locator('.bn-block-outer[data-id="editor-note"] .bn-inline-content')
    .click();
  await page.getByLabel("Шрифт", { exact: true }).fill("Montserrat");
  await page.getByLabel("Размер", { exact: true }).selectOption("20");
  await page.getByLabel("Насыщенность", { exact: true }).selectOption("500");
  await page.getByLabel("Выравнивание", { exact: true }).selectOption("center");
  await expect(
    page.getByRole("status").filter({ hasText: "Сохранено локально" }),
  ).toBeVisible();
  await page.reload();
  const note = page.locator(
    '.bn-block-outer[data-id="editor-note"] .bn-inline-content',
  );
  await expect(note).toHaveCSS("font-size", "20px");
  await expect(note).toHaveCSS("font-weight", "500");
  await expect(note).toHaveCSS("text-align", "center");
  await planAction(page, "Экспорт");
  const exported = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  ) as PortablePlan;
  expect(exported.typography?.["editor-note"]).toEqual({
    fontFamily: "Montserrat",
    fontSize: 20,
    fontWeight: "500",
  });
  expect(
    exported.blocks.find((block) => block.id === "editor-note"),
  ).toMatchObject({ props: { textAlignment: "center" } });
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать .docx", exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.docx$/);
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 4).toString("hex")).toBe("504b0304");
  const parts = bytes.toString("utf8");
  expect(parts).toContain("word/document.xml");
  expect(parts).toContain('w:pgSz w:w="11906" w:h="16838"');
  expect(parts).toContain("Один день студента");
  expect(parts).toContain("Montserrat");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  await expect(note).toHaveCSS("font-size", "20px");
  await expect(
    page.locator(
      "[contenteditable=true],.workspace-controls,.workspace-inspector",
    ),
  ).toHaveCount(0);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".preview-bar")).toBeHidden();
  await expect(page.locator(".plan-cover h1")).toBeVisible();
  await expect(
    page.locator('.bn-block-outer[data-id="source-title"]'),
  ).toBeHidden();
  await page.pdf({
    path: testInfo.outputPath("content-plan-a4.pdf"),
    preferCSSPageSize: true,
    printBackground: true,
  });
});

test("dialogs keep keyboard focus inside and return focus after cancellation", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Импорт JSON",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByLabel("JSON плана", { exact: true }).fill("{broken");
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await expect(page.locator('[data-slot="field-error"]')).toBeVisible();
  await expect(dialog).toContainText("JSON");
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
