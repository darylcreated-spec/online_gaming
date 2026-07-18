const jimpModule = require('jimp');
const Jimp = jimpModule.Jimp || jimpModule;

async function main() {
  const source = "C:\\Users\\daryl\\.gemini\\antigravity\\brain\\cac4e0a8-9fc3-4766-9ffe-e705db3f52c9\\media__1784399254981.jpg";
  
  console.log("Reading source image:", source);
  const image = await Jimp.read(source);
  
  const saveImage = async (img, dest) => {
    if (typeof img.writeAsync === 'function') {
      await img.writeAsync(dest);
    } else {
      await img.write(dest);
    }
  };

  console.log("Resizing to 512x512...");
  const img512 = image.clone().resize({ w: 512, h: 512 });
  await saveImage(img512, "c:\\Online Results\\public\\images\\pwa-icon.png");
  await saveImage(img512, "c:\\Online Results\\public\\images\\pwa-icon-512.png");
  console.log("Saved 512x512 icons.");

  console.log("Resizing to 192x192...");
  const img192 = image.clone().resize({ w: 192, h: 192 });
  await saveImage(img192, "c:\\Online Results\\public\\images\\pwa-icon-192.png");
  console.log("Saved 192x192 icon.");
  
  console.log("Image conversion complete!");
}

main().catch(console.error);
