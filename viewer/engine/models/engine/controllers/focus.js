/* ======================================================================
   ENGINE FOCUS (Engine 2.0)
   - Focus / isolate a selected engine part
   - Info panel data through API
   - Edit/save title, description, docs, schematics, maintenance
   - PDF upload support
====================================================================== */

import * as THREE from 'three';
import { isRenderablePart } from '../utils.js';
import { API_BASE } from '../../../../../config/api.js';

const gsap = window.gsap || null;

const API_BASE_URL = API_BASE;

const API_TIMEOUT_MS = 7000;

let cameraRef = null;
let controlsRef = null;
let rootRef = null;
let labelItemsRef = null;
let externalVisibilityRefresh = null;
let visibilityRef = null;
let onFocusChange = null;
let onExitFocusCb = null;

let focusMode = false;
let focusedRoot = null;

const savedVisibility = new Map();
const savedLabelDisplay = new WeakMap();
const savedCamPos = new THREE.Vector3();
const savedCamTarget = new THREE.Vector3();

let infoPanel = null;
let infoTitleEl = null;
let infoTextEl = null;
let infoCloseBtn = null;
let infoEditBtn = null;
let infoSaveBtn = null;
let infoCancelBtn = null;
let infoDocBtn = null;
let infoSchematicsBtn = null;
let infoMaintenanceBtn = null;

let currentComponentKey = null;
let currentComponentPayload = null;
let currentMeshOrObj = null;
let infoRequestToken = 0;

function getRenderableRoot(obj) {
  if (!obj) return obj;
  if (isRenderablePart(obj)) return obj;

  let p = obj.parent;
  while (p && p !== rootRef && !isRenderablePart(p)) p = p.parent;

  return isRenderablePart(p) ? p : obj;
}

function collectRenderableSubtree(rootObj) {
  const set = new Set();
  if (!rootObj) return set;

  rootObj.traverse((o) => {
    if (isRenderablePart(o)) set.add(o);
  });

  if (set.size === 0 && isRenderablePart(rootObj)) {
    set.add(rootObj);
  }

  return set;
}

function makeComponentKey(labelText, meshOrObj) {
  if (meshOrObj?.userData?.componentKey) {
    return meshOrObj.userData.componentKey;
  }

  const path =
    meshOrObj?.userData?.breadcrumb ||
    meshOrObj?.userData?.path ||
    meshOrObj?.name ||
    labelText ||
    'component';

  return `path:${path.toString().trim()}`;
}

function getDefaultTitleFromKey(key) {
  return (
    String(key || 'Component')
      .replace(/^path:/, '')
      .replace(/^name:/, '')
      .replace(/^uuid:/, '')
      .split('/')
      .pop()
      .replace(/_/g, ' ')
      .trim() || 'Component'
  );
}

function makeFallbackComponent(labelText, meshOrObj) {
  const key = makeComponentKey(labelText, meshOrObj);

  const title =
    (labelText && labelText.toString().trim()) ||
    meshOrObj?.userData?.displayName ||
    getDefaultTitleFromKey(key);

  return {
    key,
    title,
    description: 'No description available for this component yet.',
    documents: {
      documentation: null,
      schematics: null,
      maintenance: null,
    },
    source: 'fallback',
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function getComponentFromApi(key) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/components/${encodeURIComponent(key)}`
  );

  if (!res.ok) {
    throw new Error(`Component API failed: ${res.status}`);
  }

  return await res.json();
}

async function saveComponentToApi(key, payload) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/components/${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(`Component save failed: ${res.status}`);
  }

  return await res.json();
}

async function uploadPdf(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/upload/document`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('PDF upload failed');
  }

  const data = await res.json();
  return data.url || null;
}

function normalizeComponentPayload(apiData, fallback) {
  const data = apiData && typeof apiData === 'object' ? apiData : {};

  const documents = data.documents || {
    documentation: data.documentation ?? null,
    schematics: data.schematics ?? null,
    maintenance: data.maintenance ?? null,
  };

  return {
    key: data.key || fallback.key,
    title: data.title || fallback.title || getDefaultTitleFromKey(fallback.key),
    description:
      data.description ||
      fallback.description ||
      'No description available.',
    documents: {
      documentation: documents.documentation || null,
      schematics: documents.schematics || null,
      maintenance: documents.maintenance || null,
    },
    source: data.source || 'api',
  };
}

function updateActiveSidebarTitle(title) {
  if (!title) return;

  const activeBtn =
    window.__ENGINE_ACTIVE_SIDEBAR_BTN__ ||
    document.querySelector('.component-list-btn.is-active');

  const labelEl = activeBtn?.querySelector('.component-list-label');

  if (!labelEl) return;

  labelEl.textContent = title;
  activeBtn.dataset.displayTitle = title;
}

function ensureInfoPanel() {
  if (infoPanel) return infoPanel;

  const viewer = document.getElementById('viewer');
  if (!viewer) return null;

  const panel = document.createElement('div');
  panel.className = 'engine-info-panel';

  panel.innerHTML = `
    <div class="engine-info-inner">
      <button class="engine-info-close" type="button" aria-label="Close">×</button>

      <button class="engine-info-edit" type="button" aria-label="Edit component">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25Zm15.71-10.04a1 1 0 0 0 0-1.41l-1.51-1.51a1 1 0 0 0-1.41 0l-1.18 1.18 2.75 2.75 1.35-1.01Z"
          />
        </svg>
      </button>

      <div class="engine-info-main">
        <div class="engine-info-view">
          <h4 class="engine-info-title"></h4>
          <p class="engine-info-text"></p>
        </div>

        <div class="engine-info-editor" hidden>
          <label class="engine-info-field">
            <span>Title</span>
            <input class="engine-info-title-input" type="text" />
          </label>

          <label class="engine-info-field">
            <span>Description</span>
            <textarea class="engine-info-description-input" rows="5"></textarea>
          </label>

          <label class="engine-info-field">
            <span>Documentation PDF</span>

            <div class="engine-file-box">

              <input
                id="documentation-file"
                class="engine-info-documentation-input engine-hidden-file"
                type="file"
                accept="application/pdf"
              />

              <label
                for="documentation-file"
                class="engine-file-trigger"
              >
                Select PDF
              </label>

              <div
                class="engine-file-current"
                data-doc-current="documentation"
              ></div>

            </div>
          </label>

          <label class="engine-info-field">
            <span>Schematics PDF</span>

            <div class="engine-file-box">

              <input
                id="schematics-file"
                class="engine-info-schematics-input engine-hidden-file"
                type="file"
                accept="application/pdf"
              />

              <label
                for="schematics-file"
                class="engine-file-trigger"
              >
                Select PDF
              </label>

              <div
                class="engine-file-current"
                data-doc-current="schematics"
              ></div>

            </div>
          </label>

          <label class="engine-info-field">
            <span>Maintenance PDF</span>

            <div class="engine-file-box">

              <input
                id="maintenance-file"
                class="engine-info-maintenance-input engine-hidden-file"
                type="file"
                accept="application/pdf"
              />

              <label
                for="maintenance-file"
                class="engine-file-trigger"
              >
                Select PDF
              </label>

              <div
                class="engine-file-current"
                data-doc-current="maintenance"
              ></div>

            </div>
          </label>

          <div class="engine-info-editor-actions">
            <button class="engine-info-save" type="button">Save</button>
            <button class="engine-info-cancel" type="button">Cancel</button>
          </div>
        </div>

        <div class="engine-info-divider"></div>

        <div class="engine-info-doc-section">
          <div class="engine-info-doc-heading">DOCUMENTATION</div>

          <div class="engine-info-doc-grid">
            <a class="engine-info-doc-action" id="engine-info-schematics" href="#" target="_blank" rel="noopener noreferrer">
              <span class="engine-info-doc-icon">▧</span>
              <span>Schematics</span>
            </a>

            <a class="engine-info-doc-action" id="engine-info-doc" href="#" target="_blank" rel="noopener noreferrer">
              <span class="engine-info-doc-icon">◎</span>
              <span>Documentation</span>
            </a>

            <a class="engine-info-doc-action" id="engine-info-maintenance" href="#" target="_blank" rel="noopener noreferrer">
              <span class="engine-info-doc-icon">▻</span>
              <span>Maintenance</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  viewer.appendChild(panel);

  infoTitleEl = panel.querySelector('.engine-info-title');
  infoTextEl = panel.querySelector('.engine-info-text');

  infoCloseBtn = panel.querySelector('.engine-info-close');
  infoEditBtn = panel.querySelector('.engine-info-edit');
  infoSaveBtn = panel.querySelector('.engine-info-save');
  infoCancelBtn = panel.querySelector('.engine-info-cancel');

  infoDocBtn = panel.querySelector('#engine-info-doc');
  infoSchematicsBtn = panel.querySelector('#engine-info-schematics');
  infoMaintenanceBtn = panel.querySelector('#engine-info-maintenance');

  infoCloseBtn?.addEventListener('click', () => exitFocusMode());
  infoEditBtn?.addEventListener('click', () => enterInfoEditMode());
  infoCancelBtn?.addEventListener('click', () => exitInfoEditMode(false));
  infoSaveBtn?.addEventListener('click', () => saveInfoEditMode());

  panel.style.display = 'none';
  infoPanel = panel;

  return panel;
}

function setDocButton(button, href) {
  if (!button) return;

  if (href) {
    button.href = href;
    button.style.display = 'inline-flex';
    return;
  }

  button.removeAttribute('href');
  button.style.display = 'none';
}

function fileNameFromUrl(url = '') {
  return String(url).split('/').pop() || 'PDF document';
}

function renderCurrentFileRows() {
  if (!infoPanel || !currentComponentPayload) return;

  const docs = currentComponentPayload.documents || {};

  const items = [
    ['documentation', docs.documentation],
    ['schematics', docs.schematics],
    ['maintenance', docs.maintenance],
  ];

  items.forEach(([type, url]) => {
    const row = infoPanel.querySelector(
      `[data-doc-current="${type}"]`
    );

    if (!row) return;

    if (!url) {
      row.innerHTML =
        '<span class="engine-file-empty">No current PDF</span>';
      return;
    }

    row.innerHTML = `
      <a class="engine-file-link"
         href="${url}"
         target="_blank"
         rel="noopener noreferrer">
        ${fileNameFromUrl(url)}
      </a>

      <button
        class="engine-file-remove"
        type="button"
        data-doc-remove="${type}">
        Remove
      </button>
    `;
  });

  infoPanel
    .querySelectorAll('[data-doc-remove]')
    .forEach((btn) => {
      btn.onclick = () => {
        const type = btn.dataset.docRemove;

        currentComponentPayload.documents[type] = null;

        renderCurrentFileRows();
      };
    });
}

function renderInfoPayload(payload) {
  if (!infoPanel || !infoTitleEl || !infoTextEl) return;

  const docs = payload?.documents || {};

  infoTitleEl.textContent = payload?.title || 'Component';
  infoTextEl.textContent =
    payload?.description || 'No description available.';

  setDocButton(infoDocBtn, docs.documentation);
  setDocButton(infoSchematicsBtn, docs.schematics);
  setDocButton(infoMaintenanceBtn, docs.maintenance);

  exitInfoEditMode(false);
}

async function showInfoPanel(labelText, meshOrObj) {
  const panel = ensureInfoPanel();
  if (!panel || !infoTitleEl || !infoTextEl) return;

  const requestId = ++infoRequestToken;

  const fallback = makeFallbackComponent(labelText, meshOrObj);
  const key = fallback.key;

  currentMeshOrObj = meshOrObj || null;
  currentComponentKey = key;
  currentComponentPayload = fallback;

  panel.style.display = 'block';

  renderInfoPayload({
    ...fallback,
    description: 'Loading component data...',
  });

  try {
    const apiData = await getComponentFromApi(key);

    if (requestId !== infoRequestToken) return;

    const normalized = normalizeComponentPayload(apiData, fallback);

    currentComponentPayload = {
      ...normalized,
      key,
    };

    renderInfoPayload(currentComponentPayload);
  } catch (err) {
    if (requestId !== infoRequestToken) return;

    console.warn('[INFO API] using fallback component data:', err?.message || err);

    currentComponentPayload = {
      ...fallback,
      key,
      title: fallback.title || getDefaultTitleFromKey(key),
    };

    renderInfoPayload(currentComponentPayload);
  }
}

function hideInfoPanel() {
  if (!infoPanel) return;

  infoPanel.style.display = 'none';
  exitInfoEditMode(false);

  if (infoDocBtn) infoDocBtn.style.display = 'none';
  if (infoSchematicsBtn) infoSchematicsBtn.style.display = 'none';
  if (infoMaintenanceBtn) infoMaintenanceBtn.style.display = 'none';
}

function getEditorEls() {
  if (!infoPanel) return {};

  return {
    view: infoPanel.querySelector('.engine-info-view'),
    editor: infoPanel.querySelector('.engine-info-editor'),

    titleInput: infoPanel.querySelector('.engine-info-title-input'),
    descriptionInput: infoPanel.querySelector('.engine-info-description-input'),
    documentationInput: infoPanel.querySelector('.engine-info-documentation-input'),
    schematicsInput: infoPanel.querySelector('.engine-info-schematics-input'),
    maintenanceInput: infoPanel.querySelector('.engine-info-maintenance-input'),
  };
}

function enterInfoEditMode() {
  if (!infoPanel || !currentComponentPayload) return;

  const {
    view,
    editor,
    titleInput,
    descriptionInput,
    documentationInput,
    schematicsInput,
    maintenanceInput,
  } = getEditorEls();

  if (!editor) return;

  if (titleInput) titleInput.value = currentComponentPayload.title || '';
  if (descriptionInput) descriptionInput.value = currentComponentPayload.description || '';

  if (documentationInput) documentationInput.value = '';
  if (schematicsInput) schematicsInput.value = '';
  if (maintenanceInput) maintenanceInput.value = '';

  if (view) view.hidden = true;
  editor.hidden = false;

  renderCurrentFileRows();

  infoDocBtn?.closest('.engine-info-doc-section')?.setAttribute('hidden', '');
}

function exitInfoEditMode(clearInputs = false) {
  const {
    view,
    editor,
    titleInput,
    descriptionInput,
    documentationInput,
    schematicsInput,
    maintenanceInput,
  } = getEditorEls();

  if (editor) editor.hidden = true;
  if (view) view.hidden = false;

  infoDocBtn?.closest('.engine-info-doc-section')?.removeAttribute('hidden');

  if (clearInputs) {
    if (titleInput) titleInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (documentationInput) documentationInput.value = '';
    if (schematicsInput) schematicsInput.value = '';
    if (maintenanceInput) maintenanceInput.value = '';
  }
}

async function saveInfoEditMode() {
  if (!currentComponentKey || !currentComponentPayload) return;

  const {
    titleInput,
    descriptionInput,
    documentationInput,
    schematicsInput,
    maintenanceInput,
  } = getEditorEls();

  const clean = (value) => {
    const v = (value || '').toString().trim();
    return v || null;
  };

  const currentDocs = currentComponentPayload.documents || {};

  const documentationFile = documentationInput?.files?.[0] || null;
  const schematicsFile = schematicsInput?.files?.[0] || null;
  const maintenanceFile = maintenanceInput?.files?.[0] || null;

  if (infoSaveBtn) infoSaveBtn.disabled = true;

  try {
    const documentationUrl =
      (await uploadPdf(documentationFile)) || currentDocs.documentation || null;

    const schematicsUrl =
      (await uploadPdf(schematicsFile)) || currentDocs.schematics || null;

    const maintenanceUrl =
      (await uploadPdf(maintenanceFile)) || currentDocs.maintenance || null;

    const nextPayload = {
      key: currentComponentKey,
      title:
        clean(titleInput?.value) ||
        currentComponentPayload.title ||
        getDefaultTitleFromKey(currentComponentKey),

      description:
        clean(descriptionInput?.value) ||
        currentComponentPayload.description ||
        'No description available.',

      documents: {
        documentation: documentationUrl,
        schematics: schematicsUrl,
        maintenance: maintenanceUrl,
      },

      updatedAt: new Date().toISOString(),
    };

    const saved = await saveComponentToApi(currentComponentKey, nextPayload);

    const normalized = normalizeComponentPayload(
      saved?.component || saved,
      nextPayload
    );

    currentComponentPayload = {
      ...normalized,
      key: currentComponentKey,
    };

    renderInfoPayload(currentComponentPayload);

    if (currentMeshOrObj?.userData) {
      currentMeshOrObj.userData.displayName = currentComponentPayload.title;
    }

    updateActiveSidebarTitle(currentComponentPayload.title);
  } catch (err) {
    console.warn('[INFO API] save failed:', err?.message || err);
    alert('Save failed. Check backend API and selected PDF files.');
  } finally {
    if (infoSaveBtn) infoSaveBtn.disabled = false;
  }
}

export function initFocus({
  camera,
  controls,
  root,
  labelItems,
  refreshVisibility,
  visibility = null,
  onFocus = null,
  onExitFocus = null,
}) {
  cameraRef = camera || null;
  controlsRef = controls || null;
  rootRef = root || null;
  labelItemsRef = labelItems || null;

  externalVisibilityRefresh =
    typeof refreshVisibility === 'function' ? refreshVisibility : null;

  visibilityRef = visibility || null;

  onFocusChange = typeof onFocus === 'function' ? onFocus : null;
  onExitFocusCb = typeof onExitFocus === 'function' ? onExitFocus : null;
}

export function isFocusMode() {
  return focusMode;
}

function computeFramedCameraPosition(targetObj) {
  const box = new THREE.Box3().setFromObject(targetObj);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  box.getCenter(center);
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const safeDim = Math.max(maxDim, 0.25);

  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);

  const radius = Math.max(sphere.radius, safeDim * 0.5);
  const fov = (cameraRef.fov * Math.PI) / 180;
  const fit = radius / Math.tan(fov / 2);
  const distance = Math.max(fit * 1.25, 0.8);

  const dir = new THREE.Vector3()
    .subVectors(cameraRef.position, controlsRef.target)
    .normalize();

  if (!Number.isFinite(dir.x + dir.y + dir.z) || dir.lengthSq() < 1e-6) {
    dir.set(2.5, 1.5, 2.5).normalize();
  }

  const newPos = center.clone().add(dir.multiplyScalar(distance));

  return { center, newPos };
}

export function focusOnPart(meshOrObj, labelText) {
  if (!cameraRef || !controlsRef || !rootRef) return;
  if (!meshOrObj) return;

  visibilityRef?.clearHoverUX?.();

  const targetRoot = getRenderableRoot(meshOrObj);
  if (focusedRoot === targetRoot) return;

  if (focusMode && focusedRoot && focusedRoot !== targetRoot) {
    if (gsap) {
      gsap.killTweensOf(cameraRef.position);
      gsap.killTweensOf(controlsRef.target);
    }

    hideInfoPanel();
  }

  if (!focusedRoot) {
    savedVisibility.clear();

    rootRef.traverse((o) => {
      if (isRenderablePart(o)) savedVisibility.set(o, o.visible);
    });

    savedCamPos.copy(cameraRef.position);
    savedCamTarget.copy(controlsRef.target);

    if (Array.isArray(labelItemsRef)) {
      labelItemsRef.forEach((item) => {
        if (item?.el && !savedLabelDisplay.has(item.el)) {
          savedLabelDisplay.set(item.el, item.el.style.display);
        }
      });
    }
  }

  focusedRoot = targetRoot;
  focusMode = true;

  if (Array.isArray(labelItemsRef)) {
    labelItemsRef.forEach((item) => {
      if (item?.el) item.el.style.display = 'none';
    });
  }

  const allowed = collectRenderableSubtree(targetRoot);

  rootRef.traverse((o) => {
    if (!isRenderablePart(o)) return;
    o.visible = allowed.has(o);
  });

  const { center, newPos } = computeFramedCameraPosition(targetRoot);
  const duration = 0.8;

  if (gsap) {
    gsap.killTweensOf(cameraRef.position);
    gsap.killTweensOf(controlsRef.target);

    gsap.to(cameraRef.position, {
      duration,
      x: newPos.x,
      y: newPos.y,
      z: newPos.z,
      ease: 'power2.out',
      onUpdate: () => controlsRef.update(),
    });

    gsap.to(controlsRef.target, {
      duration,
      x: center.x,
      y: center.y,
      z: center.z,
      ease: 'power2.out',
      onUpdate: () => controlsRef.update(),
    });
  } else {
    cameraRef.position.copy(newPos);
    controlsRef.target.copy(center);
    controlsRef.update();
  }

  const autoLabel =
    (labelText && labelText.toString().trim()) ||
    meshOrObj?.userData?.displayName ||
    targetRoot?.userData?.displayName ||
    meshOrObj?.name ||
    '';

  try {
    onFocusChange?.({
      active: true,
      mesh: meshOrObj,
      label: autoLabel,
      root: targetRoot,
    });
  } catch (_) {}

  showInfoPanel(autoLabel, meshOrObj);
}

export function exitFocusMode() {
  visibilityRef?.clearHoverUX?.();

  if (!cameraRef || !controlsRef || !rootRef) {
    hideInfoPanel();
    focusedRoot = null;
    focusMode = false;

    try {
      onFocusChange?.({ active: false, mesh: null, label: '', root: null });
    } catch (_) {}

    try {
      onExitFocusCb?.();
    } catch (_) {}

    return;
  }

  if (!focusedRoot) {
    hideInfoPanel();
    focusMode = false;

    try {
      onFocusChange?.({ active: false, mesh: null, label: '', root: null });
    } catch (_) {}

    try {
      onExitFocusCb?.();
    } catch (_) {}

    return;
  }

  rootRef.traverse((o) => {
    if (!isRenderablePart(o)) return;
    if (savedVisibility.has(o)) o.visible = savedVisibility.get(o);
  });

  focusedRoot = null;
  focusMode = false;
  hideInfoPanel();

  if (Array.isArray(labelItemsRef)) {
    labelItemsRef.forEach((item) => {
      if (!item?.el) return;

      const prev = savedLabelDisplay.get(item.el);
      item.el.style.display = prev ?? '';
    });
  }

  externalVisibilityRefresh?.();

  const duration = 0.8;

  if (gsap) {
    gsap.killTweensOf(cameraRef.position);
    gsap.killTweensOf(controlsRef.target);

    gsap.to(cameraRef.position, {
      duration,
      x: savedCamPos.x,
      y: savedCamPos.y,
      z: savedCamPos.z,
      ease: 'power2.out',
      onUpdate: () => controlsRef.update(),
    });

    gsap.to(controlsRef.target, {
      duration,
      x: savedCamTarget.x,
      y: savedCamTarget.y,
      z: savedCamTarget.z,
      ease: 'power2.out',
      onUpdate: () => controlsRef.update(),
    });
  } else {
    cameraRef.position.copy(savedCamPos);
    controlsRef.target.copy(savedCamTarget);
    controlsRef.update();
  }

  try {
    onFocusChange?.({ active: false, mesh: null, label: '', root: null });
  } catch (_) {}

  try {
    onExitFocusCb?.();
  } catch (_) {}
}