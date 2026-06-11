import * as THREE from 'three';
import { regroupTreeForSidebar } from '../../tree.js';

import {
  createDom,
  createPanelController,
  createSidebarState,
  createRenderer,
  bindSidebarEvents,
  createSidebarApi,
} from '@ui/sidebar/sidebar.component.js';

let api = null;
let disposeEvents = null;
let panels = null;

function safe(fn) {
  try {
    fn?.();
  } catch (_) {}
}

export function resetSidebar() {
  safe(() => disposeEvents?.());
  disposeEvents = null;

  safe(() => panels?.dispose?.());
  panels = null;

  safe(() => api?.dispose?.());
  api = null;
}

function isMainEngineSystemName(name = '') {
  return /^(1|2|3|4|5|6|7|8|9|10|11|12|13)(\.|\s)/.test(String(name).trim());
}

export function initComponentSidebar(ctx = {}) {
  if (api) return api;

  const {
    tree,
    visibility,
    focus,
    hover,
    ui = {},
    camera = null,
    controls = null,
  } = ctx;

  if (!tree?.modelTree) return null;

  const dom = createDom({
    helpUrl: ui.helpUrl || '/docs/help/3D_Model_User_Guide.pdf',
    onReset: ui.onReset || null,
    onEmergencyLight: ui.onEmergencyLight || null,

    onLogout: () => {
      localStorage.removeItem("ship_engine_token");
      window.location.reload();
    },
  });

  if (!dom) return null;

  panels = createPanelController({ sidebarEl: dom.sidebarEl });

  const state = createSidebarState({
    sidebarEl: dom.sidebarEl,
    sidebarListEl: dom.sidebarListEl,
    panels,
  });

  const focusOnGroup = (meshes) => {
    if (!meshes?.length || !camera || !controls) return;

    const box = new THREE.Box3();

    meshes.forEach((mesh) => {
      if (mesh) box.expandByObject(mesh);
    });

    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = Math.max(maxDim * 1.05, 0.8);

    const dir = camera.position.clone().sub(controls.target).normalize();
    const nextPos = center.clone().add(dir.multiplyScalar(distance));

    if (window.gsap) {
      window.gsap.to(camera.position, {
        duration: 0.8,
        x: nextPos.x,
        y: nextPos.y,
        z: nextPos.z,
        ease: 'power2.out',
        onUpdate: () => controls.update(),
      });

      window.gsap.to(controls.target, {
        duration: 0.8,
        x: center.x,
        y: center.y,
        z: center.z,
        ease: 'power2.out',
        onUpdate: () => controls.update(),
      });
    } else {
      camera.position.copy(nextPos);
      controls.target.copy(center);
      controls.update();
    }
  };

  const actions = {
    showOnlyMeshes: (set, ownerPath) => {
      visibility.showOnlyMeshes(set, ownerPath);

      if (String(ownerPath || '').toLowerCase().includes('global')) {
        window.dispatchEvent(new CustomEvent('engine:system-cleared'));
        return;
      }

      const label = String(ownerPath || '')
        .split('/')
        .pop()
        .replace(/\s#\d+$/g, '');

      const isTopLevelSystem =
        /^([1-9]|1[0-3])(\.|\s)/.test(label);

      if (isTopLevelSystem) {
        window.dispatchEvent(
          new CustomEvent('engine:sidebar-selected', {
            detail: { label, ownerPath },
          })
        );

        window.dispatchEvent(
          new CustomEvent('engine:system-selected', {
            detail: { label, ownerPath },
          })
        );
      }
    },

    showAllParts: () => visibility.showAllParts(),

    focusOnGroup,

    focusOnPart: (mesh, label) => {
      focus.focusOnPart(mesh, label);

      if (isMainEngineSystemName(label)) {
        window.dispatchEvent(
          new CustomEvent('engine:sidebar-selected', {
            detail: { label },
          })
        );

        window.dispatchEvent(new CustomEvent('engine:system-selected'));
      }
    },

    isFocusMode: () => focus.isFocusMode(),
    exitFocusMode: () => focus.exitFocusMode(),

    setHoverMesh: (mesh) => hover.setHoverMesh(mesh),
    clearHover: () => hover.clearHover(),

    isMeshHidden: (m) => visibility.isMeshHidden(m),
    toggleMeshHidden: (m) => visibility.toggleMeshHidden(m),
    setMeshesHidden: (arr, hidden) => visibility.setMeshesHidden(arr, hidden),
    refreshVisibility: () => visibility.refreshVisibility(),

    getActiveFilterOwnerPath: () => visibility.getActiveFilterOwnerPath(),
    getVisibility: () => visibility.getVisibility?.(),

    triggerEmergencyLight: () => {
      ui?.onEmergencyLight?.();
    },
  };

  const renderer = createRenderer({
    dom,
    panels,
    state,

    prettyFromNodeName: tree.prettyFromNodeName,
    getNiceName: tree.getNiceName,
    collectMeshesInSubtree: tree.collectMeshesInSubtree,

    actions,
  });

  const sidebarTree = regroupTreeForSidebar(tree.modelTree);
  renderer.render(sidebarTree);

  api = createSidebarApi({
    dom,
    state,
    panels,
    getVisibility: actions.getVisibility,
    clearHover: actions.clearHover,
  });

  disposeEvents = bindSidebarEvents({
    dom,
    api,
    getVisibility: actions.getVisibility,
    clearHover: actions.clearHover,
  });

  const prevDispose = api.dispose;

  api.dispose = () => {
    safe(() => disposeEvents?.());
    disposeEvents = null;

    safe(() => panels?.dispose?.());
    panels = null;

    safe(() => prevDispose?.());
  };

  return api;
}