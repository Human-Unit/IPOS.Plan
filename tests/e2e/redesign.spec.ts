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
  // Brief's text, references and task metadata share one readable column.
  // The optional image is the second column rather than causing a large blank
  // region between the description and its references.
  const brief = page.locator('.task-brief[data-plan-block="reel"]');
  const description = await brief.locator(".brief-description").boundingBox();
  const references = await brief.locator(".brief-references").boundingBox();
  const facts = await brief.locator(".brief-facts").boundingBox();
  const media = await brief.locator(".brief-media").boundingBox();
  expect(description).toBeTruthy();
  expect(references).toBeTruthy();
  expect(facts).toBeTruthy();
  expect(media).toBeTruthy();
  expect(Math.abs(references!.x - description!.x)).toBeLessThan(2);
  expect(Math.abs(facts!.x - description!.x)).toBeLessThan(2);
  expect(media!.x).toBeGreaterThan(description!.x + description!.width + 8);
  expect(references!.x + references!.width).toBeLessThan(media!.x - 8);
  expect(references!.y - (description!.y + description!.height)).toBeLessThan(42);
  const firstTask = page.locator('.bn-block-outer[data-id="reel"]');
  const requirements = page.locator('.bn-block-outer[data-id="requirements"]');
  const lastNote = page.locator('.bn-block-outer[data-id="callout"]');
  const nextTask = page.locator('.bn-block-outer[data-id="carousel"]');
  await expect(firstTask).toHaveCSS("background-color", "rgb(249, 250, 255)");
  await expect(requirements).toHaveCSS("background-color", "rgb(249, 250, 255)");
  await expect(lastNote).toHaveCSS("border-bottom-style", "solid");
  await expect(nextTask).toHaveCSS("border-top-style", "solid");
  const positions = await Promise.all([lastNote, nextTask].map(async (node) => {
    const bounds = await node.boundingBox();
    return bounds!;
  }));
  expect(positions[1].y).toBeGreaterThan(positions[0].y + positions[0].height);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    if (width < 768) {
      const copy = await page.locator('.task-brief[data-plan-block="reel"] .brief-copy').boundingBox();
      const image = await page.locator('.task-brief[data-plan-block="reel"] .brief-media').boundingBox();
      expect(image!.y).toBeGreaterThanOrEqual(copy!.y + copy!.height - 1);
    }
    const paper = page.locator(".plan-paper");
    const geometry = await paper.boundingBox();
    expect(geometry!.x).toBeGreaterThanOrEqual(0);
    expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(width);
    if (width >= 1024)
      expect(geometry!.width).toBeCloseTo((210 * 96) / 25.4, 1);
    await expect(
      page.locator('.bn-block-outer[data-id="source-title"]'),
    ).toBeHidden();
    const seal = page.locator(".plan-cover .plan-emblem");
    const sealBounds = await seal.boundingBox();
    expect(sealBounds!.width / sealBounds!.height).toBeCloseTo(1, 2);
    await page
      .locator('.task-brief[data-plan-block="reel"] .brief-heading')
      .click();
    await expect(
      page.getByLabel("Название задачи", { exact: true }),
    ).toHaveValue(brief.tasks.one.title);
    if (width >= 1440) {
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
