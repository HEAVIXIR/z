/* ============================================================
   generate-sale-images.ts — generates the 4 "Sell in 7 Days"
   step images using z-ai-web-dev-sdk and saves them under
   /public/images/sell-in-7-days/step-1.jpg ... step-4.jpg.

   Run with:  bun run gen:sale-images
   ============================================================ */

import ZAI from "z-ai-web-dev-sdk";
import path from "path";
import { promises as fs } from "fs";

type Step = { num: number; prompt: string; file: string };

const STEPS: Step[] = [
  {
    num: 1,
    file: "step-1.jpg",
    prompt:
      "Industrial heavy machinery registration, an excavator on a construction site at dawn, professional photography, orange accent lighting, cinematic, high detail, no text, no watermark",
  },
  {
    num: 2,
    file: "step-2.jpg",
    prompt:
      "Technical inspection of heavy machinery, an engineer with a clipboard examining an excavator engine in an industrial setting, professional photography, orange safety vest, sharp focus, no text, no watermark",
  },
  {
    num: 3,
    file: "step-3.jpg",
    prompt:
      "Price valuation of construction machinery, a professional appraiser with a tablet standing in front of heavy equipment, financial documents, industrial yard, professional photography, orange accent, no text, no watermark",
  },
  {
    num: 4,
    file: "step-4.jpg",
    prompt:
      "Handshake contract signing for a heavy machinery sale, two business people shaking hands with construction equipment in the background, professional business deal, warm light, orange accent, no text, no watermark",
  },
];

async function generateOne(step: Step): Promise<boolean> {
  const outDir = path.join(process.cwd(), "public", "images", "sell-in-7-days");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, step.file);

  process.stdout.write(`[step ${step.num}] generating → ${step.file} ...\n`);
  try {
    const zai = await ZAI.create();
    const resp = await zai.images.generations.create({
      prompt: step.prompt,
      size: "1344x768",
    });
    const base64 = resp?.data?.[0]?.base64 ?? null;
    if (!base64) {
      process.stdout.write(`[step ${step.num}] ✗ empty response\n`);
      return false;
    }
    await fs.writeFile(outPath, Buffer.from(base64, "base64"));
    process.stdout.write(`[step ${step.num}] ✓ saved ${outPath}\n`);
    return true;
  } catch (e: any) {
    process.stdout.write(
      `[step ${step.num}] ✗ failed: ${e?.message ?? "unknown"}\n`,
    );
    return false;
  }
}

async function main() {
  process.stdout.write("\n=== Sell-in-7-Days image generator ===\n");
  let ok = 0;
  for (const step of STEPS) {
    const success = await generateOne(step);
    if (success) ok++;
  }
  process.stdout.write(
    `\nDone. ${ok}/${STEPS.length} images generated.\n`,
  );
  if (ok < STEPS.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
