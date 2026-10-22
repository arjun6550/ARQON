import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev server proxies /api to the API Gateway so the browser only talks to one origin (no CORS in dev).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // API_TARGET=http://localhost:8081 skips the gateway (and Redis) for simple local runs.
    proxy: { "/api": { target: process.env.API_TARGET ?? "http://localhost:8080", changeOrigin: false } },
  },
  test: { environment: "node" },
});
