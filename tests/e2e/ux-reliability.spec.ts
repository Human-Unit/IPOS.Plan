import { expect, test, type Page } from "@playwright/test";
import { planAction } from "./actions";

const sizes = [
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [320, 700],
];
const taskTitle = "UX audit task";
async function load(page: Page) {
  await page.goto("/");
  const fixture = {
    schemaVersion: 1,
    title: "Проверка UX 3.0.1",
    tasks: {
      audit: {
        id: "audit",
        title: taskTitle,
        description: "Описание задания",
        status: "todo",
        priority: "medium",
        deadline: "2026-10-23",
      },
    },
    blocks: [
      { id: "audit-task", type: "task", props: { taskId: "audit" } },
      {
        id: "audit-text",
        type: "paragraph",
        content: [
          { type: "text", text: "Редактируемый текст задания", styles: {} },
        ],
      },
      {
        id: "audit-image",
        type: "image",
        props: {
          url: new URL("/msu-university-seal.png", page.url()).href,
          caption: "Эмблема для проверки",
        },
      },
    ],
  };
  await page.getByRole("button", { name: "Импорт JSON", exact: true }).click();
  await page
    .getByLabel("JSON плана", { exact: true })
    .fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "Проверить и посмотреть" }).click();
  await page.getByRole("button", { name: "Подтвердить импорт" }).click();
  await expect(page.locator(".task-brief")).toHaveCount(1);
}
async function exported(page: Page) {
  await planAction(page, "Экспорт");
  const value = JSON.parse(
    await page.getByLabel("JSON для экспорта").inputValue(),
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  return value;
}
async function properties(page: Page) {
  await page
    .locator(".task-brief")
    .getByRole("button", { name: `Свойства задачи: ${taskTitle}`, exact: true })
    .click();
}
async function closeProperties(page: Page) {
  const drawer = page.getByRole("dialog", {
    name: "Свойства блока",
    exact: true,
  });
  if (await drawer.isVisible())
    await drawer.getByRole("button", { name: "Закрыть", exact: true }).click();
  else
    await page
      .getByRole("button", { name: "Закрыть свойства", exact: true })
      .click();
}

test("Escape exits focus after overlays and preserves editor content and selection", async ({
  page,
}) => {
  await load(page);
  const initial = await exported(page);
  await properties(page);
  await page.getByRole("button", { name: "Режим фокуса", exact: true }).click();
  await expect(
    page.locator(".workspace-outline,.workspace-inspector"),
  ).toHaveCount(0);
  const paragraph = page.locator(
    '.bn-block-outer[data-id="audit-text"] .bn-inline-content',
  );
  await paragraph.click();
  await page.keyboard.press("End");
  const selection = () =>
    page.evaluate(() => ({
      text: window.getSelection()?.anchorNode?.textContent,
      offset: window.getSelection()?.anchorOffset,
    }));
  const before = await selection();
  await page.keyboard.press("Escape");
  await expect(page.locator(".focus-stage")).toHaveCount(0);
  expect(await selection()).toEqual(before);
  await expect(
    page.locator(".workspace-outline,.workspace-inspector"),
  ).toHaveCount(2);

  await page.getByRole("button", { name: "Режим фокуса", exact: true }).click();
  await page
    .getByRole("button", { name: "Другие действия", exact: true })
    .click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.locator(".focus-stage")).toHaveCount(1);
  await planAction(page, "Экспорт");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".focus-stage")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Увеличить изображение", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".focus-stage")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".focus-stage")).toHaveCount(0);
  expect(await exported(page)).toEqual(initial);

  await page.getByRole("button", { name: "Режим фокуса", exact: true }).click();
  await paragraph.click();
  await page.keyboard.press("End");
  await page.keyboard.type("/");
  const typed = await paragraph.innerText();
  expect(typed.replace("/", "")).toBe("Редактируемый текст задания");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator(".focus-stage")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".focus-stage")).toHaveCount(0);
  expect(
    (await exported(page)).blocks.find(
      (block: { id: string }) => block.id === "audit-text",
    ).content[0].text,
  ).toBe(typed);
});

test("History flushes direct edits and distinguishes immutable events from restorable revisions", async ({
  page,
}) => {
  await load(page);
  await page.locator(".task-title-input").fill("Переименованная задача");
  await page
    .locator(".task-description-input")
    .fill("Подробное описание, которое не должно попадать в журнал");
  await page
    .getByLabel("Статус задачи: Переименованная задача", { exact: true })
    .selectOption("review");
  await planAction(page, "История");
  const activity = page.locator(".activity-list");
  await expect(activity).toContainText(
    "Задача переименована: «UX audit task» → «Переименованная задача»",
  );
  await expect(activity).toContainText(
    "Изменено описание задачи «Переименованная задача»",
  );
  await expect(activity).toContainText(
    "Статус задачи «Переименованная задача»: На проверке",
  );
  await expect(activity).not.toContainText("Подробное описание");
  await expect(page.getByRole("dialog")).toContainText(
    "полные снимки для восстановления",
  );
  await expect(page.locator(".revision-list button")).toHaveCount(0);
  const count = await activity.locator("li").count();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await planAction(page, "История");
  await expect(activity.locator("li")).toHaveCount(count);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .locator(".task-brief")
    .getByRole("button", { name: "Референс", exact: true })
    .click();
  await page.locator(".brief-reference").click();
  await page
    .getByLabel("Название референса", { exact: true })
    .fill("Референс аудита");
  await page
    .getByLabel("Ссылка", { exact: true })
    .fill("https://example.org/audit");
  await planAction(page, "История");
  await expect(activity).toContainText("Референс аудита");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.locator(".brief-reference").click();
  await page
    .getByLabel("Название референса", { exact: true })
    .fill("Новый референс");
  await page
    .getByLabel("Ссылка", { exact: true })
    .fill("https://example.org/updated");
  await planAction(page, "История");
  await expect(activity).toContainText(
    "Изменён референс: «Референс аудита» → «Новый референс»",
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.locator(".brief-reference").click();
  await page.getByRole("button", { name: "Удалить блок", exact: true }).click();
  await planAction(page, "История");
  await expect(activity).toContainText("Удалён референс «Новый референс»");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.reload();
  await planAction(page, "История");
  await expect(activity).toContainText("Удалён референс «Новый референс»");
});

test("mobile notifications stay compact, replace successes and retain errors", async ({
  page,
}) => {
  await load(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [width, height] of [
    [390, 844],
    [320, 700],
  ]) {
    await page.setViewportSize({ width, height });
    await planAction(page, "Сохранить версию");
    await planAction(page, "Экспорт");
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Скачать .docx", exact: true })
      .click();
    await download;
    await page
      .getByRole("button", { name: "Копировать JSON", exact: true })
      .click();
    const visible = page.locator(
      '[data-sonner-toast][data-visible="true"]:not([data-removed="true"])',
    );
    await expect(visible).toHaveCount(1);
    await expect(visible).toContainText("JSON скопирован");
    const toastBox = await visible.boundingBox();
    const footer = await page
      .getByRole("button", { name: "Скачать .json", exact: true })
      .boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(toastBox!.y);
    await expect(visible).toHaveCount(0, { timeout: 6000 });
    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          Promise.reject(
            new Error("Не удалось скопировать. Повторите действие."),
          ),
      },
    }),
  );
  await planAction(page, "Экспорт");
  await page
    .getByRole("button", { name: "Копировать JSON", exact: true })
    .click();
  const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
  await expect(errorToast).toContainText("Не удалось скопировать");
  await page.waitForTimeout(2500); // Intentionally longer than routine success lifetime.
  await expect(errorToast).toBeVisible();
  const closeBounds = await page
    .getByRole("button", { name: "Закрыть уведомление", exact: true })
    .boundingBox();
  const errorBounds = await errorToast.boundingBox();
  expect(closeBounds!.width).toBeGreaterThanOrEqual(30);
  expect(closeBounds!.x).toBeGreaterThanOrEqual(errorBounds!.x);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать .docx", exact: true })
    .click();
  await download;
  await expect(errorToast).toBeVisible();
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Закрыть уведомление", exact: true })
    .click();
  await expect(errorToast).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Экспорт документа", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Russian deadline calendar supports keyboard selection and ISO persistence at every size", async ({
  page,
  context,
}) => {
  await load(page);
  let day = 23;
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await properties(page);
    const trigger = page.getByRole("button", {
      name: "Выбрать дедлайн",
      exact: true,
    });
    await expect(trigger).toHaveAccessibleName("Выбрать дедлайн");
    await expect(trigger).toContainText(`${day}.10.2026`);
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    const calendar = page.getByRole("dialog", {
      name: "Календарь дедлайна",
      exact: true,
    });
    await expect(calendar).toBeVisible();
    await expect(
      calendar.getByRole("button", {
        name: "Перейти к следующему месяцу",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      calendar.getByRole("button", {
        name: "Перейти к предыдущему месяцу",
        exact: true,
      }),
    ).toBeVisible();
    const selected = calendar.getByRole("button", {
      name: new RegExp(`${day} октября 2026.*выбрано`),
    });
    await selected.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    day++;
    await expect(calendar).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText(`${day}.10.2026`);
    await closeProperties(page);
    expect((await exported(page)).tasks.audit.deadline).toBe(`2026-10-${day}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.reload();
  await properties(page);
  const trigger = page.getByRole("button", {
    name: "Выбрать дедлайн",
    exact: true,
  });
  await expect(trigger).toContainText("28.10.2026");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Свойства блока", exact: true }),
  ).toBeVisible();
  await expect(trigger).toBeFocused();
  const cdp = await context.newCDPSession(page);
  const ax = await cdp.send("Accessibility.getFullAXTree");
  expect(
    ax.nodes.some((n) => /Show date picker/.test(String(n.name?.value))),
  ).toBe(false);
  await trigger.click();
  await page
    .getByRole("button", { name: "Убрать дедлайн", exact: true })
    .click();
  await closeProperties(page);
  expect((await exported(page)).tasks.audit.deadline).toBeUndefined();
});
