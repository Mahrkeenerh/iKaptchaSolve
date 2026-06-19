// Package extension into a release zip (run via: npm run package)
import { execSync } from "child_process";
import { readFileSync } from "fs";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const version = manifest.version;
const outFile = `ikaptchasolve-v${version}.zip`;

// Include only what the extension needs at runtime. icons/source/ holds the
// design masters (not referenced by the manifest), so it's excluded.
execSync(`zip -r ${outFile} \
  manifest.json \
  background.js \
  content/ \
  pages/ \
  icons/ \
  model/model.onnx \
  dist/ \
  README.md \
  -x 'icons/source/*'`, {
  stdio: "inherit",
});

console.log(`\nPackaged: ${outFile}`);
