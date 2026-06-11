// shared helpers used across engine modules

/**
 * A simple predicate that returns true for any three.js object
 * that we consider "renderable" (mesh, skinned mesh or instanced mesh).
 * This helper was originally duplicated in several controllers; centralizing
 * it here lets us keep the logic in one place and avoid drift.
 */
export function isRenderablePart(o) {
  return !!o && (o.isMesh || o.isSkinnedMesh || o.isInstancedMesh);
}
