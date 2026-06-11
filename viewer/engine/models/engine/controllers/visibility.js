/* ======================================================================
   ENGINE VISIBILITY
   - Central visibility policy (hidden meshes + isolate + focus override)
   - Also controls PICKING via layers (prevents clicking invisible parts)
====================================================================== */

import { isRenderablePart } from '../utils.js';

const PICK_LAYER = 0;
const HIDDEN_LAYER = 1;

function setPickable(mesh, pickable) {
  if (!mesh) return;
  mesh.layers.set(pickable ? PICK_LAYER : HIDDEN_LAYER);
}

export function createVisibilityController({ root }) {
  if (!root) {
    return {
      refreshVisibility: () => {},
      collectAllMeshes: () => [],
      showOnlyMeshes: () => {},
      showAllParts: () => {},
      clearIsolate: () => {},
      clearHidden: () => {},
      isMeshHidden: () => false,
      toggleMeshHidden: () => true,
      setMeshesHidden: () => {},
      getActiveFilterOwnerPath: () => null,
      setFocusOverride: () => {},
      clearHoverUX: () => {},
      applyHoverUX: () => {},
    };
  }

  let cachedMeshes = null;

  const hiddenMeshes = new Set();

  let isolateSet = null;
  let isolateOwnerPath = null;

  let focusOverrideSet = null;

  let hoveredMesh = null;

  function collectAllMeshes() {
    if (cachedMeshes) return cachedMeshes;

    const arr = [];
    root.traverse((o) => {
      if (isRenderablePart(o)) {
        arr.push(o);
        if (typeof o.layers?.set === 'function') o.layers.set(PICK_LAYER);
      }
    });

    cachedMeshes = arr;
    return arr;
  }

  function invalidateMeshCache() {
    cachedMeshes = null;
  }

  function getActiveAllowedSet() {
    return focusOverrideSet || isolateSet || null;
  }

  function refreshVisibility() {
    const meshes = collectAllMeshes();
    const allowed = getActiveAllowedSet();

    if (!allowed) {
      for (const m of meshes) {
        const hidden = hiddenMeshes.has(m);
        m.visible = !hidden;
        setPickable(m, !hidden);
      }
      return;
    }

    for (const m of meshes) {
      const hidden = hiddenMeshes.has(m);
      const visible = allowed.has(m) && !hidden;
      m.visible = visible;
      setPickable(m, visible);
    }
  }

  function showOnlyMeshes(set, ownerPath = null) {
    isolateSet = set instanceof Set ? set : null;
    isolateOwnerPath = isolateSet ? ownerPath : null;
    refreshVisibility();
  }

  function showAllParts() {
    isolateSet = null;
    isolateOwnerPath = null;
    refreshVisibility();
  }

  function clearIsolate() {
    isolateSet = null;
    isolateOwnerPath = null;
    refreshVisibility();
  }

  function getActiveFilterOwnerPath() {
    return isolateOwnerPath;
  }

  function isMeshHidden(mesh) {
    return !!mesh && hiddenMeshes.has(mesh);
  }

  function setMeshesHidden(arr, hidden) {
    if (!arr) return;
    const list = Array.isArray(arr) ? arr : Array.from(arr);

    if (hidden) {
      for (const m of list) if (m) hiddenMeshes.add(m);
    } else {
      for (const m of list) if (m) hiddenMeshes.delete(m);
    }

    refreshVisibility();
  }

  function toggleMeshHidden(mesh) {
    if (!mesh) return true;

    if (hiddenMeshes.has(mesh)) {
      hiddenMeshes.delete(mesh);
      refreshVisibility();
      return true;
    }

    hiddenMeshes.add(mesh);
    refreshVisibility();
    return false;
  }

  function clearHidden() {
    hiddenMeshes.clear();
    refreshVisibility();
  }

  function setFocusOverride(allowedSetOrNull) {
    focusOverrideSet = allowedSetOrNull instanceof Set ? allowedSetOrNull : null;
    refreshVisibility();
  }

  function applyHoverUX(mesh) {
    hoveredMesh = mesh || null;
  }

  function clearHoverUX() {
    hoveredMesh = null;
  }

  return {
    refreshVisibility,
    collectAllMeshes,

    showOnlyMeshes,
    showAllParts,
    clearIsolate,
    getActiveFilterOwnerPath,

    isMeshHidden,
    toggleMeshHidden,
    setMeshesHidden,
    clearHidden,

    setFocusOverride,

    applyHoverUX,
    clearHoverUX,

    _invalidateMeshCache: invalidateMeshCache,

    _getState: () => ({
      hiddenCount: hiddenMeshes.size,
      isolateActive: !!isolateSet,
      isolateOwnerPath,
      focusOverrideActive: !!focusOverrideSet,
      hovered: hoveredMesh?.name || null,
    }),
  };
}