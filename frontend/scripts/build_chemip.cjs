// /chemip 운영용 빌드: 브라우저가 열 때마다 하던 JSX 번역을 배포 전에 한 번만 한다.
//
//   입력  public/chemip/index.html   (원본. <script type="text/babel"> 순서가 곧 로드 순서)
//   출력  public/chemip/dist/index.html          (운영용 화면. next.config 가 /chemip 을 여기로 보낸다)
//         public/chemip/dist/app.js?v=<hash>     (번역된 화면 코드 묶음)
//
// 파일 이름을 고정하고 내용 해시는 ?v= 로 붙인다. next start 는 시작할 때 본 정적 파일만 내주므로
// 이름이 매번 바뀌면 빌드마다 재시작해야 한다. 이름이 같으면 빌드만 다시 돌려도 바로 반영된다.
//
// 번역 설정은 브라우저용 @babel/standalone 이 <script type="text/babel"> 에 쓰는 기본값과 같다
// (presets react+env, plugins class-properties·object-rest-spread·flow-strip-types). 같은 vendor/babel.min.js 를 쓴다.
// 그래서 원본 index.html 을 직접 열어도(개발용) 운영용과 같은 결과가 나온다.
//
// 실행: node scripts/build_chemip.cjs   (npm run build 가 next build 전에 부른다)
//       node scripts/build_chemip.cjs --out <폴더>   (같은 빌드를 다른 폴더에. 운영 dist 를 건드리지 않는다.
//                                                   Cloudflare Pages 배포가 쓴다: deploy/cloudflare/README.md)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "public", "chemip");
const SRC_HTML = path.join(ROOT, "index.html");
// --out 이 없으면 지금처럼 public/chemip/dist 에 쓴다.
function outDirFromArgs(argv) {
  const i = argv.indexOf("--out");
  if (i === -1) return path.join(ROOT, "dist");
  const dir = argv[i + 1];
  if (!dir || dir.startsWith("--")) throw new Error("--out 다음에 폴더를 적어 주세요");
  return path.resolve(dir);
}
const OUT_DIR = outDirFromArgs(process.argv.slice(2));

// 개발용 라이브러리 → 운영용 라이브러리. 원본 index.html 의 src 와 정확히 같아야 한다.
const VENDOR_SWAP = {
  "vendor/react.development.js": "vendor/react.production.min.js",
  "vendor/react-dom.development.js": "vendor/react-dom.production.min.js",
};
const BABEL_SRC = "vendor/babel.min.js";
const BUNDLE_NAME = "app.js";

const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};

const BABEL_TAG = /<script type="text\/babel" src="([^"?]+)(?:\?[^"]*)?"><\/script>\s*/g;

function babelScripts(html) {
  return [...html.matchAll(BABEL_TAG)].map(m => m[1]);
}

function transpile(Babel, rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
  try {
    return Babel.transform(code, { ...BABEL_OPTIONS, filename: rel }).code;
  } catch (err) {
    throw new Error(`번역 실패: ${rel}\n${err.message}`);
  }
}

function bundle(Babel, files) {
  // 파일마다 경계 주석을 남겨 오류 위치를 찾기 쉽게 한다.
  return files.map(rel => `/* ── ${rel} ── */\n${transpile(Babel, rel)}\n;`).join("\n");
}

function swapVendor(html) {
  let out = html;
  for (const [dev, prod] of Object.entries(VENDOR_SWAP)) {
    if (!out.includes(`src="${dev}"`)) throw new Error(`index.html 에 ${dev} 가 없습니다`);
    // 개발용 파일의 integrity 값은 운영용과 다르므로 태그를 통째로 바꾼다.
    out = out.replace(new RegExp(`<script src="${dev}"[^>]*></script>`), `<script src="${prod}"></script>`);
  }
  return out.replace(new RegExp(`<script src="${BABEL_SRC}"[^>]*></script>\\s*`), "");
}

function writeBundle(js) {
  const hash = crypto.createHash("sha256").update(js).digest("hex").slice(0, 12);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, BUNDLE_NAME), js);
  return `${BUNDLE_NAME}?v=${hash}`;
}

function main() {
  const Babel = require(path.join(ROOT, BABEL_SRC));
  const html = fs.readFileSync(SRC_HTML, "utf8");
  const files = babelScripts(html);
  if (files.length === 0) throw new Error("index.html 에 text/babel 스크립트가 없습니다");

  const name = writeBundle(bundle(Babel, files));
  let first = true;
  const outHtml = swapVendor(html).replace(BABEL_TAG, () => {
    if (!first) return "";
    first = false;
    return `<script src="dist/${name}"></script>\n`;
  });
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), outHtml);

  const kb = (fs.statSync(path.join(OUT_DIR, BUNDLE_NAME)).size / 1024).toFixed(0);
  console.log(`chemip build: ${files.length} files → ${OUT_DIR} (dist/${name}, ${kb} KB)`);
}

main();
