import { expect, test } from "playwright/test";

function testGlb() {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    buffers: [{ byteLength: 44 }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 },
      { buffer: 0, byteOffset: 36, byteLength: 6, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-250, 0, -250],
        max: [250, 1000, 250],
      },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
    ],
  });
  const jsonLength = Math.ceil(Buffer.byteLength(json) / 4) * 4;
  const binary = Buffer.alloc(44);
  new Float32Array(binary.buffer, binary.byteOffset, 9).set([
    -250, 0, -250, 250, 0, -250, 0, 1000, 250,
  ]);
  new Uint16Array(binary.buffer, binary.byteOffset + 36, 3).set([0, 1, 2]);

  const glb = Buffer.alloc(12 + 8 + jsonLength + 8 + binary.length);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  glb.write(json.padEnd(jsonLength, " "), 20);
  glb.writeUInt32LE(binary.length, 20 + jsonLength);
  glb.writeUInt32LE(0x004e4942, 24 + jsonLength);
  binary.copy(glb, 28 + jsonLength);
  return glb;
}

const TEST_GLB = testGlb();

test.beforeEach(async ({ page }) => {
  await page.route("**/*.glb?model=*", (route) =>
    route.fulfill({ contentType: "model/gltf-binary", body: TEST_GLB }),
  );
});

test("shows the empty state for an empty manifest", async ({ page }) => {
  await page.route("**/output/models.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ defaultModelId: null, models: [] }),
    }),
  );
  await page.goto("/viewer.html");

  await expect(page.getByRole("button", { name: "All Models 0" })).toBeVisible();
  await expect(page.locator(".empty-state")).toHaveText(
    "No models are listed in output/models.json.",
  );
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("switches models from the sidebar and keeps camera controls available", async ({ page }) => {
  await page.route("**/output/models.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        defaultModelId: "chair",
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
  await expect(page.locator(".load-status").first()).toHaveText("Loaded", { timeout: 15000 });
  await page.evaluate(() => {
    window.__initialViewerCanvas = document.querySelector("canvas");
  });
  await page.getByRole("button", { name: /Chair Copy/ }).click();

  await expect(page.getByTestId("selected-model-name")).toHaveText("Chair Copy");
  await expect(page.locator(".load-status").first()).toHaveText("Loaded", { timeout: 15000 });
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.url)).toContain("chair-copy");
  expect(
    await page.evaluate(() => window.__initialViewerCanvas === document.querySelector("canvas")),
  ).toBe(true);
  const cameraDirections = await page.evaluate(() => {
    const cameras = window.__modelViewer.cameras;
    return {
      angle: cameras.get("angle").position.toArray(),
      front: cameras.get("front").position.toArray(),
      back: cameras.get("back").position.toArray(),
      top: cameras.get("top").position.toArray(),
      topUp: cameras.get("top").up.toArray(),
    };
  });
  const centerX = (cameraDirections.front[0] + cameraDirections.back[0]) / 2;
  const centerZ = (cameraDirections.front[2] + cameraDirections.back[2]) / 2;
  expect(cameraDirections.angle[0]).toBeGreaterThan(centerX);
  expect(cameraDirections.angle[2]).toBeGreaterThan(centerZ);
  expect(cameraDirections.front[2]).toBeGreaterThan(centerZ);
  expect(cameraDirections.back[2]).toBeLessThan(centerZ);
  expect(cameraDirections.top[0]).toBeCloseTo(centerX);
  expect(cameraDirections.top[2]).toBeCloseTo(centerZ);
  expect(cameraDirections.topUp).toEqual([0, 0, -1]);

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

test("caches loaded GLBs and preloads models from the sidebar", async ({ page }) => {
  const requestCounts = new Map();
  page.on("request", (request) => {
    if (!request.url().includes(".glb?model=")) return;
    const model = new URL(request.url()).searchParams.get("model");
    requestCounts.set(model, (requestCounts.get(model) ?? 0) + 1);
  });
  await page.route("**/output/models.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        defaultModelId: "chair",
        models: [
          {
            id: "chair",
            name: "Wooden Chair",
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
  const copyButton = page.getByRole("button", { name: "Chair Copy" });
  await copyButton.hover();
  await expect.poll(() => requestCounts.get("chair-copy")).toBe(1);
  await copyButton.click();
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.id)).toBe("chair-copy");
  await page.getByRole("button", { name: "Wooden Chair" }).click();
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.id)).toBe("chair");
  await copyButton.click();
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.id)).toBe("chair-copy");

  expect(requestCounts.get("chair")).toBe(1);
  expect(requestCounts.get("chair-copy")).toBe(1);
});

test("keeps the latest model selected when loads finish out of order", async ({ page }) => {
  await page.route("**/*.glb?model=slow", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({ contentType: "model/gltf-binary", body: TEST_GLB });
  });
  await page.route("**/output/models.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        defaultModelId: "chair",
        models: [
          {
            id: "chair",
            name: "Wooden Chair",
            dimensions: { x: 578, y: 520, z: 1055, unit: "mm" },
            files: {
              glb: "/output/chair/chair.glb?model=chair",
              step: "/output/chair/chair.step",
              stl: "/output/chair/chair.stl",
            },
          },
          {
            id: "slow",
            name: "Slow Chair",
            dimensions: { x: 578, y: 520, z: 1055, unit: "mm" },
            files: {
              glb: "/output/chair/chair.glb?model=slow",
              step: "/output/chair/chair.step",
              stl: "/output/chair/chair.stl",
            },
          },
          {
            id: "fast",
            name: "Fast Chair",
            dimensions: { x: 578, y: 520, z: 1055, unit: "mm" },
            files: {
              glb: "/output/chair/chair.glb?model=fast",
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
  await page.getByRole("button", { name: "Slow Chair" }).click();
  await page.getByRole("button", { name: "Fast Chair" }).click();

  await expect.poll(() => page.evaluate(() => window.__modelViewer?.id)).toBe("fast");
  await page.waitForTimeout(500);
  await expect(page.getByTestId("selected-model-name")).toHaveText("Fast Chair");
  expect(await page.evaluate(() => window.__modelViewer?.id)).toBe("fast");
});

test("shows every model together at actual relative scale", async ({ page }) => {
  await page.route("**/output/models.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        defaultModelId: "chair",
        models: [
          {
            id: "chair",
            name: "Wooden Chair",
            dimensions: { x: 500, y: 500, z: 1000, unit: "mm" },
            files: { glb: "/test.glb?model=chair", step: "#", stl: "#" },
          },
          {
            id: "chair-copy",
            name: "Chair Copy",
            dimensions: { x: 500, y: 500, z: 1000, unit: "mm" },
            files: { glb: "/test.glb?model=chair-copy", step: "#", stl: "#" },
          },
        ],
      }),
    }),
  );
  await page.goto("/viewer.html");
  await page.getByRole("button", { name: "All Models 2" }).click();

  await expect(page.getByTestId("selected-model-name")).toHaveText("All Models");
  await expect(page.locator(".load-status").first()).toHaveText("Loaded");
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.id)).toBe("__all__");
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.modelCount)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.bounds.x)).toBeGreaterThan(1000);
  await expect.poll(() => page.evaluate(() => window.__modelViewer?.bounds.x)).toBeLessThan(2000);
  await expect
    .poll(() =>
      page.evaluate(() => window.__modelViewer.floorY - window.__modelViewer.modelMinY),
    )
    .toBe(0);
});
