import { expect, test } from "@playwright/test";

test("loads the door model in the WebGL viewer", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/viewer.html");
  await expect(page.locator("#status")).toHaveText("Loaded", { timeout: 30000 });

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveJSProperty("width", 1280);

  await page.locator("#toggle-spin").click();
  await page.locator("#reset").click();

  expect(consoleErrors).toEqual([]);
});
