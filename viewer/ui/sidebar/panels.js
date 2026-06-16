/* ======================================================================
   SIDEBAR PANEL CONTROLLER (Engine 2.0)

   Accordion height measurement + animation support.
   This module does not own UI state.
   The renderer is the single owner of aria-expanded.
====================================================================== */

export function createPanelController({ sidebarEl }) {
  if (!sidebarEl) return null;

  let ro = null;
  let scheduled = false;
  const observed = new WeakSet();

  function getDirectPanel(section) {
    return section?.querySelector?.(':scope > .comp-group-panel') || null;
  }

  function setPanelHeight(section) {
    const panel = getDirectPanel(section);
    if (!panel) return;
    panel.style.setProperty('--panel-h', `${panel.scrollHeight}px`);
  }

  function updateAncestorPanelHeights(fromSection) {
    let el = fromSection?.parentElement || null;
    while (el) {
      if (el.classList?.contains('comp-group') && el.getAttribute('aria-expanded') === 'true') {
        setPanelHeight(el);
      }
      el = el.parentElement;
    }
  }

  function animatePanel(section, expand) {
    if (!section) return;

    setPanelHeight(section);

    requestAnimationFrame(() => {
      updateAncestorPanelHeights(section);
      requestAnimationFrame(() => {
        setPanelHeight(section);
        updateAncestorPanelHeights(section);
      });
    });
  }

  function syncAllExpandedHeights() {
    const expanded = sidebarEl.querySelectorAll('.comp-group[aria-expanded="true"]');
    expanded.forEach((s) => setPanelHeight(s));
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncAllExpandedHeights();
    });
  }

  function registerPanel(panelEl) {
    if (!panelEl || observed.has(panelEl)) return;
    observed.add(panelEl);
    try {
      ro?.observe(panelEl);
    } catch (_) {}
  }

  ro = new ResizeObserver(() => scheduleSync());

  const body = sidebarEl.querySelector('.component-sidebar-body') || sidebarEl;
  ro.observe(body);

  function dispose() {
    try {
      ro?.disconnect?.();
    } catch (_) {}
    ro = null;
  }

  return {
    setPanelHeight,
    animatePanel,
    updateAncestorPanelHeights,
    syncAllExpandedHeights,
    registerPanel,
    dispose,
  };
}