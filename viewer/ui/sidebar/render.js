import { setEyeIcon } from './icons.js';
import { API_BASE } from '../../../config/api.js';

export function createRenderer(ctx) {
  const {
    dom,
    panels,
    state,

    prettyFromNodeName,
    getNiceName,
    collectMeshesInSubtree,

    actions,
  } = ctx;

  const { sidebarListEl } = dom;

  let componentsCache = {};

  const rafSyncHeights = () =>
    requestAnimationFrame(() => panels?.syncAllExpandedHeights?.());

  const clearHoverAndUX = () => {
    actions?.getVisibility?.()?.clearHoverUX?.();
    actions?.clearHover?.();
  };

  async function loadComponentsCache() {
    try {
      const res = await fetch(`${API_BASE}/api/components`);

      if (!res.ok) {
        componentsCache = {};
        return;
      }

      componentsCache = await res.json();
    } catch (_) {
      componentsCache = {};
    }
  }

  async function saveComponent(componentKey, component) {
    const res = await fetch(
      `${API_BASE}/api/components/${encodeURIComponent(componentKey)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(component),
      }
    );

    if (!res.ok) {
      throw new Error('Failed to save component');
    }

    return res.json();
  }

  async function uploadPdfFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/api/upload/document`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('PDF upload failed');
    }

    return res.json();
  }

  const getMeshesForGroup = (treeNode) => {
    if (treeNode?._custom?.key === 'global') {
      return actions?.getVisibility?.()?.collectAllMeshes?.() || [];
    }

    return collectMeshesInSubtree?.(treeNode) || [];
  };

  function setExpanded(sectionEl, isExpanded) {
    if (!sectionEl) return;
    sectionEl.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  }

  function collapseGroupDeep(groupSection) {
    if (!groupSection) return;

    groupSection
      .querySelectorAll('.comp-group[aria-expanded="true"]')
      .forEach((g) => setExpanded(g, false));

    setExpanded(groupSection, false);
  }

  function closeSiblingGroups(sectionEl) {
    if (!sectionEl) return;

    const parent = sectionEl.parentElement;
    const container = parent?.tagName === 'LI' ? parent.parentElement : parent;

    if (!container) return;

    const siblings = container.querySelectorAll(
      ':scope > li > .comp-group, :scope > .comp-group'
    );

    siblings.forEach((g) => {
      if (g === sectionEl) return;

      collapseGroupDeep(g);
      panels?.animatePanel?.(g, false);
    });
  }

  function nodeTitle(treeNode) {
    return (
      treeNode?.node?.userData?.displayName ||
      prettyFromNodeName?.(treeNode?.name) ||
      treeNode?.name ||
      'Group'
    );
  }

  function getDefaultComponent(componentKey) {
    const current = componentsCache?.[componentKey] || {};

    return {
      title: current.title || componentKey || 'Component',
      description:
        current.description || 'No description available for this component yet.',
      documents: {
        documentation: current.documents?.documentation || null,
        schematics: current.documents?.schematics || null,
        maintenance: current.documents?.maintenance || null,
      },
    };
  }

  function renderSpecNode(ch, ul) {
    const t = ch._custom.type;

    const li = document.createElement('li');
    li.className = 'component-list-item';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'component-list-btn spec-btn';

    const left = document.createElement('span');
    left.className = 'spec-left';
    left.innerHTML = `
      <span class="component-list-bullet"></span>
      <span class="spec-label">${ch._custom.label || ch.name || 'Item'}</span>
    `;

    const right = document.createElement('span');
    right.className = 'spec-right';

    if (t === 'spec:item') {
      const v = (ch._custom.value ?? '').toString().trim();
      right.innerHTML = `<span class="spec-value">${v || '—'}</span>`;
      btn.classList.add('spec-row');
    }

    if (t === 'spec:pdf') {
      const componentKey = ch._custom.componentKey;
      const savedPdf =
        componentKey &&
        componentsCache?.[componentKey]?.documents?.documentation;

      const currentHref = savedPdf || ch._custom.href || null;

      ch._custom.href = currentHref;

    if (currentHref) {
    right.innerHTML = `
      <span class="pdf-icon-btn" data-action="open-pdf" title="Open PDF">
        <img src="/images/add-file.svg" alt="">
      </span>

      <span class="pdf-icon-btn" data-action="change-pdf" title="Change PDF">
        <img src="/images/change.svg" alt="">
      </span>

      <span class="pdf-icon-btn pdf-icon-danger" data-action="delete-pdf" title="Delete PDF">
        <img src="/images/delete.svg" alt="">
      </span>
    `;
    } else {
    left.querySelector('.spec-label').textContent = 'No PDF document attached';

    right.innerHTML = `
      <span class="pdf-icon-btn pdf-icon-add" data-action="change-pdf">
        <img src="/images/add-file.svg" alt="Add PDF">
      </span>
    `;
    }

      btn.classList.add('spec-pdf');
    }

    btn.appendChild(left);
    btn.appendChild(right);

    btn.addEventListener('click', async (e) => {
      clearHoverAndUX();
      state.setActiveItem(btn);

      window.__ENGINE_ACTIVE_SIDEBAR_BTN__ = btn;

      state.collapseAllGroupsExceptPath(btn);

      if (t !== 'spec:pdf') return;

      const action = e.target?.dataset?.action || 'open-pdf';

      if (action === 'open-pdf') {
        const currentHref =
          componentsCache?.[ch._custom.componentKey]?.documents?.documentation ||
          ch._custom.href ||
          null;

        if (currentHref) {
          window.open(currentHref, '_blank', 'noopener');
        } else {
          alert('No PDF document available.');
        }

        return;
      }

      const componentKey = ch._custom.componentKey;

      if (!componentKey) {
        alert('Missing component key for this PDF.');
        return;
      }

      const currentComponent = getDefaultComponent(componentKey);

      if (action === 'change-pdf') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';

        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;

          try {
            const uploaded = await uploadPdfFile(file);

            if (!uploaded?.url) {
              alert('PDF upload failed.');
              return;
            }

            const updatedComponent = {
              title: currentComponent.title,
              description: currentComponent.description,
              documents: {
                ...currentComponent.documents,
                documentation: uploaded.url,
              },
            };

            await saveComponent(componentKey, updatedComponent);

            alert('PDF updated successfully.');
            window.location.reload();
          } catch (err) {
            console.error(err);
            alert('Failed to update PDF.');
          }
        });

        input.click();
        return;
      }

      if (action === 'delete-pdf') {
        const ok = confirm('Delete PDF from this component?');
        if (!ok) return;

        try {
          const updatedComponent = {
            title: currentComponent.title,
            description: currentComponent.description,
            documents: {
              ...currentComponent.documents,
              documentation: null,
            },
          };

          await saveComponent(componentKey, updatedComponent);

          alert('PDF deleted successfully.');
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert('Failed to delete PDF.');
        }
      }
    });

    li.appendChild(btn);
    ul.appendChild(li);
  }

  function renderMeshNode(ch, ul, updateGroupEyeState) {
    const mesh = ch.node;

    const rawLabel =
      mesh?.userData?.displayName ||
      getNiceName?.(mesh) ||
      mesh?.name ||
      'Part';

    const componentKey = ch?.path
      ? `path:${ch.path}`
      : `name:${mesh?.name || rawLabel}`;

    if (mesh?.userData) {
      mesh.userData.componentKey = componentKey;
    }

    const savedTitle = componentsCache?.[componentKey]?.title;
    const label = savedTitle || rawLabel;

    if (savedTitle && mesh?.userData) {
      mesh.userData.displayName = savedTitle;
    }

    const li = document.createElement('li');
    li.className = 'component-list-item';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'component-list-btn';
    btn.dataset.componentKey = componentKey;

    btn.innerHTML = `
      <span class="component-list-bullet"></span>
      <span class="component-list-label">${label}</span>
    `;

    if (mesh?.uuid) {
      state.btnByUuid.set(mesh.uuid, btn);
    }

    const nl = state.norm(label);
    if (nl && !state.btnByLabel.has(nl)) {
      state.btnByLabel.set(nl, btn);
    }

    btn.addEventListener('mouseenter', () => {
      if (actions?.isFocusMode?.()) return;

      actions?.getVisibility?.()?.applyHoverUX?.(mesh);
      actions?.setHoverMesh?.(mesh);
      btn.classList.add('is-hovered');
    });

    btn.addEventListener('mouseleave', () => {
      if (actions?.isFocusMode?.()) return;

      clearHoverAndUX();
      btn.classList.remove('is-hovered');
    });

    btn.addEventListener('click', () => {
      clearHoverAndUX();
      state.setActiveItem(btn);

      window.__ENGINE_ACTIVE_SIDEBAR_BTN__ = btn;

      if (actions?.isFocusMode?.()) {
        actions?.exitFocusMode?.();
      }

      requestAnimationFrame(() => {
        const liveLabel =
          btn.querySelector('.component-list-label')?.textContent?.trim() ||
          label;

        actions?.focusOnPart?.(mesh, liveLabel);
      });
    });

    const eyeBtn = document.createElement('button');
    eyeBtn.type = 'button';
    eyeBtn.className = 'component-eye';
    eyeBtn.setAttribute('aria-label', 'Toggle visibility');

    setEyeIcon(eyeBtn, !actions?.isMeshHidden?.(mesh));

    eyeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      clearHoverAndUX();

      if (actions?.isFocusMode?.()) {
        actions?.exitFocusMode?.();
      }

      const nextVisible = actions?.toggleMeshHidden?.(mesh);

      actions?.refreshVisibility?.();
      setEyeIcon(eyeBtn, nextVisible);

      updateGroupEyeState?.();
      state.clearActiveItem();

      rafSyncHeights();
    });

    li.appendChild(btn);
    li.appendChild(eyeBtn);
    ul.appendChild(li);
  }

  function renderGroupNode(treeNode, containerEl) {
    const section = document.createElement('section');
    section.className = 'comp-group';
    section.setAttribute('data-path', treeNode.path);

    setExpanded(section, false);

    const headerRow = document.createElement('div');
    headerRow.className = 'comp-group-head';

    const headerBtn = document.createElement('button');
    headerBtn.type = 'button';
    headerBtn.className = 'comp-group-btn';
    headerBtn.innerHTML = `
      <span class="comp-group-title">${nodeTitle(treeNode)}</span>
      <img class="comp-group-chev" src="/images/arrow-down-bold-svgrepo-com.svg" alt="" aria-hidden="true">
    `;

    const groupEye = document.createElement('button');
    groupEye.type = 'button';
    groupEye.className = 'component-eye component-eye--group';
    groupEye.setAttribute('aria-label', 'Toggle visibility for group');

    const updateGroupEyeState = () => {
      const meshes = getMeshesForGroup(treeNode);
      const anyVisible = meshes.some((m) => !actions?.isMeshHidden?.(m));

      setEyeIcon(groupEye, anyVisible);
    };

    updateGroupEyeState();

    groupEye.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      clearHoverAndUX();

      if (actions?.isFocusMode?.()) {
        actions?.exitFocusMode?.();
      }

      const meshes = getMeshesForGroup(treeNode);
      const anyVisible = meshes.some((m) => !actions?.isMeshHidden?.(m));

      actions?.setMeshesHidden?.(meshes, anyVisible);
      actions?.refreshVisibility?.();

      updateGroupEyeState();
      state.clearActiveItem();

      rafSyncHeights();
    });

    headerRow.appendChild(headerBtn);
    headerRow.appendChild(groupEye);

    const panel = document.createElement('div');
    panel.className = 'comp-group-panel';

    panels?.registerPanel?.(panel);

    const ul = document.createElement('ul');
    ul.className = 'comp-sublist';

    const children = treeNode.children || [];

    const pdfChildren = children.filter(
      (ch) => ch?._custom?.type === 'spec:pdf'
    );

    const leafChildren = children.filter((ch) => {
      if (ch?._custom?.type === 'spec:pdf') return false;
      if (ch?._custom?.type?.startsWith('spec:')) return true;
      return !!ch.node?.isMesh;
    });

    for (const ch of leafChildren) {
      if (ch?._custom?.type?.startsWith('spec:')) {
        renderSpecNode(ch, ul);
      } else {
        renderMeshNode(ch, ul, updateGroupEyeState);
      }
    }

    const groupChildren = children.filter(
      (ch) => !ch?._custom?.type?.startsWith('spec:') && !ch.node?.isMesh
    );

    for (const ch of groupChildren) {
      renderTreeNode(ch, ul, false);
    }

    for (const ch of pdfChildren) {
      renderSpecNode(ch, ul);
    }

    panel.appendChild(ul);
    section.appendChild(headerRow);
    section.appendChild(panel);

    panels?.setPanelHeight?.(section);

    if (containerEl.tagName === 'UL') {
      const wrapLi = document.createElement('li');
      wrapLi.className = 'component-list-item';
      wrapLi.appendChild(section);
      containerEl.appendChild(wrapLi);
    } else {
      containerEl.appendChild(section);
    }

    headerBtn.addEventListener('click', () => {
      const opened = section.getAttribute('aria-expanded') === 'true';
      const next = !opened;

      clearHoverAndUX();

      if (!next) {
        setExpanded(section, false);
        panels?.animatePanel?.(section, false);
        rafSyncHeights();

        if (state.isTopGroupSection?.(section)) {
          dom.onReset?.();
        }

        return;
      }

      closeSiblingGroups(section);

      setExpanded(section, true);
      state.setActiveGroup?.(section);
      panels?.animatePanel?.(section, true);

      if (actions?.isFocusMode?.()) {
        actions?.exitFocusMode?.();
      }

      if (treeNode?._custom?.type === 'spec:root') return;

      const meshes = getMeshesForGroup(treeNode);

      actions?.showOnlyMeshes?.(new Set(meshes), treeNode.path);
      actions?.focusOnGroup?.(meshes);

      rafSyncHeights();
    });
  }

  function renderTreeNode(treeNode, containerEl, isTopLevel = false) {
    if (!treeNode) return;

    if (treeNode._skipRender) {
      (treeNode.children || []).forEach((ch) =>
        renderTreeNode(ch, containerEl, false)
      );
      return;
    }

    if (isTopLevel) {
      (treeNode.children || []).forEach((ch) =>
        renderTreeNode(ch, containerEl, false)
      );
      return;
    }

    renderGroupNode(treeNode, containerEl);
  }

  async function render(treeRoot) {
    sidebarListEl.innerHTML = '';
    state.btnByUuid.clear();
    state.btnByLabel.clear();

    await loadComponentsCache();

    renderTreeNode(treeRoot, sidebarListEl, true);
    rafSyncHeights();
  }

  return { render };
}