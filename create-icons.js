const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createSVGIcon = (size) => {
  const padding = size * 0.1;
  const innerSize = size - (padding * 2);
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6" rx="4"/>
  <text x="${size/2}" y="${size/2 + innerSize/4}" font-family="Arial, sans-serif" font-size="${innerSize * 0.6}" fill="white" text-anchor="middle" dominant-baseline="middle">F</text>
</svg>`;
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Generate icons for different sizes
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filePath = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`Created icon: ${filePath}`);
});

console.log('\nIcons created successfully!');
console.log('Note: These are SVG placeholders. For production, convert to PNG format.'); 