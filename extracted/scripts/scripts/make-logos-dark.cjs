const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_DIR = '/home/z/my-project/public/logos';
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

// Use the ORIGINAL uploaded logo images (839=HEAVIX, 634=MEKANIX)
const sources = [
  { src: '/home/z/my-project/upload/IMG_20260921_134636_839.jpg', name: 'heavix-logo' },
  { src: '/home/z/my-project/upload/IMG_20260921_134636_634.jpg', name: 'mekanix-logo' },
];

(async () => {
  for (const { src, name } of sources) {
    if (!fs.existsSync(src)) { console.log('skip', src); continue; }
    const img = sharp(src);
    const meta = await img.metadata();
    console.log(`${name}: ${meta.width}x${meta.height} from ${path.basename(src)}`);

    // Process: make white background transparent, convert black pixels to white
    // (so visible on dark bg), preserve orange pixels as-is.
    const { data, info } = await img.ensureAlpha(0).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i], g = data[i+1], b = data[i+2];
      // Detect orange: high R, medium G, low B
      const isOrange = r > 150 && g > 60 && g < 180 && b < 100;
      // Detect white background: all channels high
      const isWhite = r > 225 && g > 225 && b > 225;
      // Detect black/dark: all channels low
      const isDark = r < 80 && g < 80 && b < 80;

      if (isWhite) {
        // White background → transparent
        data[i+3] = 0;
      } else if (isOrange) {
        // Orange (diamond) → keep orange, fully opaque
        data[i] = 245; data[i+1] = 130; data[i+2] = 32; data[i+3] = 255;
      } else if (isDark) {
        // Black text/icon → convert to WHITE (for dark bg visibility)
        data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255;
      } else {
        // Other pixels (anti-aliasing, gray) → make opaque
        data[i+3] = 255;
        // Lighten dark-ish pixels toward white
        const brightness = (r + g + b) / 3;
        if (brightness < 128) {
          data[i] = 255; data[i+1] = 255; data[i+2] = 255;
        }
      }
    }

    const outPath = path.join(LOGO_DIR, `${name}.png`);
    await sharp(data, { raw: { width: info.width, height: info.height, channels } })
      .png().toFile(outPath);
    console.log(`✓ ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  }
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
