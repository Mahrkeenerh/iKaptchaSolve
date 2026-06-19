import { build } from "esbuild";
import { cpSync, rmSync, readdirSync } from "fs";

// Clean dist
rmSync("dist", { recursive: true, force: true });

// Bundle offscreen.js with onnxruntime-web
await build({
  entryPoints: ["src/offscreen.js"],
  bundle: true,
  outfile: "dist/offscreen.bundle.js",
  format: "esm",
  target: "chrome120",
  platform: "browser",
});

// Copy only the ONNX runtime that the bundle actually imports. onnxruntime-web
// loads the unified "jsep" build by default (it serves CPU/`executionProviders:
// ["wasm"]` as well as WebGPU/WebNN), so that's the one file pair we ship — the
// plain/.jspi/.asyncify variants are never fetched. Verified via the runtime's
// dynamic `import(... .jsep.mjs)`.
const ortDist = "node_modules/onnxruntime-web/dist/";
const KEEP = new Set(["ort-wasm-simd-threaded.jsep.wasm", "ort-wasm-simd-threaded.jsep.mjs"]);
for (const f of readdirSync(ortDist)) {
  if (KEEP.has(f)) cpSync(ortDist + f, "dist/" + f);
}

console.log("Build complete.");
