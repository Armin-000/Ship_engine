/* ======================================================================
   ENGINE NAMING LAYER (Engine 2.0)

   Deterministic display name resolver.
   Priority:
   1) mesh.userData.displayName
   2) Blender mesh.name (with trailing instance suffix cleanup)
   3) Fallback label

   No heuristics. No hardcoded maps.
   Single source of truth for UI display names.
====================================================================== */

const FALLBACK_LABEL = 'Part';

const RE_TRAILING_DOT_NUMBER = /\.\d+$/;
const RE_TRAILING_UNDERSCORE_NUMBER = /_\d+$/;
const RE_TRAILING_HASH_NUMBER = /\s#\d+$/;

function toTrimmedString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function stripTrailingInstanceSuffixes(name) {
  let s = toTrimmedString(name);
  if (!s) return '';

  let prev;
  do {
    prev = s;
    s = s.replace(RE_TRAILING_HASH_NUMBER, '');
    s = s.replace(RE_TRAILING_UNDERSCORE_NUMBER, '');
    s = s.replace(RE_TRAILING_DOT_NUMBER, '');
    s = s.trim();
  } while (s !== prev);

  return s;
}

export function getNiceName(mesh) {
  if (!mesh) return FALLBACK_LABEL;

  const udName = toTrimmedString(mesh.userData?.displayName);
  if (udName) return udName;

  const cleaned = stripTrailingInstanceSuffixes(mesh.name);
  return cleaned || FALLBACK_LABEL;
}

export function prettyFromNodeName(nodeName) {
  const cleaned = stripTrailingInstanceSuffixes(nodeName);
  return cleaned || '(unnamed)';
}