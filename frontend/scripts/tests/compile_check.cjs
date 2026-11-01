// Compile check for the no-build chemip screen — WITHOUT writing dist/ (build_chemip.cjs writes the live bundle).
// 1) every .jsx under public/chemip (except vendor/, dist/) is transpiled with the vendored Babel and the same
//    options as scripts/build_chemip.cjs (presets react+env, plugins class-properties·object-rest-spread·flow-strip-types)
// 2) every .jsx is listed exactly once in index.html as <script type="text/babel">, and every listed file exists
// 3) no top-level name (function / const / let / class) is declared in two files — in the bundle they share one scope
//
//   node frontend/scripts/tests/compile_check.cjs [--root DIR]
"use strict";

const fs = require("fs");
const path = require("path");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const ROOT = path.resolve(arg("--root", path.join(__dirname, "..", "..", "public", "chemip")));
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const BABEL_TAG = /<script type="text\/babel" src="([^"?]+)(?:\?[^"]*)?"><\/script>/g;

function listJsx(dir, rel = "") {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    // _legacy*/ holds the pre-split originals (not loaded by index.html)
    if (e.isDirectory()) { if (!["vendor", "dist", "data"].includes(e.name) && !e.name.startsWith("_legacy")) out.push(...listJsx(dir, r)); }
    else if (e.name.endsWith(".jsx")) out.push(r);
  }
  return out.sort();
}

function topLevelNames(ast) {
  const names = [];
  for (const node of ast.program.body) {
    if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && node.id) names.push(node.id.name);
    if (node.type === "VariableDeclaration") {
      for (const d of node.declarations) if (d.id.type === "Identifier") names.push(d.id.name);
    }
  }
  return names;
}

function main() {
  const Babel = require(path.join(ROOT, "vendor", "babel.min.js"));
  const files = listJsx(ROOT);
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const listed = [...html.matchAll(BABEL_TAG)].map(m => m[1]);
  const problems = [];
  let bytes = 0;

  const owner = {};
  for (const rel of files) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    try {
      bytes += Babel.transform(code, { ...BABEL_OPTIONS, filename: rel }).code.length;
      // names from the untranspiled module (JSX only), so the declarations are the author's own
      const { ast } = Babel.transform(code, { presets: ["react"], filename: rel, ast: true, code: false });
      for (const n of topLevelNames(ast)) {
        if (owner[n]) problems.push(`duplicate top-level name "${n}": ${owner[n]} and ${rel}`);
        else owner[n] = rel;
      }
    } catch (e) {
      problems.push(`compile error: ${rel}\n  ${String(e.message).split("\n")[0]}`);
    }
  }

  const seen = new Set();
  for (const rel of listed) {
    if (seen.has(rel)) problems.push(`listed twice in index.html: ${rel}`);
    seen.add(rel);
    if (!fs.existsSync(path.join(ROOT, rel))) problems.push(`listed in index.html but missing: ${rel}`);
  }
  for (const rel of files) if (!seen.has(rel)) problems.push(`not listed in index.html: ${rel}`);

  console.log(`compiled ${files.length} jsx files (${(bytes / 1024).toFixed(0)} KB output), index.html lists ${listed.length}, top-level names ${Object.keys(owner).length}`);
  if (problems.length) {
    console.log(problems.map(p => `FAIL ${p}`).join("\n"));
    process.exitCode = 1;
  } else console.log("PASS compile + index.html listing + unique top-level names");
}

main();
