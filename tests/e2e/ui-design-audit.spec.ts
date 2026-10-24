import { expect, test, type Page } from "@playwright/test";
import { productivityFixture } from "./productivity-fixture";
import { planAction } from "./actions";

const sizes = [
  [320, 700],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
];
test.use({ reducedMotion: "reduce" });
async function importFixture(page: Page) {
  await page.goto("/");
  await expect(page.locator(".plan-row")).toHaveCount(1);
  const fixture = productivityFixture(new URL(page.url()).origin);
  fixture.title =
    "Редакционная неделя — длинное название плана для проверки переноса текста и действий";
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page).toHaveURL(/\/plan\/[^/#?]+$/);
  await page.locator(".bn-editor").waitFor();
  return { fixture, url: page.url() };
}
async function noOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
}

test("seven widths keep library actions, editor drawers and portable content accessible", async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const { fixture, url } = await importFixture(page);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".plan-row")).toHaveCount(2);
    await noOverflow(page);
    await expect(page.locator(".dashboard-actions button").first()).toHaveText(
      "Новый план",
    );
    // A row's index must not imply selection or priority.
    const rows = await page.locator(".plan-row").evaluateAll((nodes) =>
      nodes.map((node) => {
        const s = getComputedStyle(node);
        return [s.backgroundColor, s.borderLeftWidth, s.borderRadius];
      }),
    );
    expect(rows[0]).toEqual(rows[1]);
    const search = page.getByRole("searchbox", {
      name: "Поиск планов",
      exact: true,
    });
    await search.fill("Ничего не найдено 12345");
    await expect(page.locator(".search-empty")).toBeVisible();
    await page
      .getByRole("button", { name: "Сбросить поиск", exact: true })
      .first()
      .click();
    await expect(page.locator(".plan-row")).toHaveCount(2);
    await page.goto(url);
    await page.locator(".bn-editor").waitFor();
    await noOverflow(page);
    if (width < 768) {
      for (const control of await page
        .locator(".editor-actions button")
        .all()) {
        const box = await control.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
      expect(
        await page
          .locator(".save-status")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(12);
    }
    if (width < 1440) {
      const structure = page.getByRole("button", {
        name: "Структура",
        exact: true,
      });
      await structure.click();
      const outline = page.getByRole("dialog", { name: "Структура плана" });
      await expect(outline).toBeVisible();
      await expect(
        outline.getByRole("button", { name: "Обложка", exact: true }),
      ).toBeVisible();
      await noOverflow(page);
      await page.keyboard.press("Escape");
      await expect(structure).toBeFocused();
      const properties = page.getByRole("button", {
        name: "Свойства",
        exact: true,
      });
      await properties.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByLabel("Название плана", { exact: true }).last(),
      ).toHaveValue(fixture.title);
      await page.keyboard.press("Escape");
      await expect(properties).toBeFocused();
      const taskProperties = page
        .getByRole("button", { name: /^Свойства задачи:/ })
        .first();
      await taskProperties.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(taskProperties).toBeFocused();
    } else {
      await expect(
        page.getByRole("complementary", { name: "Навигация плана" }),
      ).toBeVisible();
    }
  }
  await planAction(page, "Экспорт");
  const exported = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  );
  expect(exported.tasks).toEqual(fixture.tasks);
  expect(exported.blocks).toEqual(fixture.blocks);
  expect(errors).toEqual([]);
});

test("short dialogs retain close, title, actions and keyboard focus while their body scrolls", async ({
  page,
}) => {
  const { url } = await importFixture(page);
  for (const [width, height] of [
    [320, 480],
    [768, 480],
    [1366, 500],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(url);
    await page.locator(".bn-editor").waitFor();
    await planAction(page, "Экспорт");
    const dialog = page.getByRole("dialog", { name: "Экспорт документа" });
    const body = dialog.locator("[data-slot=dialog-body]");
    await expect(body).toBeVisible();
    const before = await dialog.locator(".dialog-header").boundingBox();
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
      true,
    );
    await body.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(
      dialog.getByRole("button", { name: "Скачать .json", exact: true }),
    ).toBeInViewport();
    await expect(
      dialog.getByRole("button", { name: "Закрыть", exact: true }),
    ).toBeInViewport();
    expect((await dialog.locator(".dialog-header").boundingBox())!.y).toBe(
      before!.y,
    );
    await dialog
      .getByRole("button", { name: "Копировать JSON", exact: true })
      .focus();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      expect(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
      ).toBe(true);
    }
    await noOverflow(page);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Другие действия", exact: true }),
    ).toBeFocused();
  }
});

test("mobile screen refinements stay out of the physical A4 print contract", async ({
  page,
}) => {
  await importFixture(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await expect(page.locator(".brief-facts dt").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".editor-bar")).toBeHidden();
  await expect(page.locator(".workspace-controls")).toBeHidden();
  await expect(page.locator(".brief-quick-controls").first()).toBeHidden();
  await expect(page.locator(".brief-facts dt").first()).toHaveCSS(
    "font-size",
    "11px",
  );
  await expect(page.locator(".brief-heading h3").first()).toHaveCSS(
    "font-size",
    "23px",
  );
  const paper = await page.locator(".plan-paper").boundingBox();
  expect(paper!.width).toBeCloseTo((178 * 96) / 25.4, 1);
  await page.emulateMedia({ media: "screen" });
  await noOverflow(page);
});

test("a fresh isolated library has a deliberate empty state and can create and reopen a plan", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await expect(page.locator(".plan-row")).toHaveCount(1);
  await page
    .locator(".plan-row")
    .getByRole("button", { name: /^Удалить / })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить план", exact: true })
    .click();
  await expect(
    page.getByText("Начните с первого плана", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page
    .locator("[data-slot=empty-content]")
    .getByRole("button", { name: "Новый план", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plan\/[^/#?]+$/);
  await page
    .getByLabel("Название плана", { exact: true })
    .fill("Новый сохранённый план");
  await expect(page.locator('.save-status[data-state="saved"]')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Название плана", { exact: true })).toHaveValue(
    "Новый сохранённый план",
  );
});
