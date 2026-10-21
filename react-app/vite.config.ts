import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"

const baRoot = resolve(process.env.BA_DESIGN_SYSTEM_DIR || "../../../va-design-system")

export default defineConfig({
  // GitHub Pages serves this repository below /Gradient-Creator/.
  // Relative URLs also keep the same build working inside the Framer iframe.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@ba-design-system/react": resolve(baRoot, "packages/react/src") },
    dedupe: ["react", "react-dom"],
  },
  build: { outDir: "..", emptyOutDir: false, assetsDir: "assets" },
})
