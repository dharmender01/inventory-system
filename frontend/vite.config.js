import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// envPrefix includes REACT_APP_ so the assessment's REACT_APP_API_URL var works
// even though the build tool is Vite (which natively only exposes VITE_*).
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
