const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_DIR = '/home/z/my-project/public/logos';
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

// User uploaded these 4 logos (839=HEAVIX clean, 634=MEKANIX clean, 703=HEAVIX guide, 663=MEKANIX guide)
// Process the CLEAN single-logo images: 839 (HEAVIX) + 634 (MEKANIX)
const sources = [
  { src: '/home/z/my-project/upload/IMG_20260921_134636_839.jpg', name: 'heavix-logo-official' },
  { src: '/home/z/my-project/upload/IMG_20260921_134636_634.jpg', name: 'mekanix-logo-official' },
];

(async () => {
  for (const { src, name } of sources) {
    if (!fs.existsSync(src)) { console.log('skip', src); continue; }
    const img = sharp(src);
    const meta = await img.metadata();
    console.log(`${name}: ${meta.width}x${meta.height} from ${path.basename(src)}`);

    // Process: make near-white pixels transparent (the background is white).
    // Keep everything else (black text/icon + orange IX/diamond) as-is.
    const { data, info } = await img.ensureAlpha(0).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i], g = data[i+1], b = data[i+2];
      // White background → transparent
      if (r > 225 && g > 225 && b > 225) {
        data[i+3] = 0;
      } else {
        // Non-white pixel → make it visible
        data[i+3] = 255;
        // Convert dark/near-black pixels to WHITE (for dark backgrounds)
        // Keep orange pixels orange
        const isOrange = r > 150 && g > 60 && g < 180 && b < 100;
        if (!isOrange && r < 80 && g < 80 && b < 80) {
          // Black → White
          data[i] = 255; data[i+1] = 255; data[i+2] = 255;
        }
      }
    }

    // Save transparent PNG (black→white, orange preserved, bg transparent)
    await sharp(data, { raw: { width: info.width, height: info.height, channels } })
      .png().toFile(path.join(LOGO_DIR, `${name}.png`));
    console.log(`✓ ${name}.png (transparent, white+orange)`);
  }
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
