import * as THREE from "three";
import { EXPLODE_CONFIG } from "./explode.config.js";

export const state = {
  parts: [],
  isExploded: false,
  targetExploded: false,
  playing: false,
  dir: 1,
  t: 0,
  duration: EXPLODE_CONFIG.duration ?? 2.2,
  raf: null,
};

let waiters = [];

function smoothstep(x) {
  return x * x * (3 - 2 * x);
}

function vecFrom(obj = {}) {
  return new THREE.Vector3(obj.x ?? 0, obj.y ?? 0, obj.z ?? 0);
}

function eulerFrom(obj = {}) {
  return new THREE.Euler(obj.x ?? 0, obj.y ?? 0, obj.z ?? 0);
}

function normalizeName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function getHierarchy(obj, root) {
  const list = [];
  let current = obj;

  while (current && current !== root) {
    if (current.name) list.unshift(current.name);
    current = current.parent;
  }

  return list;
}

function findManualRule(obj, root) {
  const manual = EXPLODE_CONFIG.manual ?? {};
  const hierarchy = getHierarchy(obj, root);

  let bestRule = null;
  let bestScore = -1;
  let bestName = null;

  for (const configName of Object.keys(manual)) {
    const configNorm = normalizeName(configName);

    for (const objName of hierarchy) {
      const objNorm = normalizeName(objName);

      if (objNorm === configNorm) {
        const score = configNorm.length + 10000;

        if (score > bestScore) {
          bestScore = score;
          bestRule = manual[configName];
          bestName = configName;
        }
      }
    }
  }

  if (!bestRule) return null;

  return {
    rule: bestRule,
    configName: bestName,
  };
}

function buildAutoRule(obj, root) {
  const rootBox = new THREE.Box3().setFromObject(root);
  const objBox = new THREE.Box3().setFromObject(obj);

  const rootCenter = new THREE.Vector3();
  const objCenter = new THREE.Vector3();

  rootBox.getCenter(rootCenter);
  objBox.getCenter(objCenter);

  const dir = objCenter.clone().sub(rootCenter);

  if (dir.lengthSq() < 0.000001) {
    dir.set(1, 0.2, 0);
  }

  dir.normalize();

  return {
    move: dir.multiplyScalar(1.5),
    rotate: new THREE.Euler(0, Math.PI * 0.08, 0),
    source: "auto",
    configName: null,
  };
}

function buildRule(obj, root) {
  const manualMatch = findManualRule(obj, root);

  if (manualMatch) {
    return {
      move: vecFrom(manualMatch.rule.move),
      rotate: eulerFrom(manualMatch.rule.rotate),
      source: "manual",
      configName: manualMatch.configName,
    };
  }

  return buildAutoRule(obj, root);
}

function settleWaiters() {
  const list = waiters.slice();
  waiters.length = 0;

  for (const w of list) {
    try {
      w?.resolve?.(state.isExploded);
    } catch (_) {}
  }
}

function whenIdle() {
  if (!state.playing) return Promise.resolve(state.isExploded);

  return new Promise((resolve) => {
    waiters.push({ resolve });
  });
}

export function stopAnim() {
  if (state.raf) cancelAnimationFrame(state.raf);

  state.raf = null;
  state.playing = false;

  settleWaiters();
}

function findObjectByConfigName(root, configName) {
  const target = normalizeName(configName);
  let found = null;

  root.traverse((obj) => {
    if (found) return;

    const names = [
      obj.name,
      obj.userData?.displayName,
      obj.userData?.breadcrumb,
    ].filter(Boolean);

    for (const name of names) {
      const current = normalizeName(name);

      if (current === target) {
        found = obj;
        return;
      }
    }
  });

  return found;
}

export function prepareExplode(model) {
  state.parts.length = 0;
  if (!model) return;

  model.updateWorldMatrix(true, true);

  const meshes = [];

  const systems = [];

  const manual = EXPLODE_CONFIG.manual ?? {};

  for (const configName of Object.keys(manual)) {
    const obj = findObjectByConfigName(model, configName);

    if (!obj) {
      console.warn("[EXPLODE] System not found:", configName);
      continue;
    }

    systems.push({
      obj,
      configName,
      rule: manual[configName],
    });
  }

  for (const item of systems) {
    const obj = item.obj;
    const built = {
      move: vecFrom(item.rule.move),
      rotate: eulerFrom(item.rule.rotate),
      source: "manual",
      configName: item.configName,
    };
    if (!obj.parent) continue;

    obj.matrixAutoUpdate = true;

    const startWorldPos = new THREE.Vector3();
    obj.getWorldPosition(startWorldPos);

    const finalWorldPos = startWorldPos.clone().add(built.move);

    const startPos = obj.position.clone();
    const finalPos = obj.parent.worldToLocal(finalWorldPos.clone());

    const startRot = obj.rotation.clone();

    const finalRot = new THREE.Euler(
      startRot.x + built.rotate.x,
      startRot.y + built.rotate.y,
      startRot.z + built.rotate.z,
      startRot.order
    );

    state.parts.push({
      obj,
      startPos,
      finalPos,
      startRot,
      finalRot,
      name: obj.name,
      source: built.source,
      configName: built.configName,
      hierarchy: getHierarchy(obj, model).join(" / "),
    });
  }

// console.log(`[EXPLODE] Registered parts: ${state.parts.length}`);

// console.table(
//   state.parts.map((p) => ({
//     mesh: p.name,
//     source: p.source,
//     config: p.configName,
//     hierarchy: p.hierarchy,
//   }))
// );

  state.t = 0;
  state.isExploded = false;
  state.targetExploded = false;
  state.playing = false;
  state.duration = EXPLODE_CONFIG.duration ?? state.duration;

  settleWaiters();
}

function updateExplode(dt) {
  if (!state.playing || !state.parts.length) return;

  state.t = THREE.MathUtils.clamp(
    state.t + (dt / state.duration) * state.dir,
    0,
    1
  );

  const k = smoothstep(state.t);

  for (const p of state.parts) {
    p.obj.position.lerpVectors(p.startPos, p.finalPos, k);

    p.obj.rotation.x = THREE.MathUtils.lerp(p.startRot.x, p.finalRot.x, k);
    p.obj.rotation.y = THREE.MathUtils.lerp(p.startRot.y, p.finalRot.y, k);
    p.obj.rotation.z = THREE.MathUtils.lerp(p.startRot.z, p.finalRot.z, k);
  }

  if (state.t === 0 || state.t === 1) {
    state.playing = false;
    state.isExploded = state.t === 1;
    state.targetExploded = state.isExploded;
    settleWaiters();
  }
}

function playExplode(forward = true) {
  if (!state.parts.length) {
    console.warn("[EXPLODE] No parts registered. prepareExplode(model) was not ready.");
    return false;
  }

  state.dir = forward ? 1 : -1;
  state.playing = true;

  if (state.raf) {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }

  let last = performance.now();

  const loop = (now) => {
    const dt = (now - last) / 1000;
    last = now;

    updateExplode(dt);

    if (state.playing) {
      state.raf = requestAnimationFrame(loop);
    } else {
      state.raf = null;
    }
  };

  state.raf = requestAnimationFrame(loop);
  return true;
}

export function explodeMotor() {
  state.targetExploded = true;

  if (state.playing) {
    state.dir = 1;
    return whenIdle();
  }

  const started = playExplode(true);
  if (!started) state.targetExploded = state.isExploded;

  return whenIdle();
}

export function implodeMotor() {
  state.targetExploded = false;

  if (state.playing) {
    state.dir = -1;
    return whenIdle();
  }

  const started = playExplode(false);
  if (!started) state.targetExploded = state.isExploded;

  return whenIdle();
}

export function toggleExplode() {
  return state.targetExploded ? implodeMotor() : explodeMotor();
}

export function explodeWhenIdle() {
  return whenIdle();
}