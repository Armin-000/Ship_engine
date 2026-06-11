import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

// Omogućava korištenje __dirname u ES module načinu rada
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Osnovne postavke servera
const app = express();
const PORT = process.env.PORT || 3001;

// Putanje za JSON podatke i PDF dokumente
const DATA_FILE = path.join(__dirname, "data", "components.json");
const DOCS_DIR = path.join(__dirname, "..", "public", "docs", "components");

// Middleware za CORS i JSON podatke
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Kreira potrebne direktorije ako ne postoje
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

// Omogućava pristup spremljenim PDF dokumentima
app.use("/docs/components", express.static(DOCS_DIR));

// Učitava podatke iz JSON baze
function readDb() {
  if (!fs.existsSync(DATA_FILE)) return {};

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// Sprema podatke u JSON bazu
function writeDb(db) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// Uređuje ključ kako bi se lakše uspoređivao
function normalizeKey(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-./\\]+/g, " ")
    .replace(/[^\w\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Iz putanje komponente izvlači čitljiv naziv
function titleFromKey(key = "") {
  return (
    String(key || "Component")
      .replace(/^path:/, "")
      .replace(/^name:/, "")
      .replace(/^uuid:/, "")
      .split("/")
      .pop()
      .replace(/_/g, " ")
      .trim() || "Component"
  );
}

// Traži komponentu po ključu ili alternativnim nazivima
function findComponent(db, key, candidates = []) {
  const allCandidates = [key, ...candidates].filter(Boolean);
  const directKey = allCandidates.find((candidate) => db[candidate]);

  if (directKey) {
    return {
      key: directKey,
      component: db[directKey],
    };
  }

  const normalizedCandidates = allCandidates.map(normalizeKey);

  for (const [dbKey, component] of Object.entries(db)) {
    const normalizedDbKey = normalizeKey(dbKey);

    if (normalizedCandidates.includes(normalizedDbKey)) {
      return {
        key: dbKey,
        component,
      };
    }
  }

  return null;
}

// Vraća zadane podatke ako komponenta još nije spremljena
function makeDefaultComponent(key) {
  return {
    key,
    title: titleFromKey(key),
    description: "No description available for this component yet.",
    documents: {
      documentation: null,
      schematics: null,
      maintenance: null,
    },
    source: "default",
  };
}

// Čisti naziv datoteke prije spremanja
function safeFileName(name = "") {
  return String(name || "document.pdf")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

// Postavke za spremanje uploadanih PDF dokumenata
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCS_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = safeFileName(file.originalname);
    cb(null, `${Date.now()}-${safeName}`);
  },
});

// Upload dopušta samo PDF datoteke do 25 MB
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }

    cb(null, true);
  },
});

// Provjera radi li API
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "engine-components-api",
  });
});

// Dohvaća sve spremljene komponente
app.get("/api/components", (req, res) => {
  const db = readDb();
  res.json(db);
});

// Pronalazi komponentu prema putanji iz modela
app.get("/api/components/resolve", (req, res) => {
  const db = readDb();

  const key = req.query.key || "";
  const candidates = req.query.candidate
    ? Array.isArray(req.query.candidate)
      ? req.query.candidate
      : [req.query.candidate]
    : [];

  const found = findComponent(db, key, candidates);

  if (found) {
    return res.json({
      key: found.key,
      ...found.component,
      source: "api",
    });
  }

  return res.json(makeDefaultComponent(key));
});

// Dohvaća jednu komponentu prema ključu
app.get("/api/components/:key", (req, res) => {
  const db = readDb();
  const key = decodeURIComponent(req.params.key);

  const found = findComponent(db, key);

  if (!found) {
    return res.json(makeDefaultComponent(key));
  }

  res.json({
    key: found.key,
    ...found.component,
    source: "api",
  });
});

// Sprema ili ažurira podatke o komponenti
app.put("/api/components/:key", (req, res) => {
  const db = readDb();
  const key = decodeURIComponent(req.params.key);
  const body = req.body || {};

  const component = {
    title: body.title || titleFromKey(key),
    description: body.description || "No description available.",
    documents: {
      documentation: body.documents?.documentation || null,
      schematics: body.documents?.schematics || null,
      maintenance: body.documents?.maintenance || null,
    },
    updatedAt: new Date().toISOString(),
  };

  db[key] = component;
  writeDb(db);

  res.json({
    success: true,
    key,
    component,
  });
});

// Upload PDF dokumenta za komponentu
app.post("/api/upload/document", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "No file uploaded",
    });
  }

  res.json({
    success: true,
    filename: req.file.filename,
    url: `/docs/components/${req.file.filename}`,
  });
});

// Briše komponentu iz JSON baze
app.delete("/api/components/:key", (req, res) => {
  const db = readDb();
  const key = decodeURIComponent(req.params.key);

  if (!db[key]) {
    return res.status(404).json({
      error: "Component not found",
      key,
    });
  }

  delete db[key];
  writeDb(db);

  res.json({
    success: true,
    key,
  });
});

// Osnovna obrada grešaka
app.use((err, req, res, next) => {
  res.status(400).json({
    error: err.message || "Server error",
  });
});

// Pokretanje API servera
app.listen(PORT, () => {
  console.log(`Engine Components API running on http://localhost:${PORT}`);
});




/*
=========================================================
SMECO 2.0 - API NOTES
=========================================================

HTTP metode korištene u projektu:

GET
- Dohvaća podatke iz API-ja
- Primjer: dohvat komponenti i njihovih podataka

POST
- Šalje nove podatke na server
- Koristi se za upload PDF dokumenata

PUT
- Sprema ili ažurira postojeće podatke
- Koristi se za uređivanje naslova, opisa i dokumenata

DELETE
- Briše podatke iz JSON baze
- Koristi se za uklanjanje komponenti

---------------------------------------------------------

Primjer zapisa u components.json:

{
  "path:Scene/FULL/1_Structure/11_Floor/113_Engine_Room_Base/Object_5_3": {

    "title": "Transverse foundation girder",

    "description":
      "Transverse bracing element providing lateral stiffness and structural integrity to the machinery bed.",

    "documents": {
      "documentation": null,
      "schematics": null,
      "maintenance": null
    },

    "updatedAt": "2026-06-03T09:02:34.043Z"
  }
}

Objašnjenje:

path
- Jedinstveni identifikator objekta unutar 3D modela

title
- Naziv komponente prikazan u info panelu

description
- Opis funkcije komponente

documents
- Povezani PDF dokumenti
- null znači da dokument nije dodan

updatedAt
- Vrijeme posljednje izmjene zapisa

Tok rada:

3D Model
    ↓
Klik na komponentu
    ↓
GET /api/components/resolve
    ↓
components.json
    ↓
API vraća title, description i PDF dokumente
    ↓
Prikaz u info panelu

=========================================================
*/
