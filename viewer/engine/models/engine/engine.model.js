import * as THREE from 'three';

import {
  state,
  prepareExplode,
  stopAnim,
  explodeMotor,
  implodeMotor,
  toggleExplode,
} from './controllers/explode.js';

import {
  setupLabels,
  setLabelsEnabled,
  setHoverLabel,
  clearHoverLabel,
  labelItems,
} from './controllers/labels.js';

import {
  prepareSystemExplode,
  explodeSystem,
  implodeSystem,
  toggleSystemExplode,
} from './controllers/systemExplode.js';

import { SYSTEM_EXPLODE_CONFIG } from './controllers/system-explode.config.js';

import { initFocus, focusOnPart, exitFocusMode, isFocusMode } from './controllers/focus.js';
import { initComponentSidebar, resetSidebar } from './ui/sidebar/engine.sidebar.js';

import { getNiceName, prettyFromNodeName } from './names.js';
import { buildEngineTree, collectMeshesInSubtree } from './tree.js';
import { createPicking } from './controllers/picking.js';
import { createVisibilityController } from './controllers/visibility.js';
import { createResetController } from './controllers/reset.js';

import { createHoverHighlighter } from './controllers/hover.js';

const gsap = window.gsap || null;

/* ======================================================================
   META
====================================================================== */

export const id = 'engine';
export const name = '3D Engine';
export const url = '/glb/FIXED_ENGINE_ROOM.glb';

export const viewPreset = {
  dir: new THREE.Vector3(0, 0.15, -8).normalize(),
  distanceMul: 1.05,
  offset: new THREE.Vector3(0.0, 0.0, 0.0),
  targetOffset: new THREE.Vector3(0.0, 0.15, 0.0),
};

/* ======================================================================
   INTERNAL CTX
====================================================================== */

let ctx = null;

let activeMainSystemRoot = null;
let systemExploded = false;
let emergencyLightEnabled = false;

function isInsideObject(obj, parent) {
  let current = obj;

  while (current) {
    if (current === parent) return true;
    current = current.parent;
  }

  return false;
}

function collectMeshesFromObject(target) {
  const meshes = [];

  if (!target) return meshes;

  target.traverse?.((obj) => {
    if (obj.isMesh || obj.isSkinnedMesh || obj.isInstancedMesh) {
      meshes.push(obj);
    }
  });

  return meshes;
}

function focusCameraOnObject(targetObj) {
  if (!targetObj || !ctx?.camera || !ctx?.controls) return;

  const box = new THREE.Box3().setFromObject(targetObj);

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  box.getCenter(center);
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = Math.max(maxDim * 1.8, 0.8);

  const dir = ctx.camera.position
    .clone()
    .sub(ctx.controls.target)
    .normalize();

  const newPos = center.clone().add(dir.multiplyScalar(distance));

  if (gsap) {
    gsap.to(ctx.camera.position, {
      duration: 0.8,
      x: newPos.x,
      y: newPos.y,
      z: newPos.z,
      ease: 'power2.out',
      onUpdate: () => ctx.controls.update(),
    });

    gsap.to(ctx.controls.target, {
      duration: 0.8,
      x: center.x,
      y: center.y,
      z: center.z,
      ease: 'power2.out',
      onUpdate: () => ctx.controls.update(),
    });
  } else {
    ctx.camera.position.copy(newPos);
    ctx.controls.target.copy(center);
    ctx.controls.update();
  }
}

const MAIN_SYSTEM_NAMES = [
  "1. Structure",
  "2. Exhaust system",
  "3. Plate heat exchanger",
  "4. Port Generator",
  "5. Main engine No.1",
  "6 Transmition",
  "6. Transmission",
  "7. Pipes",
  "8. Valves",
  "9. Propeller",
  "10. Fire System",
  "11. Lube oil tank",
  "12. Service Air Reciever",
  "12. Service Air Receiver",
  "13. Duplex Oil strainer",
];

function normalizeSystemName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findMainSystemRoot(obj, root) {
  let current = obj;
  let best = obj;

  while (current && current !== root) {
    const names = [
      current.name,
      current.userData?.displayName,
      current.userData?.breadcrumb,
    ].filter(Boolean);

    for (const name of names) {
      const n = normalizeSystemName(name);

      for (const systemName of MAIN_SYSTEM_NAMES) {
        const s = normalizeSystemName(systemName);

        if (n === s || n.includes(s) || s.includes(n)) {
          best = current;
        }
      }
    }

    current = current.parent;
  }

  return best;
}

function safe(fn) {
  try { fn?.(); } catch (_) {}
}

function applyUXPolicy() {
  setLabelsEnabled(true);

  ctx?.visibility?.clearHoverUX?.();
  ctx?.hover?.clear?.();
  clearHoverLabel();
}

function teardown() {
  safe(() => ctx?.picking?.teardown?.());
  safe(() => ctx?.disposeLabels?.());
  safe(() => ctx?.visibility?.clearHoverUX?.());
  safe(() => ctx?.hover?.dispose?.());

  setLabelsEnabled(false);
  clearHoverLabel();

  ctx = null;
  resetSidebar();
}

function pulseEmergencyLight() {

  emergencyLightEnabled = !emergencyLightEnabled;

  if (!ctx?.root) return;

  // GASI
  if (!emergencyLightEnabled) {

    ctx.root.traverse((obj) => {

      const light =
        obj.getObjectByName("1033_alarm_point_light");

      if (light) {
        gsap?.killTweensOf(light);
        gsap?.killTweensOf(light.position);

        light.intensity = 0;
      }

      if (!obj.isMesh || !obj.material)
        return;

      const mats = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];

      mats.forEach((mat) => {

        gsap?.killTweensOf(mat);

        mat.emissiveIntensity = 0;
        mat.needsUpdate = true;

      });

    });

    return;
  }

  const configs = {
    "1033": { color: 0xff0000, intensity: 10, pulse: true },
    "1042": { color: 0xff0000, intensity: 5, pulse: false },
    "1043": { color: 0xff0000, intensity: 3.8, pulse: false },
    "1044": { color: 0xff0000, intensity: 2.6, pulse: false },
    "1045": { color: 0xff0000, intensity: 1.5, pulse: false },
    "1041": { color: 0xffcc00, intensity: 5, pulse: true }
  };

  ctx.root.traverse((obj) => {
    const name = String(obj.name || "");
    const id = Object.keys(configs).find(key => name.includes(key));
    if (!id) return;

    const cfg = configs[id];

    let alarmLight = null;

    if (id === "1033") {
      alarmLight = obj.getObjectByName("1033_alarm_point_light");

    if (!alarmLight) {
      alarmLight = new THREE.PointLight(
        0xff1a1a,
        0,
        0.15,
        1.6
      );

      alarmLight.name = "1033_alarm_point_light";
      alarmLight.position.set(0,0,0);

      obj.add(alarmLight);

      let rotatingPart = null;

      obj.traverse((part)=>{

        const partName =
          String(part.name || "")
          .toLowerCase();

        if(
          partName.includes("bulb") ||
          partName.includes("lamp") ||
          partName.includes("light") ||
          partName.includes("beacon")
        ){
          rotatingPart = part;
        }

      });

      if(rotatingPart){

        gsap?.killTweensOf(
          rotatingPart.rotation
        );

        gsap?.to(
          rotatingPart.rotation,{
            y:
            rotatingPart.rotation.y +
            Math.PI,

            duration:0.8,
            repeat:-1,
            ease:"none"
          }
        );
      }
    }

      gsap?.killTweensOf(alarmLight);
      gsap?.killTweensOf(alarmLight.position);

      gsap?.to(alarmLight, {
        intensity: 0.65,
        duration: 0.08,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut"
      });

      gsap?.to(alarmLight.position, {
        x: 0.08,
        z: 0.06,
        duration: 0.32,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    obj.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];

      mats.forEach((mat) => {
        if (!mat) return;

        mat.emissive = new THREE.Color(cfg.color);
        mat.emissiveIntensity = 0;
        mat.needsUpdate = true;

        if (!gsap) return;

        gsap.killTweensOf(mat);

        if (id === "1033") {
          gsap.timeline({ repeat: -1 })
          .to(mat, { emissiveIntensity: 1.4, duration: 0.10, ease: "sine.out" })
          .to(mat, { emissiveIntensity: 0.65, duration: 0.18, ease: "sine.inOut" })
          .to(mat, { emissiveIntensity: 0.08, duration: 0.32, ease: "sine.inOut" })
          .to(mat, { emissiveIntensity: 1.05, duration: 0.14, ease: "sine.out" })
          .to(mat, { emissiveIntensity: 0.12, duration: 0.34, ease: "sine.inOut" });

          return;
        }

        if (cfg.pulse) {
          gsap.to(mat, {
            emissiveIntensity: cfg.intensity,
            duration: 0.15,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut"
          });
        } else {
          gsap.to(mat, {
            emissiveIntensity: cfg.intensity,
            duration: 0.6,
            ease: "power2.out"
          });
        }
      });
    });
  });
}

/* ======================================================================
   LIFECYCLE
====================================================================== */

export async function afterLoad(root, _THREE, extra = {}) {
  // cleanup any previous load
  teardown();

  ctx = {
    root,
    camera: extra.camera || null,
    controls: extra.controls || null,
    container: extra.container || null,
    renderer: extra.renderer || null,

    modelTree: null,
    visibility: null,
    picking: null,
    resetCtl: null,
    disposeLabels: null,
    sidebarApi: null,
    hover: null,
  };

  // Build tree
  const treePack = buildEngineTree(ctx.root);
  ctx.modelTree = treePack.modelTree;

  // Explode prep
  prepareExplode(ctx.root, { getNiceName });

  // Visibility
  ctx.visibility = createVisibilityController({
    root: ctx.root,
    labelItems,
  });

  // Labels
  ctx.disposeLabels = setupLabels(ctx.root, {
    cameraRef: ctx.camera,
    containerRef: ctx.container,
    getNiceName,
  });

  setLabelsEnabled(true);
  clearHoverLabel();

  // Hover highlighter controller (deps bound once)
  ctx.hover = createHoverHighlighter({
    root: ctx.root,
    getNiceName,
    setHoverLabel,
    clearHoverLabel,
  });

  // Reset controller
  ctx.resetCtl = createResetController({
    getCamera: () => ctx.camera,
    getControls: () => ctx.controls,
    getVisibility: () => ctx.visibility,

    clearHover: () => ctx.hover?.clear?.(),
    isFocusMode,
    exitFocusMode,

    state,
    stopAnim,
    implodeMotor,
    implodeSystem,

    gsap,

    onReset: () => {
      activeMainSystemRoot = null;
      systemExploded = false;

      state.t = 0;
      state.isExploded = false;
      state.targetExploded = false;
      state.playing = false;

      ctx?.visibility?.showAllParts?.();
      ctx?.visibility?.clearHoverUX?.();
      ctx?.hover?.clear?.();

      setLabelsEnabled(true);
      clearHoverLabel();

      ctx?.sidebarApi?.resetUI?.();

      window.dispatchEvent(new CustomEvent("engine:system-cleared"));
      window.dispatchEvent(new CustomEvent("engine:explode-reset"));

      applyUXPolicy();
    },
  });

  // Focus controller init
  initFocus({
    camera: ctx.camera,
    controls: ctx.controls,
    root: ctx.root,
    labelItems,
    refreshVisibility: () => ctx.visibility.refreshVisibility(),
    visibility: ctx.visibility,
    onFocus: ({ mesh, label }) => ctx.sidebarApi?.setActiveByMesh?.(mesh, label),
    onExitFocus: () => {
      // Ako si ušao u info panel iz odabranog sustava,
      // vrati se nazad u taj sustav, a NE na globalni početak.
      if (activeMainSystemRoot) {
        const meshes = collectMeshesFromObject(activeMainSystemRoot);

        ctx?.visibility?.showOnlyMeshes?.(
          new Set(meshes),
          `system:${activeMainSystemRoot.uuid}`
        );

        //ctx?.sidebarApi?.resetUI?.();

        window.dispatchEvent(
          new CustomEvent("engine:system-selected", {
            detail: {
              exploded: systemExploded,
            },
          })
        );

        applyUXPolicy();
        return;
      }

      // Ako nema aktivnog sustava, tek onda se vrati globalno.
      ctx?.visibility?.showAllParts?.();
      //ctx?.sidebarApi?.resetUI?.();

      window.dispatchEvent(new CustomEvent("engine:system-cleared"));

      applyUXPolicy();
    },
  });

  // Picking
  ctx.picking = createPicking({
    renderer: ctx.renderer,
    camera: ctx.camera,
    root: ctx.root,
    getMeshes: () => {
      if (activeMainSystemRoot) {
        return collectMeshesFromObject(activeMainSystemRoot);
      }

      return ctx.visibility.collectAllMeshes();
    },
    canPick: () => true,

    onHoverMesh: (m) => {
      if (!m) {
        ctx.visibility?.clearHoverUX?.();
        ctx.hover?.clear?.();
        clearHoverLabel();
        return;
      }

      if (activeMainSystemRoot) {
        if (!isInsideObject(m, activeMainSystemRoot)) {
          ctx.visibility?.clearHoverUX?.();
          ctx.hover?.clear?.();
          clearHoverLabel();
          return;
        }

        ctx.hover.set(m);
        ctx.visibility?.applyHoverUX?.(m);
        return;
      }

      const systemRoot = findMainSystemRoot(m, ctx.root);

      ctx.hover.set(systemRoot);
      ctx.visibility?.applyHoverUX?.(systemRoot);
    },

    onPickMesh: (m) => {
      if (!m) return;

      ctx.visibility?.clearHoverUX?.();
      ctx.hover?.clear?.();
      clearHoverLabel();

      // 1) Prvi klik: odaberi glavni sustav, ali NE otvaraj info panel
      if (!activeMainSystemRoot) {
        const systemRoot = findMainSystemRoot(m, ctx.root);
        activeMainSystemRoot = systemRoot;
        window.dispatchEvent(new CustomEvent("engine:system-selected"));
        systemExploded = false;

        prepareSystemExplode(systemRoot, {
          config: SYSTEM_EXPLODE_CONFIG,
          getNiceName,
        });

        const meshes = collectMeshesFromObject(systemRoot);

        ctx.visibility.showOnlyMeshes(
          new Set(meshes),
          `system:${systemRoot.uuid}`
        );

        focusCameraOnObject(systemRoot);

        applyUXPolicy();
        return;
      }

      // 2) Ako si već u sustavu, klik na podsustav otvara info panel
      if (!isInsideObject(m, activeMainSystemRoot)) return;

      setLabelsEnabled(false);
      clearHoverLabel();

      focusOnPart(m, getNiceName(m));
      applyUXPolicy();
    },
  });

  ctx.picking.setup();

  // Sidebar (senior ctx facade)
  ctx.sidebarApi = initComponentSidebar({
    camera: ctx.camera,
    controls: ctx.controls,

    tree: {
      modelTree: ctx.modelTree,
      prettyFromNodeName,
      getNiceName,
      collectMeshesInSubtree,
    },
    visibility: {
      showOnlyMeshes: (set, ownerPath) => ctx.visibility.showOnlyMeshes(set, ownerPath),
      showAllParts: () => ctx.visibility.showAllParts(),
      isMeshHidden: (m) => ctx.visibility.isMeshHidden(m),
      toggleMeshHidden: (m) => ctx.visibility.toggleMeshHidden(m),
      setMeshesHidden: (arr, hidden) => ctx.visibility.setMeshesHidden(arr, hidden),
      refreshVisibility: () => ctx.visibility.refreshVisibility(),
      getActiveFilterOwnerPath: () => ctx.visibility.getActiveFilterOwnerPath(),
      getVisibility: () => ctx.visibility,
    },
    focus: { focusOnPart, isFocusMode, exitFocusMode },
    hover: {
      setHoverMesh: (m) => ctx.hover.set(m),
      clearHover: () => ctx.hover.clear(),
    },
    ui: {
      helpUrl: '/docs/help/3D SMECO PLATFORM.pdf',

      onEmergencyLight: () => {
        pulseEmergencyLight();
      },

      onReset: async () => {

        // Ako je aktivan Explode Assemble
        if (systemExploded) {
          try {
            stopAnim?.();

            await implodeSystem();

            systemExploded = false;

          } catch (e) {
            console.warn("System implode reset error:", e);
          }
        }

        // Ako je aktivan glavni explode
        if (state?.isExploded) {
          try {
            stopAnim?.();

            await implodeMotor();

          } catch (e) {
            console.warn("Motor implode reset error:", e);
          }
        }

        // ostatak reseta
        await ctx.resetCtl?.resetEverything?.();
      },
    },
  });

  /* =========================================================
    SIDEBAR -> SYSTEM EXPLODE MODE
  ========================================================= */

window.addEventListener("engine:sidebar-selected", (e) => {
  const label = e.detail?.label || "";
  if (!label || !ctx?.root) return;

  const normalize = (v = "") =>
    String(v)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const ALIAS = {
    "12serviceairreceiver": "12serviceairreciever",
    "6transmission": "6transmition",
    "5mainengineno1": "5mainengineno1",
    "5mainengineno1": "5mainengineno1",
  };

  const target = ALIAS[normalize(label)] || normalize(label);

  let foundRoot = null;

  ctx.root.traverse((obj) => {
    if (foundRoot) return;

    const directNames = [
      obj.name,
      obj.userData?.displayName,
    ].filter(Boolean);

    for (const name of directNames) {
      const current = normalize(name);
      const aliasedCurrent = ALIAS[current] || current;

      if (aliasedCurrent === target) {
        foundRoot = obj;
        return;
      }
    }
  });

  if (!foundRoot) {
    console.warn("[SIDEBAR] System not found:", label);
    return;
  }

  activeMainSystemRoot = foundRoot;
  systemExploded = false;

  console.log("[SIDEBAR] Selected system root:", foundRoot.name);

  prepareSystemExplode(foundRoot, {
    config: SYSTEM_EXPLODE_CONFIG,
    getNiceName,
  });

  const meshes = collectMeshesFromObject(foundRoot);

  ctx.visibility.showOnlyMeshes(
    new Set(meshes),
    `system:${foundRoot.uuid}`
  );

  focusCameraOnObject(foundRoot);

  window.dispatchEvent(new CustomEvent("engine:system-selected"));

  applyUXPolicy();
});
  
  // Initial state
  stopAnim();
  state.t = 0;
  state.isExploded = false;

  ctx.visibility.showAllParts();
  ctx.visibility?.clearHoverUX?.();
  ctx.hover?.clear?.();

  ctx.sidebarApi?.resetUI?.();
  applyUXPolicy();

  ctx.resetCtl?.scheduleSaveHomeView?.();

  // disposer for core.js
  return () => teardown();
}

export {
  explodeMotor,
  implodeMotor,
  toggleExplode,

  explodeSystem,
  implodeSystem,
  toggleSystemExplode,
};

