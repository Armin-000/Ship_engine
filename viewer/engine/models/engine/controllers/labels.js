import * as THREE from 'three';
import { isRenderablePart } from '../utils.js';

export const labelItems = [];

let labelLayer = null;
let hoverEl = null;
let rafId = 0;

let enabled = true;
let hoverMesh = null;
let hoverText = '';

let rootCenterW = new THREE.Vector3();

const hoverAnchorCache = new WeakMap();

function ensureLayer(containerRef) {
  if (labelLayer) return labelLayer;
  if (!containerRef) return null;

  const host = containerRef.parentElement || containerRef;

  if (!host.style.position || host.style.position === 'static') {
    host.style.position = 'relative';
  }

  const layer = document.createElement('div');
  layer.className = 'engine-label-layer';

  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '30',
  });

  host.appendChild(layer);
  labelLayer = layer;

  return layer;
}

function ensureHoverEl(layer) {
  if (hoverEl) return hoverEl;

  const el = document.createElement('div');
  el.className = 'engine-label engine-label--hover';

  Object.assign(el.style, {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    opacity: '0',
    pointerEvents: 'none',
    left: '0px',
    top: '0px',
    whiteSpace: 'nowrap',
  });

  layer.appendChild(el);
  hoverEl = el;

  return el;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function setHoverOpacity(val) {
  if (!hoverEl) return;
  hoverEl.style.opacity = String(val);
}

function setHoverTextContent(text) {
  if (!hoverEl) return;
  hoverEl.textContent = text || '';
}

function computeAnchor(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const centerWorld = box.getCenter(new THREE.Vector3());
  const anchorLocal = mesh.worldToLocal(centerWorld.clone());

  return anchorLocal;
}

function getDisplayTitle(mesh, fallbackText, getNiceName) {
  const explicitText = fallbackText && fallbackText.toString().trim();

  if (explicitText) {
    return explicitText;
  }

  return (
    mesh?.userData?.sidebarGroupLabel ||
    mesh?.userData?.sidebarLabel ||
    mesh?.userData?.treeLabel ||
    getNiceName?.(mesh) ||
    mesh?.userData?.displayName ||
    mesh?.name ||
    'Component'
  );
}

function updateLoop({ cameraRef, containerRef, getNiceName, getPushAmount }) {
  const step = () => {
    rafId = requestAnimationFrame(step);

    if (!hoverEl || !containerRef || !cameraRef) return;

    const w = containerRef.clientWidth || 0;
    const h = containerRef.clientHeight || 0;

    if (w < 2 || h < 2) {
      setHoverOpacity(0);
      return;
    }

    if (!enabled) {
      setHoverOpacity(0);
      return;
    }

    if (!hoverMesh || !isRenderablePart(hoverMesh) || !hoverMesh.visible) {
      setHoverOpacity(0);
      return;
    }

    let cached = hoverAnchorCache.get(hoverMesh);

    if (!cached) {
      const anchorLocal = computeAnchor(hoverMesh);
      const nice = getDisplayTitle(hoverMesh, hoverText, getNiceName);

      const push =
        typeof getPushAmount === 'function'
          ? Number(getPushAmount(hoverMesh.name, nice) || 0)
          : 0;

      cached = { anchorLocal, push };
      hoverAnchorCache.set(hoverMesh, cached);
    }

    const worldCenter = hoverMesh.localToWorld(cached.anchorLocal.clone());

    if (cached.push > 0) {
      const dir = worldCenter.clone().sub(rootCenterW);

      if (dir.lengthSq() > 1e-8) {
        dir.normalize();
        worldCenter.addScaledVector(dir, cached.push);
      }
    }

    const ndc = worldCenter.clone().project(cameraRef);

    const invalid =
      !Number.isFinite(ndc.x) ||
      !Number.isFinite(ndc.y) ||
      !Number.isFinite(ndc.z) ||
      ndc.z > 1 ||
      ndc.z < -1 ||
      ndc.x < -1 ||
      ndc.x > 1 ||
      ndc.y < -1 ||
      ndc.y > 1;

    if (invalid) {
      setHoverOpacity(0);
      return;
    }

    const x = (ndc.x * 0.5 + 0.5) * w;
    const y = (-ndc.y * 0.5 + 0.5) * h;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      setHoverOpacity(0);
      return;
    }

    const pad = 10;
    const cx = clamp(x, pad, w - pad);
    const cy = clamp(y, pad, h - pad);

    hoverEl.style.left = `${cx}px`;
    hoverEl.style.top = `${cy}px`;

    const txt = getDisplayTitle(hoverMesh, hoverText, getNiceName);

    if (hoverEl.textContent !== txt) {
      setHoverTextContent(txt);
    }

    setHoverOpacity(1);
  };

  rafId = requestAnimationFrame(step);
}

export function setupLabels(root, deps = {}) {
  const { cameraRef, containerRef, getNiceName, getPushAmount } = deps;

  const layer = ensureLayer(containerRef);

  if (!layer || !cameraRef || !containerRef || !root) {
    return () => {};
  }

  labelItems.forEach((i) => i.el?.remove?.());
  labelItems.length = 0;

  ensureHoverEl(layer);

  const rootBox = new THREE.Box3().setFromObject(root);
  rootBox.getCenter(rootCenterW);

  enabled = true;
  hoverMesh = null;
  hoverText = '';

  setHoverOpacity(0);
  setHoverTextContent('');

  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;

  updateLoop({
    cameraRef,
    containerRef,
    getNiceName,
    getPushAmount,
  });

  return function disposeLabels() {
    enabled = false;
    hoverMesh = null;
    hoverText = '';

    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;

    try {
      hoverEl?.remove?.();
    } catch (_) {}

    hoverEl = null;

    try {
      labelLayer?.remove?.();
    } catch (_) {}

    labelLayer = null;

    labelItems.forEach((i) => i.el?.remove?.());
    labelItems.length = 0;
  };
}

export function setLabelsEnabled(on) {
  enabled = !!on;

  if (!enabled) {
    setHoverOpacity(0);
  }
}

export function setHoverLabel(mesh, text) {
  hoverMesh = isRenderablePart(mesh) ? mesh : null;
  hoverText = getDisplayTitle(hoverMesh, text, null);

  if (hoverEl) {
    setHoverTextContent(hoverText || 'Component');

    if (enabled && hoverMesh) {
      setHoverOpacity(1);
    }
  }
}

export function clearHoverLabel() {
  hoverMesh = null;
  hoverText = '';

  setHoverOpacity(0);
}