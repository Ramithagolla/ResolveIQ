import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // VITE_DEV_PROXY controls the backend URL during development.
  // Set it to http://localhost:8001 if port 8000 is unavailable.
  const backendUrl = env.VITE_DEV_PROXY || "http://127.0.0.1:8001";
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": backendUrl,
      },
    },
  };
});
