// JSON ⇄ gzip bytes with the Web Compression Streams API (Workers and Node 18+). Static files in R2 are gzip bytes
// with contentEncoding "gzip" (scripts/static_export/CONTRACT.md); R2 get() returns the stored bytes as they are.

const GZIP_MAGIC = [0x1f, 0x8b];

async function pipeBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function isGzip(bytes) {
  return bytes.length > 1 && bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1];
}

export async function readJsonBytes(bytes) {
  const raw = isGzip(bytes) ? await pipeBytes(bytes, new DecompressionStream("gzip")) : bytes;
  return JSON.parse(new TextDecoder("utf-8").decode(raw));
}

export async function gzipJson(obj) {
  return pipeBytes(new TextEncoder().encode(JSON.stringify(obj)), new CompressionStream("gzip"));
}
