// Small file-system helpers (no dependencies): clean dir, copy, walk, write text.
import fs from "node:fs";
import path from "node:path";

export function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

export function copy(from, to, exclude = []) {
  const skip = new Set(exclude);
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => !path.relative(from, src).split(path.sep).some((part) => skip.has(part) || part.startsWith(".")),
  });
}

export function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

export function toPosix(rel) {
  return rel.split(path.sep).join("/");
}
