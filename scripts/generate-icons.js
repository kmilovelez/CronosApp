/**
 * Genera íconos PWA para CronosApp
 * Ejecutar: node scripts/generate-icons.js
 * 
 * Crea íconos SVG que los navegadores aceptan como íconos PWA.
 * Para producción, reemplazar con íconos PNG reales.
 */
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function generateSVGIcon(size, padding = 0) {
    const p = Math.round(size * 0.12) + padding;
    const center = size / 2;
    const r = (size - p * 2) / 2;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#19191d"/>
      <stop offset="100%" stop-color="#2d2d35"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
  <!-- Clock circle -->
  <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#f02e65" stroke-width="${Math.max(2, Math.round(size * 0.04))}"/>
  <!-- Hour hand -->
  <line x1="${center}" y1="${center}" x2="${center}" y2="${center - r * 0.5}" stroke="#ffffff" stroke-width="${Math.max(2, Math.round(size * 0.035))}" stroke-linecap="round"/>
  <!-- Minute hand -->
  <line x1="${center}" y1="${center}" x2="${center + r * 0.35}" y2="${center - r * 0.35}" stroke="#ffffff" stroke-width="${Math.max(1.5, Math.round(size * 0.025))}" stroke-linecap="round"/>
  <!-- Center dot -->
  <circle cx="${center}" cy="${center}" r="${Math.max(2, Math.round(size * 0.03))}" fill="#f02e65"/>
  <!-- Hour marks -->
  ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
      const rad = (angle - 90) * Math.PI / 180;
      const x1 = center + (r - size * 0.04) * Math.cos(rad);
      const y1 = center + (r - size * 0.04) * Math.sin(rad);
      const x2 = center + (r - size * 0.1) * Math.cos(rad);
      const y2 = center + (r - size * 0.1) * Math.sin(rad);
      return `  <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#8a8a9a" stroke-width="${Math.max(1, Math.round(size * 0.015))}" stroke-linecap="round"/>`;
  }).join('\n')}
  <!-- "C" letter -->
  <text x="${center}" y="${size - p * 0.4}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="${Math.round(size * 0.12)}" fill="#f02e65" opacity="0.9">C</text>
</svg>`;
}

function generateMaskableIcon(size) {
    // Maskable icons need a "safe zone" — content within 80% inner circle
    return generateSVGIcon(size, Math.round(size * 0.05));
}

// Generate all icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
    const svg = generateSVGIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
    console.log(`✅ icon-${size}x${size}.svg`);
});

// Maskable icons
[192, 512].forEach(size => {
    const svg = generateMaskableIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}-maskable.svg`), svg);
    console.log(`✅ icon-${size}x${size}-maskable.svg (maskable)`);
});

// Apple touch icon (180x180)
const appleSvg = generateSVGIcon(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleSvg);
console.log('✅ apple-touch-icon.svg');

// Favicon
const faviconSvg = generateSVGIcon(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg);
console.log('✅ favicon.svg');

console.log(`\n🎉 Todos los íconos generados en: ${iconsDir}`);
