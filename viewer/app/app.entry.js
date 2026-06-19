import * as THREE from 'three';
import { createViewer } from '../engine/core/viewer.core.js';
import { initPreloader, showPreloader, hidePreloader } from '../preloader.js';
import { login, validateToken } from '../auth.js';

const gsap = window.gsap || null;

/* =========================================================
   DOM
========================================================= */

const viewerWrap = document.getElementById('viewer');
const container = document.getElementById('three');
const loadingEl = document.getElementById('loadingOverlay');

const select = document.getElementById('modelPicker');
const seg = document.getElementById('modelSeg');

const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const btnPrev = document.getElementById('modelPrev');
const btnNext = document.getElementById('modelNext');

const explodeBtn = document.getElementById('explodeBtn');

const themeToggle = document.getElementById('themeToggle');
const themeMenu = document.getElementById('themeMenu');
const themeDropdown = document.getElementById('themeDropdown');

const rotateMenu = document.getElementById('rotateMenu');
const rotateToggle = document.getElementById('rotateToggle');
const rotateDropdown = document.getElementById('rotateDropdown');

const rotButtons = document.querySelectorAll('.rot-btn');

/* =========================================================
   PRELOADER
========================================================= */

if (loadingEl) {
  await initPreloader({
    overlayId: 'loadingOverlay',
    fragmentUrl: new URL('../preloader.html', import.meta.url),
  });
}

let loadToken = 0;
let loadingNow = false;

function setLoading(isLoading) {
  if (isLoading) showPreloader();
  else hidePreloader();
  viewerWrap?.setAttribute('data-loading', isLoading ? '1' : '0');
}

/* =========================================================
   VIEWER
========================================================= */

const viewer = createViewer(container, {
  disableWheelZoom: false,
  disablePinchZoom: false,
  zoomToCursor: true,
});

const canvasEl = viewer.renderer.domElement;
Object.assign(canvasEl.style, {
  visibility: 'hidden',
  opacity: '0',
  transition: 'opacity .35s ease',
});

/* =========================================================
   ROTATION SNAP CAMERA
========================================================= */

function rotateCamera(direction) {
  if (!viewer?.controls || !viewer?.camera) return;

  const controls = viewer.controls;
  const camera = viewer.camera;
  const target = controls.target.clone();

  const offset = camera.position.clone().sub(target);
  const spherical = new THREE.Spherical().setFromVector3(offset);

  const eps = 0.05;
  const dist = spherical.radius;

  const snap90 = (theta) => {
    const step = Math.PI / 2;
    return Math.round(theta / step) * step;
  };

  let theta = spherical.theta;
  let phi = spherical.phi;

  if (direction === 'left' || direction === 'right') {
    const base = snap90(theta);
    theta = base + (direction === 'left' ? Math.PI / 2 : -Math.PI / 2);
    phi = Math.PI / 2;
  }

  if (direction === 'down') {
    phi = eps;
    theta = snap90(theta);
  }

  if (direction === 'up') {
    phi = Math.PI - eps;
    theta = snap90(theta);
  }

  const nextOffset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(dist, phi, theta));
  const nextPos = target.clone().add(nextOffset);

  if (gsap) {
    gsap.to(camera.position, {
      duration: 0.6,
      x: nextPos.x,
      y: nextPos.y,
      z: nextPos.z,
      ease: 'power2.inOut',
      onUpdate: () => controls.update(),
    });
  } else {
    camera.position.copy(nextPos);
    controls.update();
  }
}

rotButtons?.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (loadingNow) return;
    rotateCamera(btn.dataset.rot);
  });
});

/* =========================================================
   THEME (LIGHT / DARK ONLY)
========================================================= */

function getTheme() {
  return localStorage.getItem('theme') || 'dark';
}

function applyTheme(mode) {
  const isLight = mode === 'light';
  document.body.classList.toggle('theme-light', isLight);
  viewer?.setMode?.(mode);
}

function markActiveTheme(mode) {
  if (!themeDropdown) return;
  themeDropdown.querySelectorAll('.theme-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.theme === mode);
  });
}

(function initThemeDropdown() {
  const saved = getTheme();
  applyTheme(saved);
  markActiveTheme(saved);

  if (!themeToggle || !themeMenu || !themeDropdown) return;

  if (!themeMenu.hasAttribute('data-open')) themeMenu.setAttribute('data-open', '0');

  themeToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const open = themeMenu.getAttribute('data-open') === '1';
    themeMenu.setAttribute('data-open', open ? '0' : '1');
    themeToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  themeDropdown.querySelectorAll('.theme-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.theme;
      localStorage.setItem('theme', mode);
      applyTheme(mode);
      markActiveTheme(mode);
      themeMenu.setAttribute('data-open', '0');
      themeToggle.setAttribute('aria-expanded', 'false');
    });
  });

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (themeMenu.getAttribute('data-open') !== '1') return;
      if (e.target.closest('#themeMenu')) return;
      themeMenu.setAttribute('data-open', '0');
      themeToggle.setAttribute('aria-expanded', 'false');
    },
    { capture: true }
  );
})();

(function initRotateDropdown() {
  if (!rotateMenu || !rotateToggle || !rotateDropdown) return;

  if (!rotateMenu.hasAttribute('data-open')) rotateMenu.setAttribute('data-open', '0');

  rotateToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const open = rotateMenu.getAttribute('data-open') === '1';
    rotateMenu.setAttribute('data-open', open ? '0' : '1');
    rotateToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (rotateMenu.getAttribute('data-open') !== '1') return;
      if (e.target.closest('#rotateMenu')) return;
      rotateMenu.setAttribute('data-open', '0');
      rotateToggle.setAttribute('aria-expanded', 'false');
    },
    { capture: true }
  );
})();

/* =========================================================
   MODELS
========================================================= */

const MODEL_REGISTRY = {
  engine: () => import('@engine/models/engine/engine.model.js'),
};

const orderedModels = select ? Array.from(select.options).map((o) => o.value) : ['engine'];

let explodeApi = null;
let exploded = false;
let explodeMode = "global";
let systemExploded = false;
let explodeBusy = false;

function syncExplodeLabel() {
  if (!explodeBtn) return;

  if (explodeMode === "system") {
    explodeBtn.textContent = systemExploded ? "Assemble system" : "Explode system";
    return;
  }

  explodeBtn.textContent = exploded ? "Assemble" : "Explode";
}

function setExplodeEnabled(enabled) {
  if (!explodeBtn) return;
  explodeBtn.style.display = enabled ? 'block' : 'none';
  explodeBtn.disabled = !enabled;
  if (enabled) syncExplodeLabel();
}

async function toggleExplode() {
  if (loadingNow || !explodeApi || explodeBusy) return;

  explodeBusy = true;
  if (explodeBtn) explodeBtn.disabled = true;

  try {
    if (explodeMode === "system") {
      if (typeof explodeApi.toggleSystem === "function") {
        const result = explodeApi.toggleSystem();

        if (result && typeof result.then === "function") {
          systemExploded = await result;
        } else if (typeof result === "boolean") {
          systemExploded = result;
        } else {
          systemExploded = !systemExploded;
        }

        syncExplodeLabel();
      }

      return;
    }

    if (typeof explodeApi.toggle === "function") {
      const result = explodeApi.toggle();

      if (result && typeof result.then === "function") {
        exploded = await result;
      } else if (typeof result === "boolean") {
        exploded = result;
      } else {
        exploded = !exploded;
      }

      syncExplodeLabel();
    }
  } catch (e) {
    console.warn("[explode] error:", e);
  } finally {
    explodeBusy = false;
    if (explodeBtn) explodeBtn.disabled = false;
  }
}

explodeBtn?.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse') {
    e.preventDefault();
  }

  toggleExplode();
});

window.addEventListener("engine:system-selected", (e) => {
  explodeMode = "system";

  if (typeof e.detail?.exploded === "boolean") {
    systemExploded = e.detail.exploded;
  }

  syncExplodeLabel();
});

window.addEventListener("engine:system-cleared", () => {
  explodeMode = "global";
  systemExploded = false;
  syncExplodeLabel();
});
window.addEventListener("engine:explode-reset", () => {
  exploded = false;
  explodeBusy = false;
  syncExplodeLabel();
});

/* =========================================================
   LOAD MODEL
========================================================= */

async function loadById(id) {
  const myToken = ++loadToken;
  loadingNow = true;

  explodeApi = null;
  exploded = false;
  explodeBusy = false;
  setExplodeEnabled(false);

  const loadFn = MODEL_REGISTRY[id];
  if (!loadFn) return;

  try {
    setLoading(true);

    canvasEl.style.visibility = 'hidden';
    canvasEl.style.opacity = '0';

    const mod = await loadFn();
    if (myToken !== loadToken) return;

    await viewer.loadModelModule(mod);
    if (myToken !== loadToken) return;

    if (explodeBtn && id === 'engine') {
      explodeApi = {
        toggle: mod.toggleExplode || null,
        toggleSystem: mod.toggleSystemExplode || null,
      };

      const ok = !!(explodeApi.toggle || explodeApi.explode || explodeApi.implode);
      setExplodeEnabled(ok);
      exploded = false;
      syncExplodeLabel();
    }

    await new Promise((r) => requestAnimationFrame(r));
    canvasEl.style.visibility = 'visible';
    canvasEl.style.opacity = '1';
  } catch (err) {
    console.error('[viewer] load error:', err);
  } finally {
    if (myToken === loadToken) {
      setLoading(false);
      loadingNow = false;
    }
  }
}

/* =========================================================
   AUTH + INIT
========================================================= */

const loginScreen = document.getElementById("loginScreen");
const loginSubmit = document.getElementById("loginSubmit");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");

if (loginUsername) loginUsername.value = "";
if (loginPassword) loginPassword.value = "";

setTimeout(() => {
  if (loginUsername) loginUsername.value = "";
  if (loginPassword) loginPassword.value = "";
}, 100);

const togglePassword = document.getElementById("togglePassword");
const loginError = document.getElementById("loginError");

const systemStatus = document.getElementById("systemStatus");

async function updateSystemStatus() {
  if (!systemStatus) return;

  systemStatus.innerHTML = `
    <div class="status-item">
      <img
        class="status-svg"
        src="/images/api.svg"
        alt="API"
      >

      <strong>CHECKING</strong>
      <small>SYSTEM STATUS</small>
    </div>
  `;

  try {
    const baseUrl = import.meta.env.PROD
      ? "https://ship-engine.onrender.com"
      : "http://localhost:3001";

    const res = await fetch(`${baseUrl}/api/status`, {
      cache: "no-store",
    });

    if (!res.ok) throw new Error("API not reachable");

    const data = await res.json();

    systemStatus.innerHTML = `
      <div class="status-item status-online">
        <img
          class="status-svg"
          src="/images/api.svg"
          alt="API"
        >

        <strong>ONLINE</strong>
        <small>SYSTEM STATUS</small>
      </div>

      <div class="status-item">
        <img
          class="status-svg"
          src="/images/system.svg"
          alt="Systems"
        >

        <strong>${data.systemsReady}</strong>
        <small>SYSTEMS READY</small>
      </div>

      <div class="status-item">
        <img
          class="status-svg"
          src="/images/component.svg"
          alt="Components"
        >

        <strong>${data.components}</strong>
        <small>COMPONENTS</small>
      </div>

      <div class="status-item">
        <img
          class="status-svg"
          src="/images/pdf-file-svgrepo-com.svg"
          alt="PDF"
        >

        <strong>${data.pdfDocuments}</strong>
        <small>PDF DOCUMENTS</small>
      </div>
    `;
  } catch {
    systemStatus.innerHTML = `
      <div class="status-item status-offline">
        <img
          class="status-svg"
          src="/images/api.svg"
          alt="Offline"
        >

        <strong>OFFLINE</strong>
        <small>SYSTEM STATUS</small>
      </div>

      <div class="status-item">
        <img
          class="status-svg"
          src="/images/system.svg"
          alt="Systems"
        >

        <strong>--</strong>
        <small>SYSTEMS READY</small>
      </div>

      <div class="status-item">
        <img
          class="status-svg"
          src="/images/component.svg"
          alt="Components"
        >

        <strong>--</strong>
        <small>COMPONENTS</small>
      </div>

      <div class="status-item">
        <img
          class="status-svg"
          src="/images/pdf-file-svgrepo-com.svg"
          alt="PDF"
        >

        <strong>--</strong>
        <small>PDF DOCUMENTS</small>
      </div>
    `;
  }
}

updateSystemStatus();

togglePassword?.addEventListener("click", () => {

  const hidden =
    loginPassword.type === "password";

  loginPassword.type =
    hidden ? "text" : "password";

  document.getElementById("eyeIcon").style.opacity =
    hidden ? "1" : "0.55";
});

/* =========================================================
   LOGIN VIDEO CONTROLS
========================================================= */

const loginVideo = document.querySelector(".login-video");
const videoToggle = document.getElementById("videoToggle");

videoToggle?.addEventListener("click", async () => {
  if (!loginVideo) return;

  const icon = videoToggle.querySelector("img");

  if (loginVideo.paused) {
    await loginVideo.play();

    if (icon) {
      icon.src = "/images/pause.svg";
      icon.alt = "Pause video";
    }
  } else {
    loginVideo.pause();

    if (icon) {
      icon.src = "/images/play.svg";
      icon.alt = "Play video";
    }
  }
});

let viewerStarted = false;

async function startViewerOnce() {
  if (viewerStarted) return;

  viewerStarted = true;

  const initialId = (select && select.value) || orderedModels[0] || "engine";
  await loadById(initialId);
}

async function showViewer() {
  loginScreen.style.display = "none";
  viewerWrap.style.display = "block";

  await new Promise((resolve) => requestAnimationFrame(resolve));

  window.dispatchEvent(new Event("resize"));

  await startViewerOnce();

  await new Promise((resolve) => requestAnimationFrame(resolve));

  window.dispatchEvent(new Event("resize"));
}

async function showLogin() {
  loginScreen.style.display = "grid";
  viewerWrap.style.display = "none";
}

loginSubmit?.addEventListener("click", async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  loginError.textContent = "";

  if (!username || !password) {
    loginError.textContent = "Please enter Operator ID and Access Key.";
    return;
  }

  try {
    await login(username, password);

    await showViewer();
  } catch (error) {
    console.warn("[login] failed:", error);

    const message = String(error?.message || "").toLowerCase();

    if (
      message.includes("401") ||
      message.includes("unauthorized") ||
      message.includes("invalid")
    ) {
      loginError.textContent = "Invalid Operator ID or Access key.";
      return;
    }

    if (
      message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("api") ||
      message.includes("server")
    ) {
      loginError.textContent = "API unavailable. Check API status and try again.";
      return;
    }

    loginError.textContent = "Authentication failed. Please try again.";
  }
});

loginPassword?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    loginSubmit.click();
  }
});

loginScreen.style.display = "none";
viewerWrap.style.display = "block";

try {
  showPreloader();

  const valid = await validateToken();

  if (valid) {
    await showViewer();
  } else {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await showLogin();
  }
} finally {
  hidePreloader();
}

select?.addEventListener("change", async (e) => {
  await loadById(e.target.value);
});

/* =========================================================
   CIRCLE MENU
========================================================= */

const circleMenu = document.getElementById("circleMenu");
const circleMainBtn = document.getElementById("circleMainBtn");

const circleThemeBtn =
document.getElementById("circleThemeBtn");

const circleRotateBtn =
document.getElementById("circleRotateBtn");

const circleThemeSubmenu =
document.getElementById("circleThemeSubmenu");

const circleRotateSubmenu =
document.getElementById("circleRotateSubmenu");


/* MAIN + BUTTON */

circleMainBtn?.addEventListener(
  "click",
  (e) => {

    e.stopPropagation();

    circleMenu?.classList.toggle(
      "is-open"
    );

    if(
      !circleMenu?.classList.contains(
        "is-open"
      )
    ){
      circleThemeSubmenu?.classList.remove(
        "is-open"
      );

      circleRotateSubmenu?.classList.remove(
        "is-open"
      );
    }
  }
);


/* THEME BUTTON */

circleThemeBtn?.addEventListener(
  "click",
  (e) => {

    e.stopPropagation();

    circleThemeSubmenu?.classList.toggle(
      "is-open"
    );

    circleRotateSubmenu?.classList.remove(
      "is-open"
    );
  }
);


/* ROTATE BUTTON */

circleRotateBtn?.addEventListener(
  "click",
  (e) => {

    e.stopPropagation();

    circleRotateSubmenu?.classList.toggle(
      "is-open"
    );

    circleThemeSubmenu?.classList.remove(
      "is-open"
    );
  }
);


/* LIGHT / DARK */

document
.querySelectorAll(
  "[data-circle-theme]"
)
.forEach((btn)=>{

  btn.addEventListener(
    "click",
    (e)=>{

      e.stopPropagation();

      const mode =
      btn.dataset.circleTheme;

      localStorage.setItem(
        "theme",
        mode
      );

      applyTheme(
        mode
      );

      markActiveTheme(
        mode
      );

      /* NAMJERNO OSTAVLJAMO OTVORENO */
    }
  );

});


/* ROTATE GUMBI */

document
.querySelectorAll(
  "[data-circle-rot]"
)
.forEach((btn)=>{

  btn.addEventListener(
    "click",
    (e)=>{

      e.stopPropagation();

      rotateCamera(
        btn.dataset.circleRot
      );

      /* NAMJERNO OSTAVLJAMO OTVORENO */
    }
  );

});


/* KLIK VANI */

window.addEventListener(
  "pointerdown",
  (e)=>{

    if(
      e.target.closest(
        "#circleMenu"
      )
    ) return;

    const themeOpen =
    circleThemeSubmenu?.classList.contains(
      "is-open"
    );

    const rotateOpen =
    circleRotateSubmenu?.classList.contains(
      "is-open"
    );

    if(
      themeOpen ||
      rotateOpen
    ){

      circleThemeSubmenu?.classList.remove(
        "is-open"
      );

      circleRotateSubmenu?.classList.remove(
        "is-open"
      );

      return;
    }

    circleMenu?.classList.remove(
      "is-open"
    );
  }
);