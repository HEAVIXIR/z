# Legacy Archive Extraction — HEAVIXIR/z

## Branch: `legacy/extracted-archives`

This branch contains the extracted contents of legacy ZIP archives from
the `main` branch of `HEAVIXIR/z`.

## Provenance

| Archive | SHA-256 (ZIP) | Extracted Files |
|---------|---------------|-----------------|
| src.zip | 5ec7314f356cc69646584f39d304fd0095f35240ac0f9ebbc2831161b3789496 | 717 → 690 (after removing generated) |
| scripts.zip | 57346b79919d680662e2698d33fbc6ca079d5651ad415b95b69925d52b9ca93a | 25 |
| prisma.zip | 03fb62fd41b10a34f4158a79738d510091615e20b117508abfd71346a7188848 | 39 |
| tests.zip | baffb992037c7c40da1dd195faa945c8119f12eb1205d38a7d3d21e7780dbb61 | 20 |
| docs.zip | 7096b79001bf05a93256290dfe7ce31f353cd1f3ea0c492a3c773744a83db6b4 | 18 |
| public.zip | (extracted) | 38 |
| examples.zip | (extracted) | 2 |
| mini-services.zip | (extracted) | 1 |
| .zscripts.zip | (extracted) | 10 |
| download.zip | (extracted) | 1 |

## Quarantined (NOT extracted)

See QUARANTINE.md for list of archives that were intentionally not extracted.

## Security

- No `.env` files found in any archive
- No connection strings with credentials found
- No private keys found (only false positive in Prisma generated binary, which was removed)
- Prisma generated client files removed (build artifacts)

## Usage

This branch is for READ-ONLY audit and comparison with the current HEAVIXIR/z-ai-2
repository. Files should NOT be copied wholesale to the main repository.
Each file must be individually evaluated against the current codebase.
