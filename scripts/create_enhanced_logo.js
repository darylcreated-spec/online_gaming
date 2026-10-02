const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function createEnhancedLogo() {
  const size = 512;
  const center = size / 2;
  const outerRadius = 236;
  const innerRadius = 212;

  // Create circular mask for the base logo so it fills the inner chamber seamlessly without square corners
  const circleMask = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="featherMask" cx="50%" cy="50%" r="50%">
          <stop offset="92%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="url(#featherMask)" />
    </svg>
  `);

  // Mask and resize base logo to fill the interior of the bezel
  const maskedLogo = await sharp('public/images/pwa-icon-512.png')
    .resize(size, size, { fit: 'cover' })
    .composite([
      {
        input: circleMask,
        blend: 'dest-in'
      }
    ])
    .toBuffer();

  // Create SVG overlay for 3D metallic chrome-gold bevel, cyber glowing rim, quantum orbital markings, and ambient flares
  const svgOverlay = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- High-Intensity Outer Neon Bloom Filter -->
        <filter id="neonBloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="24" result="blur2" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="36" result="blur3" />
          <feMerge>
            <feMergeNode in="blur3" />
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Specular Highlight Filter -->
        <filter id="specularGleam" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Metallic Chrome/Gold Rim Gradient with 3D Specular Light Angle -->
        <linearGradient id="metallicRing" x1="15%" y1="5%" x2="85%" y2="95%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1.0" />
          <stop offset="12%" stop-color="#38bdf8" stop-opacity="0.95" />
          <stop offset="35%" stop-color="#0284c7" stop-opacity="0.8" />
          <stop offset="48%" stop-color="#fbbf24" stop-opacity="1.0" />
          <stop offset="52%" stop-color="#f59e0b" stop-opacity="1.0" />
          <stop offset="70%" stop-color="#d97706" stop-opacity="0.9" />
          <stop offset="85%" stop-color="#0369a1" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#38bdf8" stop-opacity="1.0" />
        </linearGradient>

        <!-- Inner Bezel Groove Shadow -->
        <radialGradient id="innerGroove" cx="50%" cy="50%" r="50%">
          <stop offset="88%" stop-color="#020617" stop-opacity="0.0" />
          <stop offset="97%" stop-color="#020617" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.9" />
        </radialGradient>

        <!-- 45-degree Spherical Glass Specular Crescent (Illuminated 3D Convex Lens) -->
        <linearGradient id="glassSheen" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45" />
          <stop offset="25%" stop-color="#ffffff" stop-opacity="0.12" />
          <stop offset="48%" stop-color="#38bdf8" stop-opacity="0.0" />
          <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.12" />
        </linearGradient>

        <!-- Multi-Spectral Neon Aura Ring -->
        <linearGradient id="neonAura" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="30%" stop-color="#0284c7" />
          <stop offset="50%" stop-color="#fbbf24" />
          <stop offset="80%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#38bdf8" />
        </linearGradient>
      </defs>

      <!-- Outer Radiant Neon Bloom Halo -->
      <circle cx="${center}" cy="${center}" r="${outerRadius - 6}" fill="none" stroke="url(#neonAura)" stroke-width="14" opacity="0.65" filter="url(#neonBloom)" />

      <!-- Outer 3D Precision Beveled Rim (Heavy Chassis Bezel) -->
      <circle cx="${center}" cy="${center}" r="${outerRadius - 10}" fill="none" stroke="url(#metallicRing)" stroke-width="12" />
      
      <!-- Inner Dark Shadow Groove -->
      <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="none" stroke="#020617" stroke-width="4" opacity="0.9" />

      <!-- Stepped Precision Calibrated Tachymeter Markings -->
      <circle cx="${center}" cy="${center}" r="${innerRadius - 4}" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="12 6 3 6" opacity="0.85" />
      <circle cx="${center}" cy="${center}" r="${innerRadius - 10}" fill="none" stroke="#fbbf24" stroke-width="1" stroke-dasharray="2 10" opacity="0.6" />

      <!-- 4 Cardinal Quantum Light Nodes -->
      <circle cx="${center}" cy="${center - innerRadius + 4}" r="5" fill="#fbbf24" filter="url(#specularGleam)" />
      <circle cx="${center}" cy="${center + innerRadius - 4}" r="5" fill="#38bdf8" filter="url(#specularGleam)" />
      <circle cx="${center - innerRadius + 4}" cy="${center}" r="4.5" fill="#38bdf8" filter="url(#specularGleam)" />
      <circle cx="${center + innerRadius - 4}" cy="${center}" r="4.5" fill="#fbbf24" filter="url(#specularGleam)" />

      <!-- Upper 3D Glass Arc Specular Highlight -->
      <path d="M ${center - innerRadius + 28} ${center - 20} A ${innerRadius - 20} ${innerRadius - 20} 0 0 1 ${center + innerRadius - 28} ${center - 20} C ${center + 120} ${center - 110}, ${center - 120} ${center - 110}, ${center - innerRadius + 28} ${center - 20} Z" fill="url(#glassSheen)" opacity="0.55" />
      
      <!-- Subtle Bottom Ambient Reflected Light Arc -->
      <path d="M ${center - 120} ${center + innerRadius - 25} A ${innerRadius - 20} ${innerRadius - 20} 0 0 0 ${center + 120} ${center + innerRadius - 25} Z" fill="#38bdf8" opacity="0.25" filter="url(#specularGleam)" />
    </svg>
  `);

  // Final composite
  const finalImage = await sharp(maskedLogo)
    .composite([
      {
        input: svgOverlay,
        top: 0,
        left: 0,
        blend: 'over'
      }
    ])
    .png({ quality: 100 })
    .toFile('public/images/win_concept_logo_enhanced.png');

  console.log('Enhanced logo generated successfully:', finalImage);
}

createEnhancedLogo().catch(console.error);
