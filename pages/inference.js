// CRNN + CTC inference pipeline — preprocessing and CTC greedy decoding
// Model: ikaptcha (CRNN BiLSTM), input 48×256 RGB, output (T=64, B, C=29)

const CHARSET = "abcdefghjklmnpqrstuvwxy23457";
const BLANK_IDX = 0;
const IMG_W = 256;
const IMG_H = 48;
const MEAN = [0.5, 0.5, 0.5];
const STD = [0.5, 0.5, 0.5];

/**
 * Preprocess an image for CRNN inference.
 * @param {ImageData} imageData — RGBA pixel data from canvas
 * @returns {{ tensor: Float32Array }}
 */
function preprocess(imageData) {
  const { width, height } = imageData;

  // Resize to 256×48 via OffscreenCanvas drawImage
  const srcCanvas = new OffscreenCanvas(width, height);
  const srcCtx = srcCanvas.getContext("2d");
  srcCtx.putImageData(imageData, 0, 0);

  const resizeCanvas = new OffscreenCanvas(IMG_W, IMG_H);
  const resizeCtx = resizeCanvas.getContext("2d");
  resizeCtx.drawImage(srcCanvas, 0, 0, IMG_W, IMG_H);
  const resized = resizeCtx.getImageData(0, 0, IMG_W, IMG_H);

  // Normalize per channel ((x/255 - mean)/std), RGBA→RGB, HWC→CHW
  const pixels = resized.data;
  const planeSize = IMG_W * IMG_H;
  const chw = new Float32Array(3 * planeSize);
  for (let i = 0; i < planeSize; i++) {
    const rgbaIdx = i * 4;
    chw[i]                 = (pixels[rgbaIdx]     / 255 - MEAN[0]) / STD[0]; // R
    chw[planeSize + i]     = (pixels[rgbaIdx + 1] / 255 - MEAN[1]) / STD[1]; // G
    chw[2 * planeSize + i] = (pixels[rgbaIdx + 2] / 255 - MEAN[2]) / STD[2]; // B
  }

  return { tensor: chw };
}

/**
 * CTC greedy decode — postprocess CRNN output into a captcha string.
 * @param {Float32Array} logits — raw model output, shape (T=64, B=1, C=29) flattened row-major
 * @returns {string}
 */
function postprocess(logits) {
  const T = 64;
  const C = 29;

  // Argmax per timestep: logits[t * C + c] for batch=0
  const indices = [];
  for (let t = 0; t < T; t++) {
    let maxVal = -Infinity;
    let maxIdx = 0;
    const base = t * C;
    for (let c = 0; c < C; c++) {
      if (logits[base + c] > maxVal) {
        maxVal = logits[base + c];
        maxIdx = c;
      }
    }
    indices.push(maxIdx);
  }

  // CTC collapse: skip blanks (idx 0) and consecutive repeats
  const chars = [];
  let prev = -1;
  for (let t = 0; t < T; t++) {
    const idx = indices[t];
    if (idx !== BLANK_IDX && idx !== prev) {
      chars.push(CHARSET[idx - 1]);
    }
    prev = idx;
  }

  return chars.join("");
}

// Export for use in offscreen.js
if (typeof globalThis !== "undefined") {
  globalThis.inference = { preprocess, postprocess };
}
