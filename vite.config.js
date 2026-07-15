import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "gross-release-meta",
      transformIndexHtml() {
        return [{
          tag: "meta",
          attrs: { name: "gross-release", content: process.env.VITE_APP_RELEASE || "local" },
          injectTo: "head",
        }];
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monitoring: ["@sentry/react"],
          supabase: ["@supabase/supabase-js"],
          "react-vendor": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
