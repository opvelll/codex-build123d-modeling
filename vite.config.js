import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { cpSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "copy-generated-models",
      closeBundle() {
        cpSync(resolve("output"), resolve("dist/output"), { recursive: true });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: "viewer.html",
    },
  },
});
