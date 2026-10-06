// Measured build bytes, not browser timing or transferred HTTP bytes.
const fs = require('node:fs');
const zlib = require('node:zlib');
const manifest = JSON.parse(fs.readFileSync('.next/app-build-manifest.json', 'utf8'));
const results = {};
for (const [route, files] of Object.entries(manifest.pages)) {
  if (!route.endsWith('/page')) continue;
  const result = { requests: files.length, rawBytes: 0, gzipBytes: 0 };
  for (const file of files) {
    const bytes = fs.readFileSync('.next/' + file);
    result.rawBytes += bytes.length;
    result.gzipBytes += zlib.gzipSync(bytes).length;
  }
  results[route] = result;
}
fs.writeFileSync(process.argv[2] || 'docs/slow-network-after.json', JSON.stringify(results, null, 2) + '\n');
console.log(results);
