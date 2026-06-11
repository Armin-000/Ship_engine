const ICON_LAYER = `
  <img
    class="icon-layer"
    src="/images/layers-minimalistic-svgrepo-com.svg"
    alt=""
  >
`;

const ICON_LAYER_OFF = `
  <img
    class="icon-layer"
    src="/images/layers-minimalistic-svgrepo-com.svg"
    alt=""
  >
`;

export function setEyeIcon(btnEl, isVisible) {
  if (!btnEl) return;

  btnEl.innerHTML = isVisible
    ? ICON_LAYER
    : ICON_LAYER_OFF;

  btnEl.classList.toggle('is-off', !isVisible);
  btnEl.setAttribute('aria-pressed', String(!isVisible));
}
