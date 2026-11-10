import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative paths so the build also runs from a subfolder (itch.io, any web host) and in Electron.
  base: "./",
  plugins: [react()],
  worker: { format: "es" },
  test: {
    environment: "node",
    testTimeout: 60000,
  },
});
