import { defineConfig } from "playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "4174";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL,
    headless: true,
  },
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `${baseURL}/viewer.html`,
    reuseExistingServer: false,
  },
});
