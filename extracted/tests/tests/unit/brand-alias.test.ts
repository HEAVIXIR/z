import { describe, it, expect } from "vitest";
import { normalizeAliasValue } from "@/lib/brand-alias";

/* ============================================================
   Unit tests for src/lib/brand-alias.ts (P1-20)
   ------------------------------------------------------------
   Verifies:
     • ZWNJ / ZWJ are stripped.
     • Arabic YEH (ي) → Persian YEH (ی).
     • Arabic KAF (ك) → Persian KAF (ک).
     • Lowercased.
     • Repeated whitespace collapsed to a single space.
     • Leading/trailing whitespace trimmed.
     • Same input always produces the same output (pure function).
   ============================================================ */

describe("normalizeAliasValue", () => {
  it("strips ZWNJ (U+200C) and ZWJ (U+200D)", () => {
    // "کاترپیلار" with a ZWNJ between ر and پ
    const withZwnj = "کاتر\u200cپیلار";
    const withZwj = "کاتر\u200dپیلار";
    const plain = "کاترپیلار";
    expect(normalizeAliasValue(withZwnj)).toBe(plain);
    expect(normalizeAliasValue(withZwj)).toBe(plain);
  });

  it("converts Arabic YEH (ي) → Persian YEH (ی)", () => {
    // Arabic ي = U+064A, Persian ی = U+06CC
    const arabic = "هيونداي"; // uses Arabic YEH
    const persian = "هیوندای"; // uses Persian YEH
    expect(normalizeAliasValue(arabic)).toBe(persian);
  });

  it("converts Arabic KAF (ك) → Persian KAF (ک)", () => {
    // Arabic ك = U+0643, Persian ک = U+06A9
    const arabic = "كاترپيلار";
    const persian = "کاترپیلار";
    expect(normalizeAliasValue(arabic)).toBe(persian);
  });

  it("lowercases Latin characters", () => {
    expect(normalizeAliasValue("Caterpillar")).toBe("caterpillar");
    expect(normalizeAliasValue("CATERPILLAR")).toBe("caterpillar");
  });

  it("collapses repeated whitespace into a single space", () => {
    expect(normalizeAliasValue("Caterpillar   Inc")).toBe("caterpillar inc");
    expect(normalizeAliasValue("  caterpillar\tinc  ")).toBe("caterpillar inc");
  });

  it("is a pure function — same input always produces the same output", () => {
    const input = "كاترپيلار  HYUNDAI\tهيونداي";
    const out1 = normalizeAliasValue(input);
    const out2 = normalizeAliasValue(input);
    expect(out1).toBe(out2);
  });

  it("treats equivalent variants as the same canonical value", () => {
    // Mix of Arabic YEH + Arabic KAF + extra whitespace + ZWNJ
    // should all collapse to the canonical Persian form.
    const variants = [
      "كاترپيلار",
      "کاترپیلار",
      "  کاترپیلار  ",
      "کاتر\u200cپیلار",
      "Caterpillar",
      "CATERPILLAR",
    ];
    const canonicalCaterpillar = normalizeAliasValue("کاترپیلار");
    const canonicalEnglish = normalizeAliasValue("caterpillar");

    // The Persian variants all collapse to the same canonical Persian form.
    expect(normalizeAliasValue(variants[0])).toBe(canonicalCaterpillar);
    expect(normalizeAliasValue(variants[1])).toBe(canonicalCaterpillar);
    expect(normalizeAliasValue(variants[2])).toBe(canonicalCaterpillar);
    expect(normalizeAliasValue(variants[3])).toBe(canonicalCaterpillar);

    // The English variants collapse to lowercase.
    expect(normalizeAliasValue(variants[4])).toBe(canonicalEnglish);
    expect(normalizeAliasValue(variants[5])).toBe(canonicalEnglish);
  });

  it("handles empty / whitespace-only input gracefully", () => {
    expect(normalizeAliasValue("")).toBe("");
    expect(normalizeAliasValue("   ")).toBe("");
    expect(normalizeAliasValue("\t\n")).toBe("");
  });
});
