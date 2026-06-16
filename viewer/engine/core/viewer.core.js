import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

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

export function createViewer(containerEl, opts = {}) {
  const {
    disableWheelZoom = true,
    disablePinchZoom = false,
    zoomToCursor = false,
    initialMode = 'dark',
  } = opts;

  const scene = new THREE.Scene();

  const lightGrid = new THREE.GridHelper(
    16,
    160,
    0x66707a,
    0x9aa3ad
  );

  lightGrid.material.transparent = true;
  lightGrid.material.opacity = 0.42;
  lightGrid.visible = initialMode === "light";

  scene.add(lightGrid);

  const darkGrid = new THREE.GridHelper(
    16,
    160,
    0xffffff, // glavne linije
    0x808080  // pomoćne linije
  );

  darkGrid.material.transparent = true;
  darkGrid.material.opacity = 0.25;
  darkGrid.visible = initialMode === "dark";

  scene.add(darkGrid);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.physicallyCorrectLights = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  renderer.shadowMap.enabled = false;

  containerEl.appendChild(renderer.domElement);

  Object.assign(renderer.domElement.style, {
    visibility: 'hidden',
    opacity: '0',
    transition: 'opacity .35s ease',
  });

  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1e9);
  camera.position.set(2.8, 2.2, 3.8);

  scene.userData.camera = camera;
  scene.userData.renderer = renderer;

  const hemi = new THREE.HemisphereLight(0xffffff, 0xbfc7d1, 0.35);
  scene.add(hemi);

  const ambientFill = new THREE.AmbientLight(0xffffff, 0.20);
  scene.add(ambientFill);

  const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
  keyLight.position.set(6, 8, 7);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
  rimLight.position.set(-5, 5, -7);
  scene.add(rimLight);

  const topLight = new THREE.SpotLight(
    0xffffff,
    2.8,
    35,
    Math.PI / 5,
    0.45,
    1.2
  );

  topLight.position.set(0, 8, 4);
  topLight.target.position.set(0, 0.8, 0);

  scene.add(topLight);
  scene.add(topLight.target);

  scene.fog = null;

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
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.PAN,
    };

    renderer.domElement.style.touchAction = 'pan-x pan-y';
  }

  const loadingManager = new THREE.LoadingManager();

  let resolveReady;
  const readyOnce = new Promise((res) => {
    resolveReady = res;
  });

  loadingManager.onLoad = () => resolveReady?.();
  loadingManager.onError = () => resolveReady?.();

  const root = new THREE.Group();
  scene.add(root);

  let current = null;
  let currentDispose = null;

  function refreshMaterials() {
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;

      const mats = Array.isArray(o.material) ? o.material : [o.material];

      mats.forEach((m) => {
        if (m) m.needsUpdate = true;
      });
    });
  }

  let currentMode = initialMode;

  function setMode(mode) {
    currentMode = mode;

    scene.background = null;

    lightGrid.visible = mode === "light";
    darkGrid.visible = mode === "dark";

    if (mode === 'light') {
      hemi.intensity = 0.25;
      ambientFill.intensity = 0.15;

      keyLight.intensity = 2.8;
      rimLight.intensity = 1.2;
      topLight.intensity = 1.4;

      renderer.toneMappingExposure = 1.0;
    } else {
      hemi.intensity = 0.35;
      ambientFill.intensity = 0.20;

      keyLight.intensity = 3.4;
      rimLight.intensity = 1.5;
      topLight.intensity = 2.0;

      renderer.toneMappingExposure = 0.95;
    }

    refreshMaterials();
  }

  scene.environment = null;
  setMode(currentMode);

  const loader = new GLTFLoader(loadingManager);
  const draco = new DRACOLoader(loadingManager);

  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
  loader.setDRACOLoader(draco);

  const tickHandlers = new Set();

  function onTick(fn) {
    if (typeof fn !== 'function') return () => {};

    tickHandlers.add(fn);

    return () => tickHandlers.delete(fn);
  }

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

    return {
      camPos,
      target,
    };
  }

  async function loadModelModule(mod) {
    if (typeof currentDispose === 'function') {
      try {
        await currentDispose();
      } catch (_) {}

      currentDispose = null;
    }

    if (current) {
      root.remove(current);
      disposeObject3D(current);
      current = null;
    }

    if (!mod?.url) return;

    const gltf = await loader.loadAsync(mod.url);

    current = gltf.scene || gltf.scenes?.[0];

    root.add(current);

    current.traverse((obj) => {
      if (!obj.isMesh) return;

      const materials = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];

      materials.forEach((mat) => {
        if (!mat) return;

        mat.envMapIntensity = 0.35;

        if ('metalness' in mat) {
          mat.metalness *= 0.7;
        }

        if ('roughness' in mat) {
          mat.roughness = Math.min(mat.roughness + 0.25, 1);
        }

        mat.needsUpdate = true;
      });
    });

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

    const fittedBox = new THREE.Box3().setFromObject(current);
    const fittedCenter = new THREE.Vector3();

    fittedBox.getCenter(fittedCenter);

    lightGrid.position.set(
      fittedCenter.x,
      fittedBox.min.y - 0.05,
      fittedCenter.z
    );

    darkGrid.position.set(
      fittedCenter.x,
      fittedBox.min.y - 0.05,
      fittedCenter.z
    );

    lightGrid.visible = currentMode === "light";
    darkGrid.visible = currentMode === "dark";

    const homePose = getFitPose(current, mod.viewPreset || {});

    camera.position.copy(homePose.camPos);
    controls.target.copy(homePose.target);
    controls.update();

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

      if (typeof maybeDispose === 'function') {
        currentDispose = maybeDispose;
      }
    }
  }

  let lastT = performance.now();

  function animate(t) {
    requestAnimationFrame(animate);

    controls.update();

    const dt = (t - lastT) / 1000;
    lastT = t;

    tickHandlers.forEach((fn) => {
      try {
        fn(dt);
      } catch (_) {}
    });

    renderer.render(scene, camera);
  }

  animate(performance.now());
  resize();

  window.addEventListener('resize', resize);

  setMode(currentMode);

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