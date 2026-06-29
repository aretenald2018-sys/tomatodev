const baseArg = process.argv[2];
const markerArgs = process.argv.slice(3);

if (!baseArg || markerArgs.length === 0) {
  console.error('Usage: node scripts/verify-deployed-markers.mjs <base-url> <path::marker> [path::marker...]');
  process.exit(2);
}

const baseUrl = baseArg.endsWith('/') ? baseArg : `${baseArg}/`;

function toUrl(filePath) {
  return new URL(filePath.replace(/^\.\//, ''), baseUrl).toString();
}

function parseMarkerSpec(spec) {
  const raw = String(spec || '');
  const sep = raw.indexOf('::');
  if (sep <= 0) throw new Error(`invalid marker spec: ${raw}`);
  const filePath = raw.slice(0, sep).trim();
  const marker = raw.slice(sep + 2);
  if (!filePath || !marker) throw new Error(`invalid marker spec: ${raw}`);
  return { filePath, marker };
}

async function fetchText(filePath) {
  const res = await fetch(toUrl(filePath), { cache: 'no-store' });
  if (!res.ok) throw new Error(`${filePath} HTTP ${res.status}`);
  return res.text();
}

for (const arg of markerArgs) {
  const { filePath, marker } = parseMarkerSpec(arg);
  const text = await fetchText(filePath);
  if (!text.includes(marker)) {
    throw new Error(`${filePath} marker missing: ${marker}`);
  }
  console.log(`[marker-verify] ${filePath} ok: ${marker}`);
}
