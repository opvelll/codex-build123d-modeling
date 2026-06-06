import { expect, test } from "playwright/test";

test("loads the generated model manifest and GLB", async ({ page }) => {
  await page.goto("/viewer.html");

  await expect(page.getByRole("button", { name: /Wooden Chair/ })).toBeVisible();
  await expect(page.getByTestId("selected-model-name")).toHaveText("Wooden Chair");
  await expect(page.locator(".load-status").first()).toHaveText("Loaded");
  await expect(page.getByRole("link", { name: "STEP" })).toHaveAttribute(
    "href",
    "/output/chair/chair.step",
  );
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.id)).toBe("chair");
});

test("switches models from the sidebar and keeps camera controls available", async ({ page }) => {
  await page.route("**/output/models.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        models: [
          {
            id: "chair",
            name: "Wooden Chair",
            description: "First model",
            dimensions: { x: 578, y: 520, z: 1055, unit: "mm" },
            files: {
              glb: "/output/chair/chair.glb?model=chair",
              step: "/output/chair/chair.step",
              stl: "/output/chair/chair.stl",
            },
          },
          {
            id: "chair-copy",
            name: "Chair Copy",
            description: "Second model",
            dimensions: { x: 578, y: 520, z: 1055, unit: "mm" },
            files: {
              glb: "/output/chair/chair.glb?model=chair-copy",
              step: "/output/chair/chair.step",
              stl: "/output/chair/chair.stl",
            },
          },
        ],
      }),
    }),
  );

  await page.goto("/viewer.html");
  await expect(page.locator(".load-status").first()).toHaveText("Loaded");
  await page.getByRole("button", { name: /Chair Copy/ }).click();

  await expect(page.getByTestId("selected-model-name")).toHaveText("Chair Copy");
  await expect(page.locator(".load-status").first()).toHaveText("Loaded");
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.url)).toContain("chair-copy");

  const anglePanel = page.locator('[data-view="angle"]');
  const panelBox = await anglePanel.boundingBox();
  expect(panelBox).not.toBeNull();
  const distanceBefore = await page.evaluate(() => {
    const camera = window.__modelViewer.cameras.get("angle");
    return camera.position.length();
  });
  await page.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + panelBox.height / 2);
  await page.mouse.wheel(0, -120);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const camera = window.__modelViewer.cameras.get("angle");
        return camera.position.length();
      }),
    )
    .not.toBe(distanceBefore);
  await expect(anglePanel).toBeVisible();
});
