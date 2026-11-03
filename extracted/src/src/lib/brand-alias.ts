/**
 * Shared normalizer for BrandAlias values.
 *
 * Persian-aware normalization:
 *  - trims + lowercases
 *  - converts Arabic YEH (ي) → Persian YEH (ی)
 *  - converts Arabic KAF (ك) → Persian KAF (ک)
 *  - strips ZWNJ / ZWJ (U+200C, U+200D)
 *  - collapses repeated whitespace
 *
 * The normalized value is stored on BrandAlias.normalizedValue and used for
 * uniqueness + lookup so that "کاترپیلار", "كاترپیلار", and "کاترپیلار " all
 * resolve to the same record.
 */
export function normalizeAliasValue(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
