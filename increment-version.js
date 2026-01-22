const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'manifest.json');

// Read manifest.json
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Parse version (e.g., "1.0.4" -> [1, 0, 4])
const versionParts = manifest.version.split('.').map(Number);

// Increment the middle part (minor version)
versionParts[1] = (versionParts[1] || 0) + 1;

// Reconstruct version string
manifest.version = versionParts.join('.');

// Write back to manifest.json
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Version incremented to: ${manifest.version}`);
