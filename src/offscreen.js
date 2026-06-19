import * as ort from "onnxruntime-web";

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = chrome.runtime.getURL("dist/");

let session = null;

async function getSession() {
  if (!session) {
    const modelUrl = chrome.runtime.getURL("model/model.onnx");
    session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"],
    });
  }
  return session;
}

async function solveCaptcha(dataUrl) {
  const sess = await getSession();

  // Decode data URL to ImageData
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

  const { tensor } = globalThis.inference.preprocess(imageData);
  const inputName = sess.inputNames[0];
  const inputTensor = new ort.Tensor("float32", tensor, [1, 3, 48, 256]);
  const results = await sess.run({ [inputName]: inputTensor });
  const outputData = results[sess.outputNames[0]].data;

  return globalThis.inference.postprocess(outputData);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "offscreen-ping") {
    sendResponse({ pong: true });
    return;
  }
  if (msg.type === "offscreen-solve") {
    solveCaptcha(msg.dataUrl)
      .then((answer) => sendResponse({ answer }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

// Signal that the offscreen document is ready
chrome.runtime.sendMessage({ type: "offscreen-ready" });
