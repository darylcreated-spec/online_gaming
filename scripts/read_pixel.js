const jimpModule = require('jimp');
const Jimp = jimpModule.Jimp || jimpModule;

async function main() {
  const source = "c:\\Online Results\\public\\images\\pwa-icon.png";
  const image = await Jimp.read(source);
  
  // Read pixel color at (0, 0)
  const color = image.getPixelColor(0, 0); // returns 0xRRGGBBAA
  const hex = color.toString(16).padStart(8, '0');
  
  console.log("Top-left pixel hex value (RGBA):", hex);
  console.log("RGB color code (for background):", `#${hex.substring(0, 6)}`);
}

main().catch(console.error);
