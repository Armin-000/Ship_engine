export function createSidebarState({ sidebarEl, sidebarListEl, panels }) {
  const btnByUuid = new Map();
  const btnByLabel = new Map();

  const norm = (s) =>
    (s || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_\-./\\]+/g, ' ')
      .replace(/[^\w\s]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  function clearActiveItem() {
    sidebarListEl
      ?.querySelectorAll?.('.component-list-btn.is-active')
      ?.forEach((b) => b.classList.remove('is-active'));
  }

  function setActiveItem(btnEl) {
    clearActiveItem();
    btnEl?.classList?.add('is-active');
  }

  function clearActiveGroups() {
  sidebarListEl
    ?.querySelectorAll?.('.comp-group.is-active')
    ?.forEach((g) => g.classList.remove('is-active'));
  }

  function setActiveGroup(groupEl) {
    clearActiveGroups();
    groupEl?.classList?.add('is-active');
  }

  function collapseAllGroups() {
    sidebarEl
      ?.querySelectorAll?.('.comp-group[aria-expanded="true"]')
      ?.forEach((g) => g.setAttribute('aria-expanded', 'false'));
  }

  function expandParentsForElement(el) {
    if (!el) return;
    let p = el.parentElement;
    while (p) {
      if (p.classList?.contains('comp-group')) panels?.animatePanel?.(p, true);
      p = p.parentElement;
    }
  }

  /**
   * BEFORE: collapses everything, then expands parents of active item.
   * NOW: preserves user-expanded groups and ONLY ensures the active path is visible.
   * This prevents "main category" from closing when clicking a component.
   */
  function collapseAllGroupsExceptPath(activeBtn) {
    if (!sidebarEl) return;
    // ✅ Do NOT collapse groups anymore
    expandParentsForElement(activeBtn);
  }

  function scrollIntoViewIfNeeded(el) {
    if (!el) return;
    const body = sidebarEl?.querySelector?.('.component-sidebar-body');
    if (!body) return;

    const rect = el.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();

    const above = rect.top < bodyRect.top + 8;
    const below = rect.bottom > bodyRect.bottom - 8;

    if (above || below) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function isTopGroupSection(section) {
    if (!section) return false;
    const p = section.parentElement;
    return p === sidebarListEl || p?.parentElement === sidebarListEl;
  }

  /**
   * This is your "accordion at top level" behavior:
   * when opening a top group, close other top groups.
   * Keep this if you still want only one top category open at a time.
   */
  function closeOtherTopGroupsWhenOpening(section) {
    if (!sidebarListEl || !section) return;
    if (!isTopGroupSection(section)) return;

    const topGroups = sidebarListEl.querySelectorAll(':scope > li > .comp-group, :scope > .comp-group');
    topGroups.forEach((g) => {
      if (g !== section) panels?.animatePanel?.(g, false);
    });
  }

  return {
    btnByUuid,
    btnByLabel,
    norm,

    clearActiveItem,
    setActiveItem,

    clearActiveGroups,
    setActiveGroup,

    collapseAllGroups,
    collapseAllGroupsExceptPath,

    expandParentsForElement,
    scrollIntoViewIfNeeded,

    isTopGroupSection,
    closeOtherTopGroupsWhenOpening,
  };
}