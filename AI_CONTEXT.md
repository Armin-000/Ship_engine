# AI_CONTEXT.md — Ship Engine / SMECO 2.0

> **PURPOSE OF THIS FILE**
> This file is a machine-readable project context document intended for AI coding assistants (Claude, ChatGPT, Copilot, etc.).
> It provides a complete, structured snapshot of architecture, file responsibilities, data flows, conventions, and gotchas
> so that an AI can contribute meaningfully to the codebase from the first message — without the developer re-explaining the project.
> **Always attach this file when starting a new AI session on this project.**

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | Ship Engine — SMECO 2.0 |
| **Type** | Web-based interactive 3D digital twin viewer |
| **Domain** | Marine engineering / ship machinery inspection |
| **Description** | A real-time 3D platform for inspecting a ship engine room. Users can select components, navigate a hierarchical system tree, isolate parts, view technical PDF documentation, and trigger animated exploded views of individual ship systems. |
| **Repository** | `https://github.com/alphawave-software/engine` |
| **Frontend** | `http://localhost:5173` (Vite dev server) |
| **Backend** | `http://localhost:3001` (Express REST API) |
| **Production backend** | `https://ship-engine.onrender.com` |
| **Auth backend** | `http://46.224.12.186` (VPS — set via `.env`) |

---

## 2. Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| **Three.js** | `0.160.0` | 3D scene, renderer, camera, controls, loaders |
| **Vite** | `^7.3.1` | Module bundler, dev server, path aliases |
| **Vanilla JS** | ES2022 | No framework. Pure ES modules + async/await |
| **GSAP** | external CDN | Optional. Camera animations, explode transitions. Loaded as `window.gsap` — never imported directly |
| **DRACOLoader** | Three.js addon | GLB mesh decompression. Decoder WASM is local (`public/draco/gltf/`) — no CDN dependency |
| **OrbitControls** | Three.js addon | Mouse/touch camera orbit |
| **CSS3** | — | Hand-written per-module stylesheets, no CSS framework |

### Backend
| Technology | Version | Role |
|---|---|---|
| **Node.js** | ≥18 | Runtime. Uses ESM (`"type": "module"`) |
| **Express** | `^5.2.1` | REST API server |
| **multer** | `^2.1.1` | PDF file upload handling |
| **cors** | `^2.8.6` | CORS middleware |
| **JSON flat file** | — | `backend/data/components.json` acts as the database for component metadata |

---

## 3. File Structure & Responsibilities

```
Ship_engine/
│
├── index.html                      # Single HTML page (true SPA). All UI is inline here:
│                                   # login overlay, viewer wrapper, sidebar, toolbar,
│                                   # circle menu, preloader overlay, model picker.
│                                   # Entry script: <script type="module" src="viewer/app/app.entry.js">
│
├── vite.config.js                  # Vite config. Defines path aliases:
│                                   #   @app    → viewer/app
│                                   #   @engine → viewer/engine
│                                   #   @ui     → viewer/ui
│                                   #   @shared → viewer/shared
│                                   # Optional bundle analyzer via ANALYZE=true env flag.
│
├── package.json                    # Frontend deps: three, vite, cross-env, knip, rollup-plugin-visualizer
│
├── .env                            # VITE_API_BASE_URL=http://46.224.12.186
│                                   # ⚠ Auth-only. Do NOT commit. Separate from components API URL.
│
├── start.sh                        # One-command setup + launch script.
│                                   # Checks Node.js, installs frontend + backend npm deps,
│                                   # creates required dirs, starts both servers, opens browser.
│
├── config/
│   └── api.js                      # Exports API_BASE for the components API:
│                                   #   DEV  → "http://localhost:3001"
│                                   #   PROD → "https://ship-engine.onrender.com"
│                                   # Uses import.meta.env.PROD for auto-switch.
│                                   # Used by: viewer/ui/sidebar/render.js, viewer/engine/models/engine/controllers/focus.js
│
├── viewer/                         # All frontend JavaScript source
│   │
│   ├── auth.js                     # JWT auth module.
│   │                               # Reads VITE_API_BASE_URL from .env (import.meta.env).
│   │                               # Stores token in localStorage key: "ship_engine_token".
│   │                               # Exports: login(), logout(), validateToken(), getToken(), authFetch()
│   │                               # Endpoints used: POST /api/auth/login, GET /api/user
│   │
│   ├── preloader.js                # Preloader overlay logic. Exports: initPreloader(), showPreloader(), hidePreloader()
│   │
│   ├── app/
│   │   └── app.entry.js            # ★ APPLICATION ENTRY POINT
│   │                               # Responsibilities (in order of execution):
│   │                               #   1. Init preloader
│   │                               #   2. createViewer() → Three.js runtime
│   │                               #   3. Auth check (validateToken) → show viewer or login
│   │                               #   4. loadById('engine') → lazy-import model module
│   │                               #   5. Wire all UI: zoom, theme, rotation snap, explode btn,
│   │                               #      model picker, circle menu
│   │                               # Owns: MODEL_REGISTRY, explode state machine, camera snap logic
│   │                               # Listens to custom events: engine:system-selected,
│   │                               #   engine:system-cleared, engine:explode-reset
│   │
│   ├── engine/
│   │   ├── core/
│   │   │   └── viewer.core.js      # ★ THREE.JS RUNTIME CORE
│   │   │                           # Factory: createViewer(containerEl, opts) → viewer API object
│   │   │                           # Creates and owns: Scene, WebGLRenderer, PerspectiveCamera,
│   │   │                           #   OrbitControls, ambient + directional lighting,
│   │   │                           #   GLTFLoader + DRACOLoader, resize observer, render loop
│   │   │                           # Renderer settings: SRGBColorSpace, ACESFilmicToneMapping,
│   │   │                           #   PCFSoftShadowMap, alpha:true, transparent background
│   │   │                           # Exposed viewer API: { renderer, scene, camera, controls,
│   │   │                           #   loadModelModule(mod), setMode('light'|'dark'), dispose() }
│   │   │                           # loadModelModule() calls mod.load(ctx) then mod.dispose() on swap
│   │   │                           # GPU cleanup: disposeObject3D() traverses and frees all
│   │   │                           #   geometries, materials, and textures to prevent VRAM leaks
│   │   │
│   │   └── models/
│   │       └── engine/             # ★ ENGINE MODEL MODULE
│   │           │                   # Self-contained module for the ship engine room GLB.
│   │           │                   # Follows the Model Module Contract (see Section 5).
│   │           │
│   │           ├── engine.model.js # Module root. Loads GLB, binds all controllers and sidebar.
│   │           │                   # Exports (Model Module Contract):
│   │           │                   #   id = 'engine', name = '3D Engine'
│   │           │                   #   url = '/glb/FIXED_ENGINE_ROOM.glb'
│   │           │                   #   viewPreset = { dir, distanceMul, offset, targetOffset }
│   │           │                   #   load(ctx), dispose()
│   │           │                   #   toggleExplode(), toggleSystemExplode()
│   │           │                   # Also manages: emergency light toggle state,
│   │           │                   #   activeMainSystemRoot, systemExploded flag
│   │           │
│   │           ├── tree.js         # Builds a stable logical tree from the raw Three.js Object3D graph.
│   │           │                   # Assigns userData.path (unique slash-separated key),
│   │           │                   #   userData.displayName, userData.breadcrumb to every node.
│   │           │                   # Re-groups scene children into 13 named ship systems + GLOBAL.
│   │           │                   # Assigns userData.sidebarGroup to all meshes.
│   │           │                   # Exports: buildEngineTree(), collectMeshesInSubtree()
│   │           │
│   │           ├── names.js        # Name formatting utilities.
│   │           │                   # Exports: getNiceName(node), prettyFromNodeName(name)
│   │           │                   # Converts raw Three.js node names (e.g. "Object_5_3") into
│   │           │                   #   readable UI labels.
│   │           │
│   │           ├── utils.js        # Exports: isRenderablePart(obj) — returns true if the
│   │           │                   #   Object3D should be treated as a selectable mesh part.
│   │           │
│   │           ├── controllers/
│   │           │   │
│   │           │   ├── explode.js              # Global explode / implode animation.
│   │           │   │                           # Uses smoothstep easing over configurable duration.
│   │           │   │                           # Two rule types: manual (by node name matching) and
│   │           │   │                           #   auto (displacement from AABB center).
│   │           │   │                           # Exports: prepareExplode(), toggleExplode(),
│   │           │   │                           #   explodeMotor(), implodeMotor(), stopAnim(), state
│   │           │   │
│   │           │   ├── explode.config.js        # Config for global explode:
│   │           │   │                           # duration (seconds), per-part manual offset vectors + rotations
│   │           │   │
│   │           │   ├── systemExplode.js         # Per-system explode. Animates only parts within
│   │           │   │                           # the currently selected system root.
│   │           │   │                           # Uses GSAP if available, falls back to manual RAF loop.
│   │           │   │                           # Exports: prepareSystemExplode(), explodeSystem(),
│   │           │   │                           #   implodeSystem(), toggleSystemExplode()
│   │           │   │
│   │           │   ├── system-explode.config.js # Per-system explode config. One entry per system:
│   │           │   │                           # { name, groups: [{ match, direction, distance, rotation }] }
│   │           │   │                           # Covers all 13 ship systems.
│   │           │   │
│   │           │   ├── focus.js                 # Component focus / isolation mode.
│   │           │   │                           # On click: hides all other parts, animates camera
│   │           │   │                           #   to fit the selected component in view (GSAP or manual).
│   │           │   │                           # Fetches metadata from GET /api/components/resolve
│   │           │   │                           #   and displays title + description + PDF links in info panel.
│   │           │   │                           # Supports inline edit → PUT /api/components/:key
│   │           │   │                           # Exports: initFocus(), focusOnPart(), exitFocusMode(), isFocusMode()
│   │           │   │
│   │           │   ├── hover.js                 # Hover highlight via emissive color overlay.
│   │           │   │                           # Exports: createHoverHighlighter() → { onHover, onUnhover, clearHoverUX }
│   │           │   │
│   │           │   ├── picking.js               # Raycaster-based click detection on the canvas.
│   │           │   │                           # Resolves click → Object3D → triggers focus or sidebar selection.
│   │           │   │                           # Exports: createPicking(ctx)
│   │           │   │
│   │           │   ├── visibility.js            # Show/hide subtrees or individual meshes.
│   │           │   │                           # Exports: createVisibilityController() → { show, hide, toggle, clearHoverUX }
│   │           │   │
│   │           │   ├── labels.js                # CSS2DObject labels floating above components in 3D space.
│   │           │   │                           # Exports: setupLabels(), setLabelsEnabled(), setHoverLabel(),
│   │           │   │                           #   clearHoverLabel(), labelItems
│   │           │   │
│   │           │   └── reset.js                 # Full scene reset: camera, visibility, explode state, focus mode.
│   │           │                               # Exports: createResetController() → { resetAll() }
│   │           │
│   │           └── ui/
│   │               └── sidebar/
│   │                   └── engine.sidebar.js    # Bridges tree.js output with the generic sidebar UI.
│   │                                           # Exports: initComponentSidebar(ctx), resetSidebar()
│   │
│   └── ui/
│       └── sidebar/                # ★ GENERIC SIDEBAR UI COMPONENT
│           │                       # Decoupled from model logic. Receives a ctx object with
│           │                       # actions, dom refs, tree data, and API callbacks.
│           │
│           ├── sidebar.component.js    # Sidebar entry point. Wires all sub-modules together.
│           ├── render.js               # Renders system groups and component list items into DOM.
│           │                           # On init: fetches all components → GET /api/components → cache.
│           │                           # On item click: GET /api/components/resolve?key=&candidate=
│           │                           # On save: PUT /api/components/:key
│           │                           # On PDF upload: POST /api/upload/document
│           ├── state.js                # Sidebar reactive state: expanded panels, selected node, edit mode flag
│           ├── dom.js                  # DOM element references and low-level DOM helpers
│           ├── panels.js               # Accordion panel expand/collapse with height animation
│           ├── events.js               # All sidebar event listeners (click, keyboard, outside-click)
│           ├── icons.js                # SVG icon factory functions. Exports: setEyeIcon() etc.
│           └── api.js                  # Sidebar-specific API helpers (thin wrappers over fetch)
│
├── css/
│   ├── viewer-base.css             # CSS reset + root variables + body/layout base
│   ├── viewer-ui.css               # All UI components: sidebar, toolbar, info panel, login screen,
│   │                               # theme classes, dropdowns, buttons, circle menu
│   ├── viewer-preloader.css        # Preloader overlay animation styles
│   └── viewer-sidebar.css          # Additional sidebar-specific overrides
│
├── public/                         # Static assets served directly by Vite (no processing)
│   ├── glb/
│   │   └── FIXED_ENGINE_ROOM.glb   # ★ Primary 3D asset. 14 MB, DRACO-compressed.
│   │                               # GLB hierarchy maps 1:1 to the 13 system groups.
│   │
│   ├── docs/
│   │   ├── components/             # Dynamically uploaded PDF docs per component.
│   │   │                           # Files named: {Date.now()}-{original_filename}.pdf
│   │   ├── main_docs/              # Static ship system PDFs: exhaust, fuel, ventilation,
│   │   │                           # general arrangement, body lines, propulsion specs.
│   │   │                           # Filenames are in Croatian / English mixed.
│   │   └── help/                   # Platform user guide (PDF + DOCX)
│   │
│   └── draco/
│       └── gltf/                   # DRACOLoader runtime files (WASM + JS).
│                                   # Must stay local — DRACOLoader is configured to point here.
│                                   # Files: draco_decoder.js, draco_decoder.wasm,
│                                   #        draco_encoder.js, draco_wasm_wrapper.js
│
├── favicon/                        # Full favicon set: .ico, .svg, .png (16/32/96/192/512px),
│                                   # apple-touch-icon.png, site.webmanifest
│
└── backend/
    ├── server.js                   # ★ EXPRESS REST API (full source — see Section 7)
    ├── package.json                # Backend deps: express, cors, multer
    └── data/
        └── components.json         # Flat JSON key-value store. Key = Three.js path string.
                                    # Auto-created if missing. Human-editable.
```

---

## 4. Data Flow

```
Browser
│
├── index.html
│     └── <script type="module"> → viewer/app/app.entry.js
│
└── app.entry.js
      │
      ├── auth.js ─────────────────────────────────────► VPS Auth API
      │   validateToken() / login()                       VITE_API_BASE_URL (.env)
      │   JWT stored: localStorage["ship_engine_token"]   Endpoints: /api/auth/login, /api/user
      │
      ├── viewer.core.js ──────────────────────────────► Three.js WebGL runtime
      │   createViewer(containerEl)                        Loads GLB via GLTFLoader + DRACOLoader
      │   Returns: { renderer, scene, camera, controls,    DRACO decoder: /public/draco/gltf/
      │              loadModelModule(), setMode() }
      │
      └── engine.model.js (lazy import via MODEL_REGISTRY)
            │
            ├── tree.js ──────────────────────────────── Processes raw Object3D graph
            │   buildEngineTree(root)                     Attaches userData.path, displayName,
            │                                             breadcrumb, sidebarGroup to every node
            │
            ├── controllers/
            │   ├── picking.js   ── raycaster → click → focusOnPart()
            │   ├── hover.js     ── mousemove → emissive highlight
            │   ├── focus.js     ── isolate part + fetch metadata ──────► GET /api/components/resolve
            │   │                   animate camera to fit part            PUT /api/components/:key (edit)
            │   │                   info panel: title, description, PDFs  POST /api/upload/document
            │   ├── explode.js   ── global explode/implode (smoothstep RAF)
            │   ├── systemExplode.js ── per-system explode (GSAP or RAF)
            │   ├── visibility.js ── show/hide mesh subtrees
            │   ├── labels.js    ── CSS2DObject labels in 3D space
            │   └── reset.js     ── reset camera + visibility + explode
            │
            └── ui/sidebar/engine.sidebar.js
                  └── viewer/ui/sidebar/render.js ───────► GET /api/components (cache on init)
                                                            GET /api/components/resolve (on click)
                                                            PUT /api/components/:key (on save)
                                                            POST /api/upload/document (PDF upload)
                                                            │
                                                            └── config/api.js
                                                                  DEV:  http://localhost:3001
                                                                  PROD: https://ship-engine.onrender.com
                                                                  │
                                                                  └── backend/server.js
                                                                        └── data/components.json
```

### Two separate API origins — intentional design

| | Auth API | Components API |
|---|---|---|
| **Dev URL** | `VITE_API_BASE_URL` from `.env` | `http://localhost:3001` (from `config/api.js`) |
| **Prod URL** | `http://46.224.12.186` (VPS) | `https://ship-engine.onrender.com` |
| **Source file** | `viewer/auth.js` | `config/api.js` |
| **Auth** | JWT Bearer token | None (open CRUD) |
| **Purpose** | User login / session validation | Component metadata + PDF docs |

These two APIs intentionally point to different servers. Do not unify them without understanding this split.

---

## 5. Core Concepts

### Model Module Contract
Every 3D model is a standalone JS module. `app.entry.js` lazy-imports via `MODEL_REGISTRY`. The contract:

```js
// Required exports from every model module
export const id = 'engine';               // unique string ID
export const name = '3D Engine';          // display name
export const url = '/glb/FILENAME.glb';   // path to GLB asset in /public/
export const viewPreset = {
  dir: THREE.Vector3,       // normalized camera direction
  distanceMul: Number,      // distance multiplier from model center
  offset: THREE.Vector3,    // camera position offset
  targetOffset: THREE.Vector3, // OrbitControls target offset
};
export async function load(ctx) { ... }   // ctx = viewer API object from viewer.core.js
export async function dispose() { ... }   // cleanup: remove listeners, clear refs
export function toggleExplode() { ... }   // returns Boolean (new state) or Promise<Boolean>
export function toggleSystemExplode() { ... }
```

To add a new model: create `viewer/engine/models/<name>/<name>.model.js` implementing this contract,
then register it: `MODEL_REGISTRY['<name>'] = () => import('@engine/models/<name>/<name>.model.js')`

### Component Key
Every 3D mesh is identified by its path through the Object3D hierarchy, built by `tree.js`:

```
path:Scene/FULL/1_Structure/11_Floor/113_Engine_Room_Base/Object_5_3
```

This string is the primary key in `components.json` and in all `/api/components` calls.
The `resolve` endpoint uses `normalizeKey()` for fuzzy matching (handles Croatian diacritics,
underscores, hyphens, dots, case differences).

### Explode System — Two Modes

**Global Explode** (`explode.js` + `explode.config.js`)
- Displaces every part in the entire model
- Manual rules: match by node name → apply specific offset vector + rotation
- Auto rules: displace from AABB bounding box center
- Animation: custom smoothstep RAF loop, no GSAP dependency

**System Explode** (`systemExplode.js` + `system-explode.config.js`)
- Only active when a system is selected in the sidebar
- Displaces parts within one of the 13 system roots
- Config: per-group `{ match, direction, distance, rotation }`
- Fires `engine:system-selected` / `engine:system-cleared` custom window events
- Uses GSAP if available, falls back to RAF

### 13 Ship Systems (sidebar groups)
```
1_Structure           2_Exhaust              3_PlateHeatExchanger
4_PortGenerator       5_MainEngine1          6_Transmission
7_Pipes               8_Valves               9_Propeller
10_FireSystem         11_LubeOilTank         12_ServiceAirReceiver
13_DuplexOilStrainer
```
These map directly to top-level children in the GLB scene hierarchy (under `Scene/FULL/`).

### Theme System
- Stored in `localStorage('theme')`. Values: `'dark'` (default) | `'light'`
- `viewer.setMode(mode)` changes scene background + light intensities
- CSS: toggling `body.theme-light` class drives all color overrides
- Two separate menus for the same function: desktop toolbar dropdown + mobile circle menu

### Auth Flow (sequential)
```
App start
  → showPreloader()
  → validateToken()  [GET /api/user with Bearer token from localStorage]
     ├── 200 OK  → showViewer() → loadById('engine')
     └── non-OK  → showLogin()
                     → user submits credentials
                     → login() [POST /api/auth/login]
                     → store token → showViewer() → loadById('engine')
```

---

## 6. Code Conventions

| Convention | Rule |
|---|---|
| **Module system** | ES Modules everywhere. No CommonJS. |
| **Path aliases** | `@app`, `@engine`, `@ui`, `@shared` (configured in `vite.config.js`) |
| **Language** | Comments inside JS files are written in **Croatian/Bosnian**. All docs and AI context files are in **English**. |
| **TypeScript** | None. Pure vanilla JS throughout. |
| **Async** | `async/await` for all asynchronous operations |
| **GSAP** | Treated as optional peer dependency. Always accessed as `window.gsap \|\| null`. Never imported via npm. Loaded via CDN `<script>` in `index.html`. |
| **GPU cleanup** | Every `dispose()` must call `disposeObject3D(obj)` which traverses the Object3D tree and calls `.dispose()` on all geometries, materials, and textures. |
| **State** | No global state store. Each module owns its own closure-scoped state. Cross-module communication via custom `window.dispatchEvent` / `window.addEventListener`. |
| **DOM** | Direct DOM manipulation. No virtual DOM. Element references grabbed once at module init. |
| **Canvas visibility** | Canvas starts as `visibility: hidden; opacity: 0`. Fades in only after model is fully loaded and first frame rendered. |

---

## 7. Backend API Reference

Base URL: `http://localhost:3001` (dev) / `https://ship-engine.onrender.com` (prod)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check. Returns `{ ok: true, service: "engine-components-api" }` |
| `GET` | `/api/components` | Returns all entries from `components.json` as a JSON object |
| `GET` | `/api/components/resolve?key=<k>&candidate=<c>` | Fuzzy-find a component. `key` is the primary path key; `candidate` params are fallback names. Returns the component data or a default stub if not found. |
| `GET` | `/api/components/:key` | Get one component by exact key (URL-encoded). Returns default stub if not found. |
| `PUT` | `/api/components/:key` | Upsert component. Body: `{ title, description, documents: { documentation, schematics, maintenance } }` |
| `POST` | `/api/upload/document` | Upload a PDF. Multipart form field: `file`. Max size: 25 MB. Returns `{ success, filename, url }` |
| `DELETE` | `/api/components/:key` | Delete a component entry. Returns 404 if key not found. |
| `GET` | `/docs/components/:filename` | Serve an uploaded PDF file (static middleware) |

**`components.json` record schema:**
```json
{
  "path:Scene/FULL/1_Structure/11_Floor/113_Engine_Room_Base/Object_5_3": {
    "title": "Transverse foundation girder",
    "description": "Transverse bracing element providing lateral stiffness and structural integrity to the machinery bed.",
    "documents": {
      "documentation": "/docs/components/1780433957970-c32_1000_hp_specifications.pdf",
      "schematics": null,
      "maintenance": null
    },
    "updatedAt": "2026-06-03T09:02:34.043Z"
  }
}
```

**`normalizeKey()` logic in `server.js`:** Strips diacritics (NFD decomposition), lowercases,
replaces `_`, `-`, `.`, `/`, `\` with spaces, removes non-word characters, collapses whitespace.
Used to fuzzy-match Croatian/English component names against stored keys.

---

## 8. Known Gotchas & Edge Cases

- **DRACO decoder must be local.** `DRACOLoader.setDecoderPath()` points to `/public/draco/gltf/`. Removing or CDN-ifying these files will break GLB loading silently.
- **Two API origins.** Auth API (`VITE_API_BASE_URL` in `.env`) and Components API (`config/api.js`) are intentionally separate and may point to different servers. Do not conflate them.
- **`.env` is not committed.** Contains VPS IP. If missing, auth will fail. Components API is unaffected.
- **`config/api.js` uses `import.meta.env.PROD`** for automatic dev/prod switch. This only works when built/served by Vite. Do not use this file in Node.js backend code.
- **Backend has no auth on `/api/components`.** All CRUD endpoints are open. JWT middleware does not exist yet on the components API — it's a known TODO.
- **`components.json` is auto-created** by `fs.mkdirSync` + `writeDb` if it doesn't exist. Backend is safe to start with an empty `data/` directory.
- **PDF files are named `{Date.now()}-{sanitized_original_name}.pdf`.** `safeFileName()` strips spaces and special chars. The timestamp prefix ensures uniqueness.
- **`tree.js` modifies `userData` in place** on the loaded Object3D graph. Any code that reads `obj.userData.path` or `obj.userData.sidebarGroup` depends on `buildEngineTree()` having been called first.
- **GSAP is optional everywhere.** Every code path that uses GSAP has a fallback (manual RAF + lerp or instant camera set). If `window.gsap` is undefined, animations still work — just less smooth.
- **`MODEL_REGISTRY` dynamic import** is the extension point for adding new models. Only `'engine'` is registered currently. The architecture supports multiple models switchable via the `<select id="modelPicker">` dropdown.
- **Emergency lighting** is a feature in `engine.model.js` — toggles emissive warning colors on specific mesh groups to simulate an alarm state. Not yet exposed in the main UI.
- **`ws.max_row` / large files:** Not applicable here, but GLB file is 14 MB. On slow connections the preloader must remain visible until `hidePreloader()` is explicitly called after the first frame renders.
- **`import.meta.env.VITE_*` vars** are statically replaced by Vite at build time. They are not available at runtime in the Express backend. The backend reads no env vars except `process.env.PORT`.

---

## 9. Quick Reference — Custom Window Events

These events are dispatched on `window` for cross-module communication:

| Event name | Dispatched by | Payload | Consumed by |
|---|---|---|---|
| `engine:system-selected` | `engine.model.js` (on sidebar system click) | `{ exploded: Boolean }` | `app.entry.js` → updates explode button label |
| `engine:system-cleared` | `engine.model.js` (on system deselect / reset) | none | `app.entry.js` → resets explode button to global mode |
| `engine:explode-reset` | `engine.model.js` (on reset controller) | none | `app.entry.js` → resets explode state flags |

---

## 10. Roadmap / Known TODOs

- Add JWT middleware to `/api/components` endpoints (currently open CRUD)
- Migrate `components.json` flat file to SQLite or PostgreSQL
- Add more 3D models — follow the Model Module Contract and register in `MODEL_REGISTRY`
- Add 3D annotation billboards directly on mesh surfaces
- TypeScript migration — recommended start: `viewer.core.js` then `engine.model.js`
- Vite static build + deployment pipeline (currently dev-server only in production equivalent)
- Consider bundling GSAP as a proper npm dep instead of CDN script to avoid optional-access boilerplate
