const sharp = require('sharp');
const fs = require('fs');

(async () => {
  const srcPath = 'public/logos/heavix-logo.png';
  const img = sharp(srcPath);
  const meta = await img.metadata();
  console.log(`Logo: ${meta.width}x${meta.height}`);

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  // VLM said IX is at: Left 67%, Top 61%, Right 85%, Bottom 73%
  // Let's find the exact bounding box of the "IX" text by analyzing
  // the rightmost non-transparent white pixels in the text area.
  // The text "HEAVIX" is in the lower portion. We need to isolate just "IX".

  // First, find the text row range (where white opaque pixels exist in bottom half)
  let textTop = h, textBottom = 0, textLeft = w, textRight = 0;
  for (let y = Math.floor(h * 0.5); y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a > 128 && r > 200 && g > 200 && b > 200) {
        if (y < textTop) textTop = y;
        if (y > textBottom) textBottom = y;
        if (x < textLeft) textLeft = x;
        if (x > textRight) textRight = x;
      }
    }
  }
  console.log(`Text bounds: L=${textLeft} T=${textTop} R=${textRight} B=${textBottom} (w=${textRight-textLeft})`);

  // The word "HEAVIX" has 6 letters. "IX" is the last 2 letters (2/6 = 33% of width).
  // So IX starts at ~67% of the text width.
  const textW = textRight - textLeft;
  const ixStart = textLeft + Math.floor(textW * 0.63); // slightly before 67% to catch the I
  const ixEnd = textRight + 5; // a bit past the end

  console.log(`IX region: x=${ixStart} to ${ixEnd}`);

  // Now, within the IX region, convert white pixels to orange (#F58220 = rgb(245,130,32))
  // But ONLY in the text row range (not the tagline below).
  // The tagline "BUY / SELL / LIST" is below the main wordmark.
  // Let's only orange-ify the top portion of the text area (the wordmark, not tagline).
  // Wordmark is roughly the top 60% of the text bounds.
  const wordmarkBottom = textTop + Math.floor((textBottom - textTop) * 0.55);

  let changed = 0;
  for (let y = textTop; y < wordmarkBottom; y++) {
    for (let x = ixStart; x < ixEnd && x < w; x++) {
      const i = (y * w + x) * ch;
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      // Only change white/light pixels (the text)
      if (a > 128 && r > 180 && g > 180 && b > 180) {
        data[i] = 245;   // R
        data[i+1] = 130; // G
        data[i+2] = 32;  // B
        changed++;
      }
    }
  }
  console.log(`Changed ${changed} pixels to orange`);

  await sharp(data, { raw: { width: w, height: h, channels: ch } })
    .png().toFile(srcPath);
  console.log(`✓ saved ${srcPath}`);
})().catch(e => { console.error(e); process.exit(1); });
