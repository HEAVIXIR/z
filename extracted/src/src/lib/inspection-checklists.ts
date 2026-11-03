/* ============================================================
   P2-DEAL-INSPECT-TRANSPORT — Predefined inspection checklists
   per machine category (Persian labels). Each checklist is a
   list of groups → items that the inspector ticks during a
   HEAVIX IronClad inspection.

   `getChecklistForCategory(categoryName)` resolves a category
   name (Persian or English) to the best-matching checklist.
   ============================================================ */

export interface ChecklistItem {
  /** Stable key used by the inspector UI. */
  key: string;
  /** Persian label of the inspected item. */
  label: string;
  /** Optional Persian hint shown under the label. */
  hint?: string;
}

export interface ChecklistGroup {
  key: string;
  label: string;
  icon?: string;
  items: ChecklistItem[];
}

export type Checklist = ChecklistGroup[];

/* ── Excavator ──────────────────────────────────────────────── */
export const EXCAVATOR_CHECKLIST: Checklist = [
  {
    key: "engine",
    label: "موتور",
    icon: "🔧",
    items: [
      { key: "start", label: "روشن‌شدن بدون مشکل", hint: "استارت سرد و گرم" },
      { key: "smoke", label: "بدون دود غیرعادی", hint: "آبی، سیاه یا سفید" },
      { key: "oil_leak", label: "عدم نشت روغن موتور" },
      { key: "coolant", label: "سیستم خنک‌کننده سالم" },
      { key: "noise", label: "بدون صدای غیرطبیعی موتور" },
    ],
  },
  {
    key: "hydraulic",
    label: "سیستم هیدرولیک",
    icon: "💧",
    items: [
      { key: "pump_noise", label: "پمپ هیدرولیک بدون صدا" },
      { key: "cylinders", label: "سیلندرهای هیدرولیک بدون نشتی" },
      { key: "pressure", label: "فشار هیدرولیک در حد نرمال" },
      { key: "hoses", label: "شلگ‌ها سالم و بدون ترک" },
    ],
  },
  {
    key: "undercarriage",
    label: "تحت سری",
    icon: "⚙️",
    items: [
      { key: "tracks", label: "زنجیرها و کفشک‌ها سالم" },
      { key: "rollers", label: "غلتک‌ها بدون ساییدگی بیش از حد" },
      { key: "sprockets", label: "پینیون‌ها سالم" },
      { key: "tension", label: "کشش زنجیر مناسب" },
    ],
  },
  {
    key: "electrical",
    label: "سیستم برق",
    icon: "⚡",
    items: [
      { key: "battery", label: "باتری سالم" },
      { key: "alternator", label: "دینام شارژ صحیح" },
      { key: "lights", label: "چراغ‌ها و سیستم روشنایی" },
      { key: "sensors", label: "سنسورها و نمایشگرها" },
    ],
  },
  {
    key: "structure",
    label: "بدنه و سازه",
    icon: "🏗️",
    items: [
      { key: "boom", label: "بووم و اَرن بدون ترک" },
      { key: "frame", label: "شاسی سالم بدون جوشکاری" },
      { key: "cabin", label: "کابین سالم و درب‌ها" },
      { key: "rust", label: "خوردگی و زنگ‌زدگی کم" },
    ],
  },
  {
    key: "attachments",
    label: "ضمائم",
    icon: "🪛",
    items: [
      { key: "bucket", label: "بیل و دندانه‌ها سالم" },
      { key: "quick", label: "کوپلر سریع کار می‌کند" },
      { key: "pins", label: "پین‌ها و بوش‌ها بدون لقی" },
    ],
  },
];

/* ── Loader ────────────────────────────────────────────────── */
export const LOADER_CHECKLIST: Checklist = [
  {
    key: "engine",
    label: "موتور",
    icon: "🔧",
    items: [
      { key: "start", label: "استارت سرد و گرم" },
      { key: "smoke", label: "بدون دود غیرعادی" },
      { key: "oil_leak", label: "عدم نشت روغن" },
      { key: "temp", label: "دمای موتور در حد نرمال" },
    ],
  },
  {
    key: "transmission",
    label: "گیربکس",
    icon: "⚙️",
    items: [
      { key: "shift", label: "تعویض دنده نرم" },
      { key: "torque", label: "مبدل گشتاور سالم" },
      { key: "axles", label: "اویل‌ها بدون صدا" },
    ],
  },
  {
    key: "hydraulic",
    label: "هیدرولیک",
    icon: "💧",
    items: [
      { key: "pump", label: "پمپ هیدرولیک سالم" },
      { key: "lift", label: "بازو بالابر بدون نشتی" },
      { key: "steering", label: "هیدرولیک فرمان سالم" },
    ],
  },
  {
    key: "tires",
    label: "لاستیک‌ها",
    icon: "🛞",
    items: [
      { key: "tread", label: "آج لاستیک‌ها مناسب" },
      { key: "pressure", label: "فشار باد یکسان" },
      { key: "damage", label: "بدون زخم و پارگی" },
    ],
  },
  {
    key: "bucket",
    label: "بیل و ضمائم",
    icon: "🪣",
    items: [
      { key: "bucket_wear", label: "کف بیل و لبه برشی" },
      { key: "teeth", label: "دندانه‌ها سالم" },
      { key: "cylinders", label: "سیلندر بازوی بیل" },
    ],
  },
  {
    key: "electrical",
    label: "برق و الکترونیک",
    icon: "⚡",
    items: [
      { key: "battery", label: "باتری و دینام" },
      { key: "panel", label: "پنل نمایشگر و خطاهای فعال" },
      { key: "lights", label: "چراغ‌ها و بوق" },
    ],
  },
];

/* ── Crane ─────────────────────────────────────────────────── */
export const CRANE_CHECKLIST: Checklist = [
  {
    key: "engine",
    label: "موتور",
    icon: "🔧",
    items: [
      { key: "start", label: "استارت سرد و گرم" },
      { key: "smoke", label: "بدون دود غیرعادی" },
      { key: "leak", label: "عدم نشت روغن و آب" },
    ],
  },
  {
    key: "boom",
    label: "بوم",
    icon: "🏗️",
    items: [
      { key: "extension", label: "باز و بسته شدن بوم تلسکوپی" },
      { key: "wear", label: "سایش سطح بوم" },
      { key: "alignment", label: "تراز بودن بوم" },
    ],
  },
  {
    key: "cables",
    label: "کابل و قلاب",
    icon: "🪢",
    items: [
      { key: "wire_rope", label: "کابل فولادی بدون فرچه" },
      { key: "hook", label: "قلاب و یوک سالم" },
      { key: "pulley", label: "قرقره‌ها آزاد می‌چرخند" },
    ],
  },
  {
    key: "hydraulics",
    label: "هیدرولیک",
    icon: "💧",
    items: [
      { key: "pump", label: "پمپ هیدرولیک" },
      { key: "cylinders", label: "سیلندرهای بوم و جک‌ها" },
      { key: "valves", label: "شیرهای کنترل" },
    ],
  },
  {
    key: "safety_devices",
    label: "دستگاه‌های ایمنی",
    icon: "🛡️",
    items: [
      { key: "lmi", label: "سیستم LMI / بار سنج" },
      { key: "limit_switch", label: "محدودکننده‌ها کار می‌کنند" },
      { key: "alarm", label: "آلارم و چراغ چرخان" },
      { key: "outrigger", label: "جک‌های تعادل" },
    ],
  },
  {
    key: "load_chart",
    label: "جدول بار و مدارک",
    icon: "📋",
    items: [
      { key: "chart_present", label: "جدول بار نصب شده" },
      { key: "manual", label: "دفترچه راهنما موجود" },
      { key: "cert", label: "گواهی بازرسی معتبر" },
    ],
  },
];

/* ── Generic / fallback ────────────────────────────────────── */
export const GENERIC_CHECKLIST: Checklist = [
  {
    key: "engine",
    label: "موتور",
    icon: "🔧",
    items: [
      { key: "start", label: "استارت سرد و گرم" },
      { key: "smoke", label: "بدون دود غیرعادی" },
      { key: "leak", label: "عدم نشت روغن و آب" },
      { key: "noise", label: "بدون صدای غیرطبیعی" },
    ],
  },
  {
    key: "hydraulic",
    label: "هیدرولیک",
    icon: "💧",
    items: [
      { key: "pump", label: "پمپ هیدرولیک" },
      { key: "cylinders", label: "سیلندرها بدون نشتی" },
      { key: "hoses", label: "شلگ‌ها سالم" },
    ],
  },
  {
    key: "electrical",
    label: "برق",
    icon: "⚡",
    items: [
      { key: "battery", label: "باتری و دینام" },
      { key: "lights", label: "چراغ‌ها و هشدارها" },
      { key: "panel", label: "پنل و سنسورها" },
    ],
  },
  {
    key: "structure",
    label: "بدنه و شاسی",
    icon: "🏗️",
    items: [
      { key: "frame", label: "شاسی بدون ترک یا جوش" },
      { key: "cabin", label: "کابین سالم" },
      { key: "rust", label: "خوردگی در حد قابل قبول" },
    ],
  },
  {
    key: "tires_undercarriage",
    label: "لاستیک / تحت سری",
    icon: "🛞",
    items: [
      { key: "tires", label: "لاستیک‌ها یا زنجیرها" },
      { key: "rollers", label: "غلتک‌ها و پینیون‌ها" },
      { key: "brakes", label: "ترمز و سیستم توقف" },
    ],
  },
  {
    key: "documents",
    label: "مدارک",
    icon: "📋",
    items: [
      { key: "ownership", label: "سند مالکیت" },
      { key: "insurance", label: "بیمه‌نامه معتبر" },
      { key: "service", label: "دفترچه خدمات و تاریخچه" },
    ],
  },
];

/* ── Resolver ──────────────────────────────────────────────── */

/** Map of keyword → checklist. Used by `getChecklistForCategory`. */
const KEYWORD_MAP: { keywords: string[]; checklist: Checklist }[] = [
  { keywords: ["بیل مکانیکی", "excavator", "هیدرولیک"], checklist: EXCAVATOR_CHECKLIST },
  { keywords: ["لودر", "loader", "بیل لودر"], checklist: LOADER_CHECKLIST },
  { keywords: ["جرثقیل", "crane", "بیل مکانیکی جرثقیل"], checklist: CRANE_CHECKLIST },
];

/**
 * Resolve a checklist for a given category name (Persian or English).
 * Falls back to the generic checklist if no keyword matches.
 */
export function getChecklistForCategory(categoryName?: string | null): Checklist {
  if (!categoryName) return GENERIC_CHECKLIST;
  const lower = categoryName.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return entry.checklist;
    }
  }
  return GENERIC_CHECKLIST;
}

/** Flatten a checklist into a list of `{ groupKey, groupLabel, itemKey, itemLabel }`. */
export function flattenChecklist(checklist: Checklist) {
  const rows: {
    groupKey: string;
    groupLabel: string;
    itemKey: string;
    itemLabel: string;
  }[] = [];
  for (const group of checklist) {
    for (const item of group.items) {
      rows.push({
        groupKey: group.key,
        groupLabel: group.label,
        itemKey: item.key,
        itemLabel: item.label,
      });
    }
  }
  return rows;
}

/** Build an empty checklist payload (all items `passed: null`) for persistence. */
export function emptyChecklistPayload(checklist: Checklist) {
  return flattenChecklist(checklist).map((r) => ({
    group: r.groupKey,
    groupLabel: r.groupLabel,
    item: r.itemKey,
    label: r.itemLabel,
    passed: null as boolean | null,
    notes: "",
  }));
}

/** Compute a 0-100 score from a checklist payload. */
export function scoreChecklist(payload: { passed: boolean | null }[]): number {
  const answered = payload.filter((p) => p.passed !== null);
  if (answered.length === 0) return 0;
  const passed = answered.filter((p) => p.passed === true).length;
  return Math.round((passed / answered.length) * 100);
}

export const INSPECTION_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "درخواست شده",
  SCHEDULED: "زمان‌بندی شده",
  IN_PROGRESS: "در حال انجام",
  COMPLETED: "تکمیل شده",
  CANCELLED: "لغو شده",
};

export const TRANSPORT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "درخواست شده",
  QUOTING: "در حال استعلام قیمت",
  ACCEPTED: "پذیرفته شده",
  IN_TRANSIT: "در حال حمل",
  DELIVERED: "تحویل داده شد",
  CANCELLED: "لغو شده",
};

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  FLATBED: "کفی",
  LOWBOY: "لووبوی (کم‌چرخ)",
  CONTAINER: "کانتینربر",
  SPECIAL: "ویژه / ابعاد خاص",
};

export const DEAL_STATUS_LABELS: Record<string, string> = {
  OPEN: "باز",
  NEGOTIATING: "در حال مذاکره",
  AGREED: "توافق اولیه",
  INSPECTION: "در حال کارشناسی",
  TRANSPORT: "مرحله حمل",
  COMPLETED: "تکمیل شده",
  CANCELLED: "لغو شده",
};

export const DEAL_DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "قرارداد",
  INSPECTION_REPORT: "گزارش کارشناسی",
  INVOICE: "فاکتور",
  OWNERSHIP_PROOF: "سند مالکیت",
  TRANSPORT_DOC: "بارنامه حمل",
  OTHER: "سایر",
};
