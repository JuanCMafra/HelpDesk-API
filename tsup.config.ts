import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  outDir: "build",
  format: ["cjs"],
  external: [
    "@prisma/client",
    "dotenv",
  ],
});