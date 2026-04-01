/**
 * Manual patch bump only: e.g. 1.2.1 -> 1.2.2
 * Syncs manifest.json, package.json, and SafariExtension/Resources/manifest.json if present.
 * Run: npm run bump:patch
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const manifestPath = path.join(root, 'manifest.json');
const packagePath = path.join(root, 'package.json');
const safariManifestPath = path.join(root, 'SafariExtension', 'Resources', 'manifest.json');

function bumpPatch(versionString) {
  const parts = versionString.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) {
    parts.push(0);
  }
  parts[2] += 1;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const next = bumpPatch(manifest.version);
manifest.version = next;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json → ${next}`);

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.version = next;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`package.json → ${next}`);

if (fs.existsSync(safariManifestPath)) {
  const safari = JSON.parse(fs.readFileSync(safariManifestPath, 'utf8'));
  safari.version = next;
  fs.writeFileSync(safariManifestPath, JSON.stringify(safari, null, 2) + '\n');
  console.log(`SafariExtension/Resources/manifest.json → ${next}`);
}

console.log(`\nBumped to ${next} (run npm run build when ready)`);
