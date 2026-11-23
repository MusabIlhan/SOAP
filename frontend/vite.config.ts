import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Flask runs on 5001 (backend/app.py); the browser only ever calls /api on this origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:5001",
    },
  },
});
