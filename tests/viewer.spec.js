import { expect, test } from "@playwright/test";

test("loads the door model in the WebGL viewer", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/viewer.html");
  await expect(page.locator("#status")).toHaveText("Loaded", { timeout: 30000 });
  await expect(page.locator("#part-count")).not.toHaveText("-");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveJSProperty("width", 1280);
  await expect(page.locator(".label")).toHaveCount(4);

  const hasRenderedPixels = await canvas.evaluate((element) => {
    const context = element.getContext("webgl2") || element.getContext("webgl");
    if (!context) return false;

    const width = element.width;
    const height = element.height;
    const sample = new Uint8Array(4);
    const background = [238, 242, 241];
    for (let xStep = 2; xStep <= 8; xStep += 1) {
      for (let yStep = 2; yStep <= 8; yStep += 1) {
        const x = Math.floor((width * xStep) / 10);
        const y = Math.floor((height * yStep) / 10);
        context.readPixels(x, height - y, 1, 1, context.RGBA, context.UNSIGNED_BYTE, sample);
        const delta =
          Math.abs(sample[0] - background[0]) +
          Math.abs(sample[1] - background[1]) +
          Math.abs(sample[2] - background[2]);
        if (sample[3] > 0 && delta > 42) return true;
      }
    }
    return false;
  });
  expect(hasRenderedPixels).toBe(true);

  await page.locator("#toggle-spin").click();
  await expect(page.locator("#toggle-spin")).toHaveAttribute("aria-pressed", "false");
  await page.locator('[data-view="front"]').click();
  await page.locator('[data-view="hardware"]').click();
  await page.locator("#toggle-labels").uncheck();
  await expect(page.locator(".label").first()).toBeHidden();
  await page.locator("#reset").click();

  expect(consoleErrors).toEqual([]);
});
