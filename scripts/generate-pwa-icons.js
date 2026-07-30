import fs from 'fs';
import path from 'path';

// Create SVG content for Student Result Extractor logo
const svgContent = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#4f46e5" />
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#3730a3" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#grad)" />
  <!-- Academic Cap & Graduation Chart Icon -->
  <g transform="translate(${size * 0.15}, ${size * 0.15}) scale(${size / 240})">
    <!-- Graduation Cap -->
    <path d="M120 30 L210 75 L120 120 L30 75 Z" fill="#ffffff" opacity="0.95"/>
    <path d="M210 75 L210 135 L195 135 L195 82.5 Z" fill="#e0e7ff"/>
    <path d="M60 90 L60 150 C60 175 180 175 180 150 L180 90" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/>
    <!-- Analytics Chart Bars -->
    <rect x="75" y="125" width="20" height="35" rx="4" fill="#38bdf8"/>
    <rect x="110" y="105" width="20" height="55" rx="4" fill="#818cf8"/>
    <rect x="145" y="85" width="20" height="75" rx="4" fill="#4ade80"/>
  </g>
</svg>`;

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-icon.svg'), svgContent(512));
console.log('PWA SVG icon created successfully');
