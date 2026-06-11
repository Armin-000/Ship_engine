/* ======================================================================
   ENGINE RESET
====================================================================== */

export function createResetController({
  getCamera,
  getControls,
  getVisibility,
  clearHover,
  isFocusMode,
  exitFocusMode,
  state,
  stopAnim,
  implodeMotor,
  implodeSystem,
  gsap = null,
  onReset = null,
}) {
  const homeCamPos = { x: 0, y: 0, z: 0 };
  const homeTarget = { x: 0, y: 0, z: 0 };
  let homeSaved = false;

  function saveHomeView() {
    if (homeSaved) return;

    const camera = getCamera?.();
    const controls = getControls?.();
    if (!camera || !controls) return;

    homeCamPos.x = camera.position.x;
    homeCamPos.y = camera.position.y;
    homeCamPos.z = camera.position.z;

    homeTarget.x = controls.target.x;
    homeTarget.y = controls.target.y;
    homeTarget.z = controls.target.z;

    controls?.saveState?.();

    homeSaved = true;
  }

  function scheduleSaveHomeView() {
    homeSaved = false;

    const lastCam = { x: 0, y: 0, z: 0 };
    const lastTarget = { x: 0, y: 0, z: 0 };

    let stableFrames = 0;
    let frames = 0;

    const MAX_FRAMES = 90;
    const STABLE_NEED = 8;
    const EPS = 0.0005;

    let token = (scheduleSaveHomeView._token = (scheduleSaveHomeView._token || 0) + 1);

    function dist(ax, ay, az, bx, by, bz) {
      const dx = ax - bx;
      const dy = ay - by;
      const dz = az - bz;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function tick() {
      if (token !== scheduleSaveHomeView._token) return;

      frames++;

      const camera = getCamera?.();
      const controls = getControls?.();
      if (!camera || !controls) return;

      const cam = camera.position;
      const tgt = controls.target;

      const camDelta = dist(cam.x, cam.y, cam.z, lastCam.x, lastCam.y, lastCam.z);
      const tgtDelta = dist(tgt.x, tgt.y, tgt.z, lastTarget.x, lastTarget.y, lastTarget.z);

      lastCam.x = cam.x;
      lastCam.y = cam.y;
      lastCam.z = cam.z;

      lastTarget.x = tgt.x;
      lastTarget.y = tgt.y;
      lastTarget.z = tgt.z;

      if (camDelta < EPS && tgtDelta < EPS) stableFrames++;
      else stableFrames = 0;

      if (stableFrames >= STABLE_NEED || frames >= MAX_FRAMES) {
        saveHomeView();
        return;
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  async function resetEverything() {
    clearHover?.();

    try {
      if (isFocusMode?.()) exitFocusMode?.();
    } catch (_) {}

    try {
      stopAnim?.();

      if (typeof implodeSystem === 'function') {
        await implodeSystem();
      }

      if (typeof implodeMotor === 'function') {
        await implodeMotor();
      }

      if (state) {
        state.t = 0;
        state.isExploded = false;
        state.targetExploded = false;
        state.playing = false;
      }
    } catch (e) {
      console.warn("Reset implode error:", e);
    }

    const vis = getVisibility?.();
    try { vis?.clearHidden?.(); } catch (_) {}
    try { vis?.clearIsolate?.(); } catch (_) {}
    try { vis?.showAllParts?.(); } catch (_) {}

    const camera = getCamera?.();
    const controls = getControls?.();

    if (camera && controls && homeSaved) {
      if (gsap) {
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controls.target);

        gsap.to(camera.position, {
          duration: 0.9,
          x: homeCamPos.x,
          y: homeCamPos.y,
          z: homeCamPos.z,
          ease: 'power3.inOut',
          onUpdate: () => controls.update(),
        });

        gsap.to(controls.target, {
          duration: 0.9,
          x: homeTarget.x,
          y: homeTarget.y,
          z: homeTarget.z,
          ease: 'power3.inOut',
          onUpdate: () => controls.update(),
        });
      } else {
        camera.position.set(homeCamPos.x, homeCamPos.y, homeCamPos.z);
        controls.target.set(homeTarget.x, homeTarget.y, homeTarget.z);
        controls.update?.();
      }
    } else {
      controls?.reset?.();
      controls?.update?.();
    }

    try { onReset?.(); } catch (_) {}
  }

  return {
    saveHomeView,
    scheduleSaveHomeView,
    resetEverything,
  };
}
