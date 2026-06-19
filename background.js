// Service worker — routes captcha solve requests from the content script to an
// offscreen ONNX document (the only context that can run WASM inference in MV3).

let offscreenReady = false;
let readyResolve = null;
let readyPromise = new Promise((resolve) => { readyResolve = resolve; });

function waitForReady() {
  if (offscreenReady) return Promise.resolve();
  return readyPromise;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "offscreen-ready") {
    if (!sender.url || !sender.url.endsWith("pages/offscreen.html")) return;
    offscreenReady = true;
    if (readyResolve) readyResolve();
    return;
  }

  if (msg.type === "solve-captcha") {
    ensureOffscreen()
      .then(() => waitForReady())
      .then(() =>
        chrome.runtime.sendMessage({
          type: "offscreen-solve",
          dataUrl: msg.dataUrl,
        })
      )
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

async function ensureOffscreen() {
  const exists = await chrome.offscreen.hasDocument();
  if (exists) {
    // Doc exists but service worker restarted — ping to check if alive
    if (!offscreenReady) {
      try {
        const resp = await chrome.runtime.sendMessage({ type: "offscreen-ping" });
        if (resp?.pong) {
          offscreenReady = true;
          return;
        }
      } catch (e) {
        // Offscreen doc is dead, recreate
      }
      // Couldn't reach it, tear down and recreate
      await chrome.offscreen.closeDocument();
    } else {
      return;
    }
  }
  offscreenReady = false;
  readyPromise = new Promise((resolve) => { readyResolve = resolve; });
  await chrome.offscreen.createDocument({
    url: "pages/offscreen.html",
    reasons: ["WORKERS"],
    justification: "Run ONNX model inference via WASM",
  });
}
