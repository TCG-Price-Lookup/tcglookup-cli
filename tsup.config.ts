import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: "es2022",
  outDir: "dist",
  // Preserve the #!/usr/bin/env node shebang at the top of dist/index.js
  // so the file can be invoked directly via the `tcglookup` bin entry.
  banner: { js: "#!/usr/bin/env node" },
  // Mark the SDK + CLI deps as external so the bundle stays small and
  // the user's installed versions are used at runtime.
  external: ["@tcgpricelookup/sdk", "commander", "picocolors", "cli-table3"],
});
