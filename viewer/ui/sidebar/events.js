export function bindSidebarEvents({ dom, api, getVisibility, clearHover }) {
  const { sidebarToggleBtn, sidebarEl, closeBtn, isOpen, openSidebar, closeSidebar, setToggleVisible } = dom;

  let outsidePointerHandler = null;
  let escHandler = null;
  let toggleHandler = null;
  let closeHandler = null;

  toggleHandler = () => (isOpen() ? closeSidebar() : openSidebar());
  sidebarToggleBtn.addEventListener('click', toggleHandler);

  closeHandler = () => {
    getVisibility?.()?.clearHoverUX?.();
    clearHover?.();
    closeSidebar();
  };
  closeBtn?.addEventListener('click', closeHandler);

  outsidePointerHandler = (e) => {
    if (!sidebarEl || !sidebarToggleBtn) return;
    if (!isOpen()) return;

    const t = e.target;
    if (t && (sidebarEl.contains(t) || sidebarToggleBtn.contains(t))) return;

    getVisibility?.()?.clearHoverUX?.();
    clearHover?.();
    closeSidebar();
  };
  window.addEventListener('pointerdown', outsidePointerHandler, { capture: true });

  escHandler = (e) => {
    if (!sidebarEl || !sidebarToggleBtn) return;
    if (e.key === 'Escape' && isOpen()) {
      getVisibility?.()?.clearHoverUX?.();
      clearHover?.();
      closeSidebar();
    }
  };
  window.addEventListener('keydown', escHandler);

  setToggleVisible(true);

  return function dispose() {
    try {
      sidebarToggleBtn?.removeEventListener?.('click', toggleHandler);
    } catch (_) {}
    try {
      closeBtn?.removeEventListener?.('click', closeHandler);
    } catch (_) {}
    try {
      window.removeEventListener('pointerdown', outsidePointerHandler, { capture: true });
    } catch (_) {}
    try {
      window.removeEventListener('keydown', escHandler);
    } catch (_) {}
  };
}