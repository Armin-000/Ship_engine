import * as THREE from "three";

const gsap = window.gsap || null;

let activeRoot = null;
let activeConfig = null;
let items = [];
let exploded = false;
let busy = false;

/* =========================================================
   HELPERS
========================================================= */

function normalizeName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function vecFrom(obj = {}) {
  return new THREE.Vector3(obj.x ?? 0, obj.y ?? 0, obj.z ?? 0);
}

function eulerFrom(obj = {}) {
  return new THREE.Euler(obj.x ?? 0, obj.y ?? 0, obj.z ?? 0);
}

function directionVector(dir = "right", distance = 1) {
  const directions = {
    top: new THREE.Vector3(0, 1, 0),
    bottom: new THREE.Vector3(0, -1, 0),
    left: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(1, 0, 0),
    front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1),

    up: new THREE.Vector3(0, 1, 0),
    down: new THREE.Vector3(0, -1, 0),
  };

  return (directions[dir] || directions.right)
    .clone()
    .multiplyScalar(distance);
}

function getObjectNames(obj) {
  return [
    obj?.name,
    obj?.userData?.displayName,
    obj?.userData?.breadcrumb,
  ].filter(Boolean);
}

function isNameMatch(objectName, configName) {
  const a = normalizeName(objectName);
  const b = normalizeName(configName);

  if (!a || !b) return false;

  // Najsigurnije: prvo traži potpuno isto ime
  if (a === b) return true;

  // Za generičke Object nazive NE koristi includes,
  // jer Object 37 1 / Object 37 2 / Object 37 3 mogu pogoditi krivo.
  if (a.startsWith("object") || b.startsWith("object")) {
    return false;
  }

  // Za normalne nazive dopuštamo fleksibilno matchanje
  return a.includes(b) || b.includes(a);
}

/* =========================================================
   FIND CONFIG FOR SELECTED SYSTEM
========================================================= */

function findMatchingConfigForRoot(root, config) {
  if (!root || !config) return null;

  const rootNames = getObjectNames(root);

  for (const [systemName, systemConfig] of Object.entries(config)) {
    for (const rootName of rootNames) {
      if (isNameMatch(rootName, systemName)) {
        return systemConfig;
      }
    }
  }

  return null;
}

/* =========================================================
   FIND CHILD OBJECT INSIDE SELECTED SYSTEM
========================================================= */

function findChildByName(root, targetName) {
  if (!root || !targetName) return null;

  const targetKey = normalizeName(targetName);
  let exactFound = null;
  let softFound = null;

  root.traverse((obj) => {
    if (exactFound) return;

    const names = getObjectNames(obj);

    for (const name of names) {
      const key = normalizeName(name);

      if (!key) continue;

      // 1. prvo traži TOČNO ime
      if (key === targetKey) {
        exactFound = obj;
        return;
      }

      // 2. za normalna imena dopusti includes, ali NE za Object/Engine numerirane dijelove
      const isGenericNumbered =
        targetKey.startsWith("object") ||
        key.startsWith("object") ||
        targetKey.includes("engine3") ||
        key.includes("engine3");

      if (!isGenericNumbered && (key.includes(targetKey) || targetKey.includes(key))) {
        softFound = obj;
      }
    }
  });

  return exactFound || softFound;
}

/* =========================================================
   MAIN PREPARE
========================================================= */

export function prepareSystemExplode(root, options = {}) {
  const config = options.config || {};

  activeRoot = root;
  activeConfig = findMatchingConfigForRoot(root, config);

  items = [];
  exploded = false;
  busy = false;

  if (!activeRoot) {
    return;
  }

  if (!activeConfig) {
    return;
  }

  activeRoot.updateWorldMatrix(true, true);

// console.group("[SYSTEM EXPLODE DEBUG] Active root:", activeRoot.name);

/*
activeRoot.traverse((obj) => {
  if (obj.name) {
    console.log({
      name: obj.name,
      displayName: obj.userData?.displayName,
      breadcrumb: obj.userData?.breadcrumb,
      type: obj.type,
    });
  }
});
*/

//  console.groupEnd();

  for (const [partName, rule] of Object.entries(activeConfig)) {
    const obj = findChildByName(activeRoot, partName);

    if (!obj) {
      // console.warn("[SYSTEM EXPLODE] Part not found:", partName);
      continue;
    }

    if (!obj.parent) {
      // console.warn("[SYSTEM EXPLODE] Part has no parent:", partName);
      continue;
    }

    obj.matrixAutoUpdate = true;

    const startWorldPos = new THREE.Vector3();
    obj.getWorldPosition(startWorldPos);

    const rawMove = rule.move
      ? vecFrom(rule.move)
      : directionVector(rule.dir, rule.distance ?? 1);

    const isValves = getObjectNames(activeRoot).some((name) =>
      normalizeName(name).includes("8valves")
    );

    const move = isValves
      ? rawMove.multiplyScalar(rule.scale ?? 0.15)
      : rawMove.multiplyScalar(rule.scale ?? 1);

    const finalWorldPos = startWorldPos.clone().add(move);

    const startPos = obj.position.clone();
    const finalPos = obj.parent.worldToLocal(finalWorldPos.clone());

    const startRot = obj.rotation.clone();
    const addRot = eulerFrom(rule.rotate);

    const finalRot = new THREE.Euler(
      startRot.x + addRot.x,
      startRot.y + addRot.y,
      startRot.z + addRot.z,
      startRot.order
    );

    items.push({
      obj,
      name: partName,
      startPos,
      finalPos,
      startRot,
      finalRot,
    });
  }

  // console.log(`[SYSTEM EXPLODE] Registered parts: ${items.length}`);
  /*
  console.table(
    items.map((p) => ({
      name: p.name,
      object: p.obj.name,
    }))
  );
  */
}

/* =========================================================
   ANIMATION
========================================================= */

function animateItem(item, toExploded = true) {
  const targetPos = toExploded ? item.finalPos : item.startPos;
  const targetRot = toExploded ? item.finalRot : item.startRot;

  if (!gsap) {
    item.obj.position.copy(targetPos);
    item.obj.rotation.copy(targetRot);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    gsap.to(item.obj.position, {
      duration: 0.85,
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      ease: toExploded ? "power2.out" : "power2.inOut",
      onComplete: resolve,
    });

    gsap.to(item.obj.rotation, {
      duration: 0.85,
      x: targetRot.x,
      y: targetRot.y,
      z: targetRot.z,
      ease: toExploded ? "power2.out" : "power2.inOut",
    });
  });
}

/* =========================================================
   PUBLIC API
========================================================= */

export async function explodeSystem() {
  if (busy) return exploded;

  if (!items.length) {
    // console.warn("[SYSTEM EXPLODE] No registered parts.");
    return exploded;
  }

  busy = true;

  await Promise.all(items.map((item) => animateItem(item, true)));

  exploded = true;
  busy = false;

  return true;
}

export async function implodeSystem() {
  if (busy) return exploded;

  if (!items.length) {
    // console.warn("[SYSTEM EXPLODE] No registered parts.");
    return exploded;
  }

  busy = true;

  await Promise.all(items.map((item) => animateItem(item, false)));

  exploded = false;
  busy = false;

  return false;
}

export async function toggleSystemExplode() {
  if (busy) return exploded;

  if (exploded) {
    return await implodeSystem();
  }

  return await explodeSystem();
}