const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let isBuilding = false;
let buildTimeout = null;

// Files/directories to watch
const watchPaths = [
  'src',
  'manifest.json',
  'popup.html'
];

// Files to copy after build
const filesToCopy = [
  'manifest.json',
  'popup.html',
  'icon*.png'
];

const dirsToCopy = [
  'src/popup/*.svg',
  'src/popup/assets'
];

function copyFiles() {
  return new Promise((resolve, reject) => {
    const commands = [
      // Copy manifest.json and popup.html
      `cp manifest.json popup.html dist/ 2>/dev/null || true`,
      // Copy icons
      `cp icon*.png dist/ 2>/dev/null || true`,
      // Copy SVG files
      `cp src/popup/*.svg dist/ 2>/dev/null || true`,
      // Copy assets directory
      `cp -r src/popup/assets dist/ 2>/dev/null || true`
    ];

    exec(commands.join(' && '), (error) => {
      if (error) {
        console.warn('[Watch] Warning copying files:', error.message);
      }
      resolve();
    });
  });
}

function build() {
  if (isBuilding) {
    console.log('[Watch] Build already in progress, skipping...');
    return;
  }

  isBuilding = true;
  console.log('[Watch] 🔨 Building...');

  // Always increment version, compile TS, run webpack
  const buildSteps = 'node increment-version.js && tsc && webpack --mode production';

  exec(buildSteps, (error) => {
    if (error) {
      console.error('[Watch] ❌ Build failed:', error.message);
      isBuilding = false;
      return;
    }

    // Copy files
    copyFiles().then(() => {
      console.log('[Watch] ✅ Build complete!');
      isBuilding = false;
    });
  });
}

function debouncedBuild() {
  if (buildTimeout) {
    clearTimeout(buildTimeout);
  }

  buildTimeout = setTimeout(() => {
    build();
  }, 500); // Wait 500ms after last change
}

console.log('[Watch] 👀 Watching for changes...');
console.log('[Watch] Press Ctrl+C to stop\n');

// Initial build
build();

// Watch for changes
watchPaths.forEach(watchPath => {
  try {
    const fullPath = path.resolve(watchPath);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
        if (filename && !filename.includes('node_modules') && !filename.includes('.git')) {
          console.log(`[Watch] 📝 ${eventType}: ${filename}`);
          debouncedBuild();
        }
      });
    } else if (stats.isFile()) {
      fs.watch(fullPath, (eventType, filename) => {
        console.log(`[Watch] 📝 ${eventType}: ${filename || watchPath}`);
        debouncedBuild();
      });
    }
  } catch (e) {
    console.warn(`[Watch] Could not watch ${watchPath}:`, e.message);
  }
});

// Also watch manifest.json and popup.html directly
['manifest.json', 'popup.html'].forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.watch(file, (eventType) => {
        console.log(`[Watch] 📝 ${eventType}: ${file}`);
        debouncedBuild();
      });
    }
  } catch (e) {
    // File might not exist yet
  }
});
