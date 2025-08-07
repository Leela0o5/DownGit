import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0", 
    allowedHosts: ["downgit.onrender.com"]    ,                   // Required for Render
    port: parseInt(process.env.PORT) || 5173  // Use Render's port or default to 5173
  }
});
