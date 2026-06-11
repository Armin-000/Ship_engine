/* =========================================================
   CORE VIEWER (Three.js Runtime)
   Responsibilities:
   - Create and own the Three.js runtime: scene, renderer, camera, controls
   - Start the render loop
   - Manage model loading lifecycle (load / normalize / dispose)
   - Expose a small public API used by index.js and model modules
========================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

/* =========================================================
   UTILITIES
   disposeObject3D(obj):
   - Releases GPU resources (geometries, textures, materials)
   - Prevents memory leaks when swapping models
========================================================= */

function disposeObject3D(obj) {
  obj?.traverse((child) => {
    if (!child.isMesh) return;

    child.geometry?.dispose?.();

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((m) => {
      if (!m) return;

      ['map', 'normalMap', 'metalnessMap', 'roughnessMap', 'aoMap', 'emissiveMap', 'alphaMap'].forEach(
        (key) => m[key]?.dispose?.()
      );

      m.dispose?.();
    });
  });
}

/* =========================================================
   FACTORY: createViewer(containerEl, opts)
   Entry point from index.js.

   Creates:
   - scene / renderer / camera / controls
   - lighting & environment
   - loaders + model lifecycle
   - render loop
   Returns:
   - viewer API object used by index.js and model modules
========================================================= */

export function createViewer(containerEl, opts = {}) {
  /* =========================================================
     OPTIONS
     - config coming from index.js (entry point)
  ========================================================= */

  const {
    disableWheelZoom = true,
    disablePinchZoom = false,
    zoomToCursor = false,
    initialMode = 'dark',
  } = opts;

  /* =========================================================
     SCENE
     - root scene container for everything rendered
  ========================================================= */

  const scene = new THREE.Scene();

  /* =========================================================
     RENDERER
     - WebGL context + canvas element
     - renderer.domElement is appended to containerEl
  ========================================================= */

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  renderer.setClearColor(0x000000, 0); // transparent background
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.physicallyCorrectLights = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  containerEl.appendChild(renderer.domElement);

  // Canvas is initially hidden; index.js may also control this for preloader UX.
  Object.assign(renderer.domElement.style, {
    visibility: 'hidden',
    opacity: '0',
    transition: 'opacity .35s ease',
  });

  /* =========================================================
     CAMERA
     - Perspective camera used by OrbitControls + framing logic
  ========================================================= */

  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1e9);
  camera.position.set(2.8, 2.2, 3.8);

  // Optional: exposed for debugging or downstream modules
  scene.userData.camera = camera;
  scene.userData.renderer = renderer;

  /* =========================================================
     LIGHTING
     - basic lights; intensities are later adjusted by setMode()
  ========================================================= */

  const hemi = new THREE.HemisphereLight(
    0xffffff,
    0x050505,
    0.08
  );

  scene.add(hemi);


  const keyLight = new THREE.DirectionalLight(
    0xffffff,
    4.0
  );

  keyLight.position.set(6, 8, 7);

  keyLight.castShadow = true;

  keyLight.shadow.mapSize.set(
    2048,
    2048
  );

  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 80;

  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;

  keyLight.shadow.bias = -0.00025;

  scene.add(keyLight);


  const rimLight = new THREE.DirectionalLight(
    0xffffff,
    1.6
  );

  rimLight.position.set(
    -5,
    5,
    -7
  );

  rimLight.castShadow = true;

  scene.add(rimLight);


  const topLight = new THREE.SpotLight(
    0xffffff,
    2.8,
    35,
    Math.PI / 5,
    0.45,
    1.2
  );

  topLight.position.set(
    0,
    8,
    4
  );

  topLight.target.position.set(
    0,
    0.8,
    0
  );

  topLight.castShadow = true;

  topLight.shadow.mapSize.set(
    2048,
    2048
  );

  topLight.shadow.bias = -0.0002;

  scene.add(topLight);
  scene.add(topLight.target);


  scene.fog = new THREE.Fog(
    0x000000,
    18,
    70
  );

  /* =========================================================
     ORBIT CONTROLS (camera interaction)
     - rotation/pan/zoom behavior
     - options allow disabling wheel zoom / pinch zoom
  ========================================================= */

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1, 0);
  controls.zoomToCursor = zoomToCursor;

  if (disableWheelZoom) {
    controls.enableZoom = false;
    controls.zoomSpeed = 0;
    controls.zoomToCursor = false;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: null,
      RIGHT: THREE.MOUSE.PAN,
    };
  }

  if (disablePinchZoom) {
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.PAN };
    renderer.domElement.style.touchAction = 'pan-x pan-y';
  }

  /* =========================================================
     LOADING MANAGER
     - shared manager for HDR + GLTF + DRACO
     - readyOnce resolves when manager finishes (or errors)
  ========================================================= */

  const loadingManager = new THREE.LoadingManager();
  let resolveReady;
  const readyOnce = new Promise((res) => (resolveReady = res));
  loadingManager.onLoad = () => resolveReady?.();
  loadingManager.onError = () => resolveReady?.();

  /* =========================================================
     SCENE ROOT GROUP
     - 'root' contains the currently loaded model
     - allows clean swap/dispose of the entire model subtree
  ========================================================= */

  const root = new THREE.Group();
  scene.add(root);

  let current = null;         // currently loaded model root
  let currentDispose = null;  // optional cleanup function returned by mod.afterLoad()

  /* =========================================================
     MATERIAL REFRESH (used when switching theme)
     - forces materials to update under new lighting/environment
  ========================================================= */

  function refreshMaterials() {
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m) m.needsUpdate = true;
      });
    });
  }

  /* =========================================================
     THEME / MODE (light | dark)
     - adjusts light intensities
     - keeps renderer transparent; scene background stays null
  ========================================================= */

  let currentMode = initialMode;

  function setMode(mode) {
    currentMode = mode;

    scene.background = null;

    if (mode === 'light') {

      hemi.intensity = 0.15;

      keyLight.intensity = 2.8;
      rimLight.intensity = 1.2;
      topLight.intensity = 1.4;

    } else {

      hemi.intensity = 0.02;

      keyLight.intensity = 3.6;
      rimLight.intensity = 1.2;
      topLight.intensity = 2.0;

      renderer.toneMappingExposure = 0.92;
    }

    refreshMaterials();
  }
  /* =========================================================
    ENVIRONMENT DISABLED
    HDRI disabled because RGBELoader/PMREM causes runtime error.
    Viewer will still work with normal lights.
  ========================================================= */

  scene.environment = null;
  setMode(currentMode);

  /* =========================================================
     MODEL LOADERS (GLTF + DRACO)
     - GLTFLoader loads .glb
     - DRACOLoader decodes Draco-compressed geometry inside glb
  ========================================================= */

  const loader = new GLTFLoader(loadingManager);
  const draco = new DRACOLoader(loadingManager);
  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
  loader.setDRACOLoader(draco);

  /* =========================================================
     TICK SUBSCRIPTIONS
     - allows other modules to register per-frame callbacks
     - used for UI labels, animations, etc.
  ========================================================= */

  const tickHandlers = new Set();

  function onTick(fn) {
    if (typeof fn !== 'function') return () => {};
    tickHandlers.add(fn);
    return () => tickHandlers.delete(fn);
  }

  /* =========================================================
     RESIZE HANDLER
     - keeps camera aspect + renderer size in sync with container
     - adjusts pixel ratio for performance on smaller screens
  ========================================================= */

  function resize() {
    const w = containerEl.clientWidth || 1;
    const h = containerEl.clientHeight || 1;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    let dpr = window.devicePixelRatio || 1;
    if (w < 600) dpr = Math.min(dpr, 1.4);
    else if (w < 900) dpr = Math.min(dpr, 1.8);
    else dpr = Math.min(dpr, 2);

    renderer.setPixelRatio(dpr);
  }

  /* =========================================================
     CAMERA FRAMING (fit-to-view)
     - computes a camera position + target that fits the object
     - uses CAMERA_DIR by default; supports per-model viewPreset overrides
  ========================================================= */

  function getFitPose(obj, preset = {}) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;

    let distance = (maxDim / 2) / Math.tan(fov / 2);

    const baseMul = preset.distanceMul ?? 1.35;

    const w = window.innerWidth || 0;
    let screenMul = 1.0;

    if (w < 600) screenMul = 1.40;
    else if (w >= 2560) screenMul = 1.55;
    else if (w >= 1920) screenMul = 1.35;
    else if (w >= 1366) screenMul = 1.15;

    distance *= baseMul * screenMul;

    const dirVec = (preset.dir || new THREE.Vector3(0, 0.15, 7)).clone();
    const camPos = center.clone().add(dirVec.multiplyScalar(distance));
    if (preset.offset) camPos.add(preset.offset);

    const target = center.clone();
    if (preset.targetOffset) target.add(preset.targetOffset);

    return { camPos, target };
  }

  /* =========================================================
     MODEL LIFECYCLE (the "bridge" to model logic)
     loadModelModule(mod):
     - dispose old model
     - load GLB from mod.url
     - normalize scale & position
     - frame camera to homePose
     - call mod.afterLoad(current, THREE, extra)
       -> where model-specific controllers are initialized
  ========================================================= */

  async function loadModelModule(mod) {
    // allow model module to clean up its own listeners/tickers etc.
    if (typeof currentDispose === 'function') {
      try { await currentDispose(); } catch (_) {}
      currentDispose = null;
    }

    // remove/dispose the previous model subtree
    if (current) {
      root.remove(current);
      disposeObject3D(current);
      current = null;
    }

    if (!mod?.url) return;

    // load GLB/GLTF
    const gltf = await loader.loadAsync(mod.url);
    current = gltf.scene || gltf.scenes?.[0];
    root.add(current);

    current.traverse((obj) => {

      if (!obj.isMesh) return;

      obj.castShadow = true;
      obj.receiveShadow = true;

      const materials =
        Array.isArray(obj.material)
          ? obj.material
          : [obj.material];

      materials.forEach((mat) => {

        if (!mat) return;

        // smanji odsjaj metala
        mat.envMapIntensity = 0.35;

        // smanji "metalni" izgled
        if ("metalness" in mat)
          mat.metalness *= 0.7;

        // napravi površinu malo grubljom
        if ("roughness" in mat)
          mat.roughness = Math.min(
            mat.roughness + 0.25,
            1
          );

        mat.needsUpdate = true;

      });

    });

    // normalize: scale to unit size and place on "ground"
    const box = new THREE.Box3().setFromObject(current);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const minY = box.min.y;
    const scale = 1.0 / Math.max(size.x, size.y, size.z);

    current.scale.setScalar(scale);
    current.position.set(-center.x, -minY, -center.z);
    root.updateMatrixWorld(true);

    // frame camera to home pose
    const homePose = getFitPose(current, mod.viewPreset || {});
    camera.position.copy(homePose.camPos);
    controls.target.copy(homePose.target);
    controls.update();

    // trigger model-specific initialization (engine layer)
    if (typeof mod.afterLoad === 'function') {
      const extra = {
        camera,
        controls,
        renderer,
        container: containerEl,
        homePose,
        setMode,
        getMode: () => currentMode,
      };

      const maybeDispose = await mod.afterLoad(current, THREE, extra);
      if (typeof maybeDispose === 'function') currentDispose = maybeDispose;
    }
  }

  /* =========================================================
     RENDER LOOP
     - owned by core
     - calls OrbitControls.update()
     - runs registered tick handlers
     - renders scene every frame
  ========================================================= */

  let lastT = performance.now();

  function animate(t) {
    requestAnimationFrame(animate);
    controls.update();

    const dt = (t - lastT) / 1000;
    lastT = t;

    tickHandlers.forEach((fn) => {
      try { fn(dt); } catch (_) {}
    });

    renderer.render(scene, camera);
  }

  /* =========================================================
     STARTUP SEQUENCE
     - start render loop
     - set initial size
     - listen to resize events
     - apply initial theme
  ========================================================= */

  animate(performance.now());
  resize();
  window.addEventListener('resize', resize);

  setMode(currentMode);

  /* =========================================================
     PUBLIC VIEWER API (used by index.js + model modules)
  ========================================================= */

  return {
    scene,
    camera,
    renderer,
    controls,
    loadModelModule,
    readyOnce,
    onTick,
    getCurrentRoot: () => current,
    setMode,
    getMode: () => currentMode,
  };
}
