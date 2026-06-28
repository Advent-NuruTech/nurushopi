import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts"],
    // Workspace packages export TypeScript source directly; force Vitest to
    // transform them instead of treating them as externalised node_modules.
    server: { deps: { inline: [/@nuru\//] } },
  },
  resolve: {
    // Source uses NodeNext-style ".js" specifiers that point at ".ts" files.
    extensionAlias: { ".js": [".ts", ".js"] },
  },
});
