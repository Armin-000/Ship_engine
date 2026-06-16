import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const COMPONENTS_PATH = path.join(
  ROOT,
  "backend",
  "data",
  "components.json"
);

function makeSfiaIdFromKey(key) {
  const lastPart = String(key)
    .replace(/^path:Scene\/FULL\//, "")
    .split("/")
    .pop();

  return (
    "SFIA_" +
    lastPart
      .replace(/^(\d+)/, (digits) => digits.split("").join("_"))
      .replace(/No(\d+)/gi, "No_$1")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toUpperCase()
  );
}

const components = JSON.parse(
  fs.readFileSync(COMPONENTS_PATH, "utf8")
);

let added = 0;

for (const [key, component] of Object.entries(components)) {

  if (!component || typeof component !== "object") continue;

  // preskoči ako već postoji
//  if (component.sfiaId) continue;

  component.sfiaId = makeSfiaIdFromKey(key);

  added++;
}

fs.writeFileSync(
  COMPONENTS_PATH,
  JSON.stringify(components, null, 2),
  "utf8"
);

console.log("Done.");
console.log(`Added sfiaId to ${added} components.`);
console.log(`Updated: ${COMPONENTS_PATH}`);