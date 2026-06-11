/* ======================================================================
   ENGINE PICKING
   - Raycast hover + pick
   - Desktop: delayed hover + double click
   - Mobile/Tablet: tap to pick
   - Hover appears after user stays still on same area
====================================================================== */

import * as THREE from 'three';
import { isRenderablePart } from '../utils.js';

function hasGoodName(n) {
  return (
    !!n &&
    n.trim() &&
    n !== 'Scene' &&
    n !== 'Scene_Collection' &&
    n !== 'RootNode' &&
    n !== 'NamedViews' &&
    n !== 'Layers'
  );
}

function findRenderableUp(obj, stopRoot) {
  let o = obj;

  while (o && o !== stopRoot) {
    if (isRenderablePart(o)) return o;
    o = o.parent;
  }

  return null;
}

function findStableOwnerRenderable(obj, stopRoot) {
  if (!obj) return null;

  let best = obj;
  let p = obj.parent;
  let depth = 0;

  while (p && p !== stopRoot && depth < 10) {
    if (isRenderablePart(p) && hasGoodName(p.name)) best = p;
    p = p.parent;
    depth++;
  }

  return best || obj;
}

export function createPicking({
  renderer,
  camera,
  root,
  getMeshes,
  canPick,
  onHoverMesh,
  onPickMesh,
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let bound = false;

  let onPointerMove = null;
  let onPointerDown = null;
  let onPointerUp = null;
  let onPointerEnter = null;
  let onPointerLeave = null;
  let onPointerCancel = null;
  let onDblClick = null;
  let onWindowBlur = null;

  let lastHover = null;
  let hoverTimer = null;

  const HOVER_DELAY = 250;
  const TAP_MOVE_LIMIT = 10;
  const TAP_TIME_LIMIT = 250;

  let pointerInside = false;
  let dragging = false;

  let downX = 0;
  let downY = 0;
  let downTime = 0;

  let lastMoveX = 0;
  let lastMoveY = 0;

  function emitHover(meshOrNull) {
    if (meshOrNull === lastHover) return;

    lastHover = meshOrNull;

    try {
      onHoverMesh?.(meshOrNull);
    } catch (_) {}
  }

  function clearHoverTimer() {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
  }

  function clearHoverState() {
    clearHoverTimer();
    emitHover(null);
  }

  function getHitAt(clientX, clientY, dom) {
    if (!camera || !root) return null;

    const rect = dom.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;

    pointer.x = ((clientX - rect.left) / w) * 2 - 1;
    pointer.y = -((clientY - rect.top) / h) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const meshes = getMeshes?.() || [];
    if (!meshes.length) return null;

    const hits = raycaster.intersectObjects(meshes, true);
    if (!hits.length) return null;

    const hitObj = hits[0]?.object;
    const up = findRenderableUp(hitObj, root);
    const stable = findStableOwnerRenderable(up, root);

    if (!isRenderablePart(stable)) return null;

    return stable;
  }

  function pickAt(clientX, clientY, dom) {
    if (!canPick?.()) return;

    const hit = getHitAt(clientX, clientY, dom);
    if (!hit) return;

    clearHoverState();

    try {
      onPickMesh?.(hit);
    } catch (_) {}
  }

  function scheduleDelayedHover(clientX, clientY, dom) {
    if (!pointerInside || dragging || !canPick?.()) {
      clearHoverState();
      return;
    }

    clearHoverTimer();

    hoverTimer = setTimeout(() => {
      if (!pointerInside || dragging || !canPick?.()) return;

      const hit = getHitAt(clientX, clientY, dom);
      emitHover(hit);
    }, HOVER_DELAY);
  }

  function teardown() {
    clearHoverState();

    if (!renderer || !bound) return;

    const dom = renderer.domElement;

    if (onPointerMove) dom.removeEventListener('pointermove', onPointerMove);
    if (onPointerDown) dom.removeEventListener('pointerdown', onPointerDown);
    if (onPointerUp) dom.removeEventListener('pointerup', onPointerUp);
    if (onPointerEnter) dom.removeEventListener('pointerenter', onPointerEnter);
    if (onPointerLeave) dom.removeEventListener('pointerleave', onPointerLeave);
    if (onPointerCancel) dom.removeEventListener('pointercancel', onPointerCancel);
    if (onDblClick) dom.removeEventListener('dblclick', onDblClick);
    if (onWindowBlur) window.removeEventListener('blur', onWindowBlur);

    onPointerMove = null;
    onPointerDown = null;
    onPointerUp = null;
    onPointerEnter = null;
    onPointerLeave = null;
    onPointerCancel = null;
    onDblClick = null;
    onWindowBlur = null;

    bound = false;
    pointerInside = false;
    dragging = false;
    lastHover = null;

    emitHover(null);
  }

  function setup() {
    if (!renderer || !camera) return;

    teardown();

    const dom = renderer.domElement;

    onPointerEnter = (event) => {
      pointerInside = true;
      dragging = false;

      lastMoveX = event.clientX;
      lastMoveY = event.clientY;

      scheduleDelayedHover(event.clientX, event.clientY, dom);
    };

    onPointerMove = (event) => {
      pointerInside = true;

      const moveDx = Math.abs(event.clientX - lastMoveX);
      const moveDy = Math.abs(event.clientY - lastMoveY);

      lastMoveX = event.clientX;
      lastMoveY = event.clientY;

      if (event.buttons && (moveDx > 2 || moveDy > 2)) {
        dragging = true;
        clearHoverState();
        return;
      }

      dragging = false;

      scheduleDelayedHover(event.clientX, event.clientY, dom);
    };

    onPointerDown = (event) => {
      pointerInside = true;

      downX = event.clientX;
      downY = event.clientY;
      downTime = performance.now();

      lastMoveX = event.clientX;
      lastMoveY = event.clientY;

      dragging = false;
      clearHoverState();
    };

    onPointerUp = (event) => {
      pointerInside = true;

      const dx = Math.abs(event.clientX - downX);
      const dy = Math.abs(event.clientY - downY);
      const dt = performance.now() - downTime;

      const isTap = dx < TAP_MOVE_LIMIT && dy < TAP_MOVE_LIMIT && dt < TAP_TIME_LIMIT;

      dragging = false;

      if (isTap) {
        pickAt(event.clientX, event.clientY, dom);
        return;
      }

      scheduleDelayedHover(event.clientX, event.clientY, dom);
    };

    onPointerLeave = () => {
      pointerInside = false;
      dragging = false;
      clearHoverState();
    };

    onPointerCancel = () => {
      pointerInside = false;
      dragging = false;
      clearHoverState();
    };

    onWindowBlur = () => {
      pointerInside = false;
      dragging = false;
      clearHoverState();
    };

    onDblClick = (event) => {
      try {
        event.preventDefault();
      } catch (_) {}

      pickAt(event.clientX, event.clientY, dom);
    };

    dom.addEventListener('pointerenter', onPointerEnter, { passive: true });
    dom.addEventListener('pointermove', onPointerMove, { passive: true });
    dom.addEventListener('pointerdown', onPointerDown, { passive: true });
    dom.addEventListener('pointerup', onPointerUp, { passive: true });
    dom.addEventListener('pointerleave', onPointerLeave, { passive: true });
    dom.addEventListener('pointercancel', onPointerCancel, { passive: true });
    dom.addEventListener('dblclick', onDblClick);

    window.addEventListener('blur', onWindowBlur, { passive: true });

    bound = true;
  }

  return { setup, teardown };
}