// Captcha detection, solving, and auto-submit logic
(() => {
  const C = "[Captcha]";
  const MAX_AUTO_SUBMITS = 5;

  let autoSubmitCount = 0;
  let solving = false;
  let lastCaptchaSrc = null;

  function findCaptcha() {
    // Pirate captcha
    const pirateImg = document.querySelector("img.captchaImage");
    if (pirateImg) {
      const input = document.querySelector("input#captcha");
      const submit = document.querySelector(
        "#pirateCaptureBox input.button[type='submit']"
      );
      return input ? { img: pirateImg, input, submit, type: "pirate" } : null;
    }

    // Demolition captcha (building destroy confirmation)
    const demolitionForm = document.querySelector("#demolitionForm");
    if (demolitionForm) {
      const img = demolitionForm.querySelector("img");
      const input = demolitionForm.querySelector("input#captcha");
      // No submit — solve only, user confirms manually
      return img && input ? { img, input, submit: null, type: "demolition" } : null;
    }

    return null;
  }

  async function getImageDataUrl(imgEl) {
    if (!imgEl.complete || !imgEl.naturalWidth) {
      await new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => clearTimeout(timer);
        const onLoad = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error("Captcha image failed to load")); };
        imgEl.addEventListener("load", onLoad, { once: true });
        imgEl.addEventListener("error", onError, { once: true });
        timer = setTimeout(() => {
          imgEl.removeEventListener("load", onLoad);
          imgEl.removeEventListener("error", onError);
          reject(new Error("Captcha image load timed out"));
        }, 10000);
      });
    }
    const canvas = document.createElement("canvas");
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0);
    return canvas.toDataURL("image/png");
  }

  async function solve(els) {
    if (solving) return;
    solving = true;

    try {
      const dataUrl = await getImageDataUrl(els.img);
      const response = await chrome.runtime.sendMessage({
        type: "solve-captcha",
        dataUrl,
      });

      if (response?.error) {
        console.error(C, "Solver error:", response.error);
        return;
      }

      if (!response?.answer) return;

      // Fill the input
      els.input.value = response.answer;
      els.input.dispatchEvent(new Event("input", { bubbles: true }));
      els.input.dispatchEvent(new Event("change", { bubbles: true }));

      if (autoSubmitCount < MAX_AUTO_SUBMITS) {
        // Auto-submit mode
        autoSubmitCount++;
        els.input.style.outline = "2px solid #FF9800";

        // Brief delay so the UI updates, then submit
        await new Promise((r) => setTimeout(r, 300));
        if (els.submit) els.submit.click();
      } else {
        // Manual mode — user took over
        els.input.style.outline = "2px solid #4CAF50";
      }
    } catch (err) {
      // Message channel closes when page updates after successful submit — ignore
      if (!err.message?.includes("message channel closed")) {
        console.error(C, "Solve failed:", err);
      }
    } finally {
      solving = false;
    }
  }

  function check() {
    const els = findCaptcha();
    if (!els) {
      // Captcha gone
      if (lastCaptchaSrc !== null) {
        autoSubmitCount = 0;
        lastCaptchaSrc = null;
      }
      return;
    }

    const currentSrc = els.img.src;

    // New captcha image appeared (or refreshed after failed attempt)
    if (currentSrc !== lastCaptchaSrc) {
      lastCaptchaSrc = currentSrc;
      solve(els);
    }
  }

  // Watch for captcha appearing / changing
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(check, 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check
  check();
})();
