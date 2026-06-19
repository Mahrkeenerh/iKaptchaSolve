# iKaptchaSolve

Standalone Chrome (MV3) extension that auto-solves Ikariam **piracy** and
**building-demolition** captchas using the [iKaptcha](https://github.com/Mahrkeenerh/iKaptcha)
CRNN+CTC model running locally via ONNX Runtime Web (WASM). No network calls,
no data collection, no storage permission — it just fills in the answer.

Extracted as a slim subset of [Ikariam Tools](https://github.com/Mahrkeenerh/IkaTools).

## Install (unpacked)

1. Unzip `ikaptchasolve-v1.0.zip` somewhere permanent.
2. Open `chrome://extensions`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the unzipped folder.

That's it — open Ikariam and pirate/demolition captchas are filled and submitted
automatically. (Chrome shows a "disable developer-mode extensions" popup on each
startup; just dismiss it.)

## How it works

```
content/content.js   detects captcha in the page DOM, sends the image to →
background.js        spins up an offscreen document, relays the image to →
pages/offscreen.html runs ONNX inference (dist/ + model/model.onnx), returns →
content/content.js   fills #captcha and clicks submit (pirate; up to 5 tries)
```

- **Pirate captcha** (`img.captchaImage`): solved and auto-submitted.
- **Demolition captcha** (`#demolitionForm`): solved only — you confirm manually.

## Build / rebuild

`dist/` is checked in already, so the extension loads as-is. To regenerate the
ONNX runtime bundle:

```bash
npm install      # esbuild + onnxruntime-web
npm run build    # bundles src/offscreen.js + copies the CPU-WASM runtime to dist/
npm run package  # build + zip a release
```

Only the runtime onnxruntime-web actually imports is shipped —
`ort-wasm-simd-threaded.jsep.*` (its unified default build, which also serves the
CPU `executionProviders:["wasm"]` path). The plain/.jspi/.asyncify variants are
never fetched, keeping the package small.
