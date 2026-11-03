const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_DIR = '/home/z/my-project/public/logos';
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

// Use the CLEAN single-logo images
const sources = [
  { src: '/home/z/my-project/upload/IMG_20260921_134636_839.jpg', name: 'heavix-logo' },
  { src: '/home/z/my-project/upload/IMG_20260921_134636_663.jpg', name: 'mekanix-logo' },
];

(async () => {
  for (const { src, name } of sources) {
    if (!fs.existsSync(src)) { console.log('skip', src); continue; }
    const img = sharp(src);
    const meta = await img.metadata();
    console.log(`${name}: ${meta.width}x${meta.height} from ${path.basename(src)}`);

    const { data, info } = await img.ensureAlpha(0).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r > 225 && g > 225 && b > 225) {
        data[i+3] = 0;
      } else {
        data[i+3] = 255;
      }
    }

    // Transparent original (colored)
    await sharp(data, { raw: { width: info.width, height: info.height, channels } })
      .png().toFile(path.join(LOGO_DIR, `${name}.png`));
    console.log(`✓ ${name}.png`);

    // White version (for dark bg) — tint non-orange to white
    const whiteBuf = Buffer.from(data);
    for (let i = 0; i < whiteBuf.length; i += channels) {
      if (whiteBuf[i+3] > 0) {
        const r = whiteBuf[i], g = whiteBuf[i+1], b = whiteBuf[i+2];
        const isOrange = r > 150 && g > 60 && g < 160 && b < 100;
        if (!isOrange) {
          whiteBuf[i] = 255; whiteBuf[i+1] = 255; whiteBuf[i+2] = 255;
        }
        whiteBuf[i+3] = 255;
      }
    }
    await sharp(whiteBuf, { raw: { width: info.width, height: info.height, channels } })
      .png().toFile(path.join(LOGO_DIR, `${name}-white.png`));
    console.log(`✓ ${name}-white.png`);

    // Black version (for light bg) — tint non-orange to near-black
    const blackBuf = Buffer.from(data);
    for (let i = 0; i < blackBuf.length; i += channels) {
      if (blackBuf[i+3] > 0) {
        const r = blackBuf[i], g = blackBuf[i+1], b = blackBuf[i+2];
        const isOrange = r > 150 && g > 60 && g < 160 && b < 100;
        if (!isOrange) {
          blackBuf[i] = 15; blackBuf[i+1] = 15; blackBuf[i+2] = 15;
        }
        blackBuf[i+3] = 255;
      }
    }
    await sharp(blackBuf, { raw: { width: info.width, height: info.height, channels } })
      .png().toFile(path.join(LOGO_DIR, `${name}-black.png`));
    console.log(`✓ ${name}-black.png`);
  }
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
