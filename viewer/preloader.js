let overlayEl = null;
let startedAt = 0;
let minDurationMs = 3000;
let hideRequested = false;

export async function initPreloader({
  overlayId = "loadingOverlay",
  fragmentUrl = new URL("./preloader.html", import.meta.url),
  minDuration = 3000
} = {}) {
  overlayEl = document.getElementById(overlayId);

  if (!overlayEl) return;

  minDurationMs = minDuration;
  startedAt = performance.now();
  hideRequested = false;

  const res = await fetch(fragmentUrl);
  const html = await res.text();

  overlayEl.innerHTML = html;

  overlayEl.classList.remove("is-hidden");
  overlayEl.setAttribute("aria-live", "polite");
  overlayEl.setAttribute("aria-busy", "true");
}

export function showPreloader() {
  if (!overlayEl) return;

  startedAt = performance.now();
  hideRequested = false;

  overlayEl.classList.remove("is-hidden");
  overlayEl.setAttribute("aria-busy", "true");
}

export function hidePreloader() {
  if (!overlayEl || hideRequested) return;

  hideRequested = true;

  const elapsed = performance.now() - startedAt;
  const remaining = Math.max(0, minDurationMs - elapsed);

  setTimeout(() => {
    overlayEl.classList.add("is-hidden");
    overlayEl.setAttribute("aria-busy", "false");
    hideRequested = false;
  }, remaining);
}