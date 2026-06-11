import * as THREE from 'three';

function isMaterialArray(m) {
  return Array.isArray(m);
}

function cloneMaterial(mat) {
  return mat?.clone ? mat.clone() : mat;
}

function tintMaterialInPlace(m, colorHex, emissiveIntensity = 1.4) {
  if (!m) return;

  const color = new THREE.Color(colorHex);

  if (m.emissive && m.emissive.isColor) {
    m.emissive.set(color);
    m.emissiveIntensity = emissiveIntensity;
  } else if (m.color && m.color.isColor) {
    m.color.set(color);
  }
}

function cloneAndTintMaterial(mat, colorHex, emissiveIntensity = 1.4) {
  if (!mat) return mat;

  const m = cloneMaterial(mat);
  if (!m) return m;

  try {
    tintMaterialInPlace(m, colorHex, emissiveIntensity);
  } catch (_) {}

  return m;
}

export function createHoverHighlighter(deps = {}) {
  const { getNiceName, setHoverLabel, clearHoverLabel, root } = deps;

  let hoveredTarget = null;
  let hoveredItems = [];

  const fadedMeshes = [];

  function disposeMaterialClones(material) {
    try {
      if (Array.isArray(material)) material.forEach((m) => m?.dispose?.());
      else material?.dispose?.();
    } catch (_) {}
  }

  function makeTransparentClone(originalMaterial, opacity = 0.1) {
    if (Array.isArray(originalMaterial)) {
      return originalMaterial.map((mat) => {
        const clone = cloneMaterial(mat);
        clone.transparent = true;
        clone.opacity = opacity;
        clone.depthWrite = false;
        return clone;
      });
    }

    const clone = cloneMaterial(originalMaterial);
    clone.transparent = true;
    clone.opacity = opacity;
    clone.depthWrite = false;
    return clone;
  }

  function collectMeshes(target) {
    const meshes = [];

    if (!target) return meshes;

    if (target.isMesh) {
      meshes.push(target);
      return meshes;
    }

    target.traverse?.((obj) => {
      if (obj.isMesh) meshes.push(obj);
    });

    return meshes;
  }

  function isInsideTarget(obj, target) {
    let current = obj;

    while (current) {
      if (current === target) return true;
      current = current.parent;
    }

    return false;
  }

  function fadeOtherParts(activeTarget) {
    if (!root || !activeTarget) return;

    fadedMeshes.length = 0;

    root.traverse((obj) => {
      if (!obj.isMesh) return;
      if (isInsideTarget(obj, activeTarget)) return;

      const originalMaterial = obj.material;
      const fadedMaterial = makeTransparentClone(originalMaterial, 0.1);

      obj.material = fadedMaterial;

      fadedMeshes.push({
        mesh: obj,
        originalMaterial,
        fadedMaterial,
      });
    });
  }

  function restoreOtherParts() {
    fadedMeshes.forEach(({ mesh, originalMaterial, fadedMaterial }) => {
      mesh.material = originalMaterial;
      disposeMaterialClones(fadedMaterial);
    });

    fadedMeshes.length = 0;
  }

  function clear() {
    restoreOtherParts();

    for (const item of hoveredItems) {
      item.mesh.material = item.originalMaterial;
      disposeMaterialClones(item.clonedMaterial);
    }

    hoveredItems.length = 0;
    hoveredTarget = null;

    try {
      clearHoverLabel?.();
    } catch (_) {}
  }

function getLabelName(target, labelMesh) {
  return (
    target?.userData?.displayName ||
    target?.name ||
    getNiceName?.(target) ||
    getNiceName?.(labelMesh) ||
    ''
  );
}

function set(target, color = 0x0a8dda) {
  if (!target) return;

  const meshes = collectMeshes(target);
  const labelMesh = meshes[0];

  if (hoveredTarget === target) {
    try {
      setHoverLabel?.(labelMesh, getLabelName(target, labelMesh));
    } catch (_) {}
    return;
  }

  clear();

  hoveredTarget = target;

  if (!meshes.length) return;

  hoveredItems = meshes.map((mesh) => {
    const originalMaterial = mesh.material;

    let clonedMaterial;

    if (isMaterialArray(originalMaterial)) {
      clonedMaterial = originalMaterial.map((m) =>
        cloneAndTintMaterial(m, color)
      );
    } else {
      clonedMaterial = cloneAndTintMaterial(originalMaterial, color);
    }

    mesh.material = clonedMaterial;

    return {
      mesh,
      originalMaterial,
      clonedMaterial,
    };
  });

  fadeOtherParts(target);

  try {
    setHoverLabel?.(labelMesh, getLabelName(target, labelMesh));
  } catch (_) {}
}

  function dispose() {
    clear();
  }

  return {
    set,
    clear,
    dispose,
  };
}