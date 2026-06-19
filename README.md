<img src="icons/icon128.png" alt="" width="128" height="128">

# iKaptchaSolve

Standalone Chrome (MV3) extension that auto-solves Ikariam **piracy** and
**building-demolition** captchas using the [iKaptcha](https://github.com/Mahrkeenerh/iKaptcha)
CRNN+CTC model running locally via ONNX Runtime Web (WASM). No network calls,
no data collection, no storage permission — it just fills in the answer.

Extracted as a slim subset of [Ikariam Tools](https://github.com/Mahrkeenerh/IkaTools).

## Install (unpacked)

1. Download the zip from the [latest release](../../releases/latest) and unzip it somewhere permanent.
2. Open `chrome://extensions`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the unzipped folder.

That's it — open Ikariam and pirate/demolition captchas are filled and submitted
automatically. (Chrome shows a "disable developer-mode extensions" popup on each
startup; just dismiss it.)

- **Pirate captcha**: solved and auto-submitted.
- **Demolition captcha**: solved only — you confirm manually.
