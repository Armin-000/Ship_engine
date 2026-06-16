export function createSidebarApi({ dom, state, panels, getVisibility, clearHover }) {
  function setActiveByMesh(mesh, label = '') {
    if (!mesh) return;
    const btn = state.btnByUuid.get(mesh.uuid) || state.btnByLabel.get(state.norm(label));
    if (!btn) return;

    getVisibility?.()?.clearHoverUX?.();
    clearHover?.();

    state.setActiveItem(btn);
    state.collapseAllGroupsExceptPath(btn);
    state.scrollIntoViewIfNeeded(btn);

    requestAnimationFrame(() => panels?.syncAllExpandedHeights?.());
  }

  function resetUI({ keepOpen = true } = {}) {
    getVisibility?.()?.clearHoverUX?.();
    clearHover?.();

    state.clearActiveItem();
    state.collapseAllGroups();

    if (!keepOpen) dom.closeSidebar();

    requestAnimationFrame(() => panels?.syncAllExpandedHeights?.());
  }

  function dispose() {
    try {
      state.clearActiveItem();
      state.collapseAllGroups();
    } catch (_) {}
    try {
      dom.sidebarListEl.innerHTML = '';
    } catch (_) {}
  }

  return { setActiveByMesh, resetUI, dispose };
}