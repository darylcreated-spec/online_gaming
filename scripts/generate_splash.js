const fs = require('fs');
const path = require('path');
const jimpModule = require('jimp');
const Jimp = jimpModule.Jimp || jimpModule;

async function generateSplash() {
  const logoPath = path.join(__dirname, "../public/images/pwa-icon-512.png");
  const outputDir = path.join(__dirname, "../public/images/splash");

  console.log("[Splash Generator] Starting splash generation...");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read logo
  if (!fs.existsSync(logoPath)) {
    console.error(`[Error] Logo icon file not found at: ${logoPath}`);
    process.exit(1);
  }

  const logo = await Jimp.read(logoPath);
  console.log("[Splash Generator] Loaded PWA 512x512 icon.");

  const saveImage = async (img, dest) => {
    if (typeof img.writeAsync === 'function') {
      await img.writeAsync(dest);
    } else {
      await img.write(dest);
    }
  };

  // Configurations: [width, height, destination]
  const configs = [
    { w: 2048, h: 2732, dest: path.join(__dirname, "../public/images/apple-splash.png") }, // Universal fallback
    { w: 2048, h: 2732, dest: path.join(outputDir, "apple-splash-2048-2732.png") },       // iPad Pro 12.9
    { w: 1179, h: 2556, dest: path.join(outputDir, "apple-splash-1179-2556.png") },       // iPhone 15 Pro / 14 Pro
    { w: 1290, h: 2796, dest: path.join(outputDir, "apple-splash-1290-2796.png") }        // iPhone 15 Pro Max
  ];

  for (const config of configs) {
    console.log(`[Splash Generator] Generating ${config.w}x${config.h} splash...`);
    
    // Create new blank image with background #02326e (RGBA hex: 0x02326eff)
    const canvas = new Jimp({ width: config.w, height: config.h, color: 0x02326eff });
    
    // Scale logo dynamically to fit nicely in center (e.g. 25% of smaller dimension, min 192px, max 512px)
    const minDim = Math.min(config.w, config.h);
    let logoSize = Math.floor(minDim * 0.28);
    if (logoSize < 192) logoSize = 192;
    if (logoSize > 512) logoSize = 512;

    const scaledLogo = logo.clone().resize({ w: logoSize, h: logoSize });
    
    const x = Math.floor((config.w - logoSize) / 2);
    const y = Math.floor((config.h - logoSize) / 2);
    
    canvas.composite(scaledLogo, x, y);
    await saveImage(canvas, config.dest);
    console.log(`[Success] Saved: ${config.dest}`);
  }

  console.log("[Splash Generator] All splash screen assets completed!");
}

generateSplash().catch(console.error);
