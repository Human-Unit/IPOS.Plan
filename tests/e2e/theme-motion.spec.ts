import { expect, test, type Page } from "@playwright/test";
import { productivityFixture } from "./productivity-fixture";
import { planAction } from "./actions";

async function theme(page: Page, _label: string, effective: "light" | "dark") {
  const toggle = page.getByRole("switch", { name: "Тёмная тема", exact: true });
  if ((await toggle.getAttribute("aria-checked")) !== String(effective === "dark"))
    await toggle.click();
  await expect(page.locator("html")).toHaveClass(effective);
  await expect(toggle).toHaveAttribute("aria-checked", String(effective === "dark"));
}
async function importPlan(page: Page) {
  await page.goto("/");
  const fixture = productivityFixture(new URL(page.url()).origin);
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await page.locator(".bn-editor").waitFor();
}
const instrumentation = `(() => {
  window.themeQA = [];
  const start = document.startViewTransition?.bind(document);
  if (!start) return;
  document.startViewTransition = callback => {
    const entry = {before: document.documentElement.className, started: performance.now()};
    window.themeQA.push(entry);
    const transition = start(async () => { await callback(); entry.committed = document.documentElement.className; });
    transition.ready.then(() => {
      entry.snapshot = document.documentElement.className;
      entry.maskedAtStart = document.documentElement.dataset.themeWave === "active";
      entry.initialClip = getComputedStyle(
        document.documentElement, "::view-transition-new(root)"
      ).clipPath;
    }).catch(() => {});
    transition.finished.then(() => { entry.finished = performance.now(); }).catch(() => {});
    return transition;
  };
})();`;

test("legacy device preference becomes dark and no System choice exists", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ipos-plan-theme", "system"));
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(page.getByRole("switch", { name: "Тёмная тема" })).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("ipos-plan-theme"))).toBe("dark");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(page.getByRole("menuitemradio")).toHaveCount(0);
});

test("saved dark preference is applied before hydration scripts run", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.addInitScript(() =>
    localStorage.setItem("ipos-plan-theme", "dark"),
  );
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveClass("dark");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(11, 17, 32)",
    );
    await expect(
      page.getByRole("heading", { name: "Контент-планы", exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(page.locator(".plan-row")).toHaveCount(1);
});

test("dark default and saved light/dark persist without following device appearance", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(instrumentation);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(page.getByRole("switch", { name: "Тёмная тема" })).toHaveAttribute("aria-checked", "true");
  await theme(page, "Светлая", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveClass("light");
  await page.locator(".plan-title").first().click();
  await page.locator(".bn-editor").waitFor();
  await expect(page.locator("html")).toHaveClass("light");
  await theme(page, "Тёмная", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark");
  // Device appearance is never an available user preference.
  await expect(page.getByRole("menuitemradio")).toHaveCount(0);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass("dark");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass("dark");
  expect(
    await page.evaluate(() => localStorage.getItem("ipos-plan-theme")),
  ).toBe("dark");
  expect(await page.evaluate("window.themeQA.length")).toBe(0);
  expect(errors).toEqual([]);
});

test("explicit wave snapshots the committed theme and rapid selections settle safely", async ({
  page,
}) => {
  await page.emulateMedia({
    colorScheme: "light",
    reducedMotion: "no-preference",
  });
  await page.addInitScript(() => localStorage.setItem("ipos-plan-theme", "light"));
  await page.addInitScript(instrumentation);
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass("light");
  await expect(page.locator(".plan-row")).toHaveCount(1);
  expect(await page.evaluate("window.themeQA.length")).toBe(0);
  await theme(page, "Тёмная", "dark");
  await theme(page, "Светлая", "light");
  await expect
    .poll(() => page.evaluate("window.themeQA.filter(x => x.finished).length"))
    .toBe(2);
  const snapshots = await page.evaluate(
    "window.themeQA.map(x => [x.committed,x.snapshot])",
  );
  expect(snapshots).toEqual([
    ["dark", "dark"],
    ["light", "light"],
  ]);
  const firstFrames = await page.evaluate(
    "window.themeQA.map(x => [x.maskedAtStart,x.initialClip])",
  );
  for (const [masked, clip] of firstFrames) {
    expect(masked).toBe(true);
    expect(clip).toMatch(/^polygon\(/);
  }
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-wave", "active");
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--theme-wave-start"))).toBe("");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (a) =>
                a.effect instanceof KeyframeEffect &&
                a.effect.pseudoElement?.includes("view-transition"),
            ).length,
      ),
    )
    .toBe(0);
  const toggle = page.getByRole("switch", { name: "Тёмная тема", exact: true });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveClass("light");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
});

for (const fallback of ["reduced", "unsupported"] as const) {
  test(`${fallback} switches immediately without a view transition`, async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: fallback === "reduced" ? "reduce" : "no-preference",
      colorScheme: "light",
    });
    await page.addInitScript(() => localStorage.setItem("ipos-plan-theme", "light"));
    await page.addInitScript(instrumentation);
    if (fallback === "unsupported")
      await page.addInitScript("document.startViewTransition = undefined");
    await page.goto("/");
    await theme(page, "Тёмная", "dark");
    expect(await page.evaluate("window.themeQA.length")).toBe(0);
    await expect(page.locator("main")).toBeVisible();
  });
}

test("unsaved editing, caret, selection, scroll and editor identity survive a theme wave", async ({
  page,
}) => {
  await page.emulateMedia({
    colorScheme: "light",
    reducedMotion: "no-preference",
  });
  await page.addInitScript(() => localStorage.setItem("ipos-plan-theme", "light"));
  await importPlan(page);
  const field = page.locator(".task-description-input").first();
  await field.fill("Несохранённый текст — проверка темы и позиции курсора.");
  await field.evaluate((element) => {
    const input = element as HTMLTextAreaElement;
    input.focus();
    input.setSelectionRange(6, 17);
  });
  await page.locator(".bn-editor").evaluate((element) => {
    (window as Window & { originalEditor?: Element }).originalEditor = element;
  });
  await page.evaluate(() => scrollTo(0, 180));
  const scroll = await page.evaluate(() => scrollY);
  // A real pointer leaves the sticky header in place. locator.click() invokes
  // scrollIntoView first, which itself scrolls a sticky child back to its origin.
  const trigger = (await page
    .getByRole("switch", { name: "Тёмная тема", exact: true })
    .boundingBox())!;
  await page.mouse.click(
    trigger.x + trigger.width / 2,
    trigger.y + trigger.height / 2,
  );
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(field).toBeFocused();
  expect(
    await field.evaluate((element) => [
      (element as HTMLTextAreaElement).selectionStart,
      (element as HTMLTextAreaElement).selectionEnd,
    ]),
  ).toEqual([6, 17]);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  expect(
    await page
      .locator(".bn-editor")
      .evaluate(
        (element) =>
          element ===
          (window as Window & { originalEditor?: Element }).originalEditor,
      ),
  ).toBe(true);
  await expect(field).toHaveValue(
    "Несохранённый текст — проверка темы и позиции курсора.",
  );
  await expect(page.locator(".save-status")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await page.reload();
  await expect(page.locator(".task-description-input").first()).toHaveValue(
    "Несохранённый текст — проверка темы и позиции курсора.",
  );
});

test("dark portals and notifications, paper-white Document and equivalent print/JSON", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("ipos-plan-theme", "light"));
  await importPlan(page);
  await planAction(page, "Экспорт");
  const before = await page.getByLabel("JSON для экспорта").inputValue();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Закрыть", exact: true })
    .click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".plan-paper")).toHaveCSS("width", /672/);
  const print = () =>
    page.locator(".plan-paper").evaluate((element) => {
      const css = getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
        background: css.backgroundColor,
        foreground: css.color,
        title: getComputedStyle(element.querySelector("h3")!).fontSize,
        text: element.textContent,
      };
    });
  const lightPrint = await print();
  await page.emulateMedia({ media: "screen" });
  await theme(page, "Тёмная", "dark");
  await planAction(page, "Сохранить версию");
  await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute(
    "data-sonner-theme",
    "dark",
  );
  await planAction(page, "Экспорт");
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(21, 31, 49)",
  );
  expect(await page.getByLabel("JSON для экспорта").inputValue()).toBe(before);
  await page.keyboard.press("Escape");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".plan-paper")).toHaveCSS("width", /672/);
  expect(await print()).toEqual(lightPrint);
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("radio", { name: "Документ", exact: true }).click();
  await expect(page.locator(".plan-paper")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator(".plan-paper")).toHaveCSS("color-scheme", "light");
  await expect(page.locator("[contenteditable=true]")).toHaveCount(0);
});

test("BlockNote text selection and open dialog drafts survive theme changes", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("ipos-plan-theme", "light"));
  await importPlan(page);
  const paragraph = page
    .locator(
      '.bn-block-content[data-content-type="bulletListItem"] .bn-inline-content',
    )
    .first();
  await paragraph.click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(" Проверка курсора BlockNote.");
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.up("Shift");
  const selection = () =>
    page.evaluate(() => {
      const selected = getSelection();
      return {
        text: selected?.toString(),
        anchor: selected?.anchorOffset,
        focus: selected?.focusOffset,
      };
    });
  const before = await selection();
  await theme(page, "Тёмная", "dark");
  expect(await selection()).toEqual(before);
  await expect(page.locator(".save-status")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await page.reload();
  await expect(paragraph).toContainText("Проверка курсора BlockNote.");
  await theme(page, "Светлая", "light");
  await planAction(page, "Импорт");
  const draft = page.getByLabel("JSON плана", { exact: true });
  await draft.fill("Текст для проверки открытого диалога");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass("light");
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(draft).toHaveValue("Текст для проверки открытого диалога");
  await expect(draft).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("desktop panels exit without interactive ghosts or remounting the editor", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("ipos-plan-theme", "light"));
  await importPlan(page);
  await page.locator(".bn-editor").evaluate((element) => {
    (window as Window & { panelEditor?: Element }).panelEditor = element;
  });
  const properties = page.getByRole("button", {
    name: "Свойства",
    exact: true,
  });
  await properties.click();
  const panel = page.locator(".workspace-inspector");
  await expect(panel).toBeVisible();
  await page
    .getByRole("button", { name: "Закрыть свойства", exact: true })
    .click();
  await expect(panel).toHaveAttribute("inert", "");
  await expect(properties).toBeFocused();
  await expect(panel).toHaveCount(0);
  const outline = page.getByRole("button", { name: "Структура", exact: true });
  await outline.click();
  await expect(page.locator(".workspace-outline")).toHaveAttribute("inert", "");
  await expect(page.locator(".workspace-outline")).toHaveCount(0);
  await outline.click();
  await expect(
    page.getByRole("complementary", { name: "Навигация плана" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".bn-editor")
      .evaluate(
        (element) =>
          element ===
          (window as Window & { panelEditor?: Element }).panelEditor,
      ),
  ).toBe(true);
});
