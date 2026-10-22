import { type Page } from "@playwright/test";
export async function planAction(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Другие действия", exact: true })
    .click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}
