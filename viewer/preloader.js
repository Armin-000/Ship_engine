let overlayEl = null;
let minTimePassed = false;

function runSvgDrawAnimation(rootEl, durationMs = 3000) {
  if (!rootEl) return;

  const svg = rootEl.querySelector('.preloader-logo');
  if (!svg) return;

  const paths = svg.querySelectorAll('path');
  if (!paths.length) return;

  paths.forEach((p) => {
    try {
      p.style.fill = 'none';
      p.style.stroke = '#ffffff';
      p.style.strokeWidth = '0.6';
      p.style.strokeLinecap = 'round';
      p.style.strokeLinejoin = 'round';

      const len = p.getTotalLength();

      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      
      p.getBoundingClientRect();

      p.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
      p.style.strokeDashoffset = '0';
    } catch (_) {}
  });
}

export async function initPreloader({
  overlayId = "loadingOverlay",
  fragmentUrl = new URL("./preloader.html", import.meta.url),
  minDuration = 3000
} = {}) {
  overlayEl = document.getElementById(overlayId);
  if (!overlayEl) return;

  const res = await fetch(fragmentUrl);
  const html = await res.text();
  overlayEl.innerHTML = html;

  requestAnimationFrame(() => {
    runSvgDrawAnimation(overlayEl, 3000);
  });

  overlayEl.setAttribute("aria-live", "polite");
  overlayEl.setAttribute("aria-busy", "true");

  minTimePassed = false;
  setTimeout(() => {
    minTimePassed = true;
  }, minDuration);

  showPreloader();
}

export function showPreloader() {
  if (!overlayEl) return;
  overlayEl.classList.remove("is-hidden");
  overlayEl.setAttribute("aria-busy", "true");

  requestAnimationFrame(() => {
    runSvgDrawAnimation(overlayEl, 1000);
  });
}

export function hidePreloader() {
  if (!overlayEl) return;

  if (!minTimePassed) {
    setTimeout(hidePreloader, 400);
    return;
  }

  overlayEl.classList.add("is-hidden");
  overlayEl.setAttribute("aria-busy", "false");
}
