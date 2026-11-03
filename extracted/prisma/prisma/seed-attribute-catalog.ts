/* HEAVIX Attribute Master Seed — HBR Attribute Catalog V1.0 §1–§56
   =================================================================
   Idempotent. Updates the existing 44 AttributeDefinitions (sets
   `labelFa`/`labelEn`, `key`, `searchable`, `sortable`, `visibleOnCard`,
   `visibleOnDetail`, `seoRelevant`, `aiRelevant`) and adds the remaining
   ~150 catalog attributes from the HBR V1.0 spec, then re-links every
   category with `required`/`filterable`/`searchable`/`sortable`/`displayOrder`
   overrides at the CategoryAttribute link level.

   Three-layer architecture (HBR §2):
     • Global  (§2.A) — linked to root "machinery" + key machine categories
     • Domain  (§2.B) — machine-common, vehicle-common, part-common, …
     • Category-specific (§2.C) — excavator, loader, dump-truck, …

   Shared attributes (condition, year, operating_hours, engine_power,
   operating_weight, …) are defined ONCE per key — the upsert-by-key helper
   finds the existing record and updates metadata. The CategoryAttribute
   link is created per category.

   Run:  cd /home/z/my-project && bunx tsx prisma/seed-attribute-catalog.ts
*/
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

type AttrType =
  | "TEXT"
  | "LONG_TEXT"
  | "INTEGER"
  | "DECIMAL"
  | "BOOLEAN"
  | "SELECT"
  | "MULTI_SELECT"
  | "RANGE"
  | "YEAR"
  | "DATE"
  | "DATETIME"
  | "CURRENCY"
  | "UNIT"
  | "URL"
  | "PHONE"
  | "COLOR"
  | "SIZE"
  | "WEIGHT"
  | "REFERENCE"
  | "LOCATION"
  | "FILE"
  | "IMAGE";

type AttrSeed = {
  key: string;
  labelFa: string;
  labelEn?: string;
  type: AttrType;
  unit?: string;
  required?: boolean; // definition-level (default false; link-level overrides)
  filterable?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  visibleOnCard?: boolean;
  visibleOnDetail?: boolean;
  seoRelevant?: boolean;
  aiRelevant?: boolean;
  options?: string[]; // Persian / English option labels
};

type CatLink = {
  /** One or more slug candidates — first existing slug wins. */
  slugCandidates: string[];
  label: string;
  attributes: AttrSeed[];
  /** Keys that should be marked required=true at the link level. */
  requiredKeys?: string[];
};

// ════════════════════════════════════════════════════════════
// SHARED CONSTANTS — referenced by many CatLink blocks
// (defined once as constants; the upsert-by-key makes them a single row)
// ════════════════════════════════════════════════════════════

const BRAND: AttrSeed = {
  key: "brand",
  labelFa: "برند",
  labelEn: "Brand",
  type: "TEXT",
  searchable: true,
  filterable: true,
  visibleOnCard: true,
  seoRelevant: true,
  aiRelevant: true,
};

const MODEL: AttrSeed = {
  key: "model",
  labelFa: "مدل",
  labelEn: "Model",
  type: "TEXT",
  searchable: true,
  visibleOnCard: true,
  seoRelevant: true,
  aiRelevant: true,
};

const YEAR: AttrSeed = {
  key: "year",
  labelFa: "سال ساخت",
  labelEn: "Year",
  type: "YEAR",
  filterable: true,
  sortable: true,
  visibleOnCard: true,
  seoRelevant: true,
  aiRelevant: true,
};

const MODEL_YEAR: AttrSeed = {
  key: "model_year",
  labelFa: "سال مدل",
  labelEn: "Model Year",
  type: "YEAR",
  filterable: true,
  sortable: true,
  visibleOnCard: true,
};

const MANUFACTURING_YEAR: AttrSeed = {
  key: "manufacturing_year",
  labelFa: "سال تولید",
  labelEn: "Manufacturing Year",
  type: "YEAR",
  filterable: true,
  sortable: true,
};

const CONDITION_MACHINE: AttrSeed = {
  key: "condition",
  labelFa: "وضعیت",
  labelEn: "Condition",
  type: "SELECT",
  filterable: true,
  visibleOnCard: true,
  aiRelevant: true,
  options: ["نو", "صفر کارکرد", "کم‌کارکرد", "کارکرده", "نیازمند تعمیر"],
};

const OPERATING_HOURS: AttrSeed = {
  key: "operating_hours",
  labelFa: "ساعت کارکرد",
  labelEn: "Operating Hours",
  type: "INTEGER",
  unit: "HOUR",
  filterable: true,
  sortable: true,
  visibleOnCard: true,
  aiRelevant: true,
};

const ENGINE_POWER: AttrSeed = {
  key: "engine_power",
  labelFa: "قدرت موتور",
  labelEn: "Engine Power",
  type: "DECIMAL",
  unit: "HP",
  filterable: true,
  sortable: true,
  visibleOnCard: true,
  aiRelevant: true,
};

const ENGINE_BRAND: AttrSeed = {
  key: "engine_brand",
  labelFa: "برند موتور",
  labelEn: "Engine Brand",
  type: "TEXT",
  filterable: true,
  searchable: true,
};

const ENGINE_MODEL: AttrSeed = {
  key: "engine_model",
  labelFa: "مدل موتور",
  labelEn: "Engine Model",
  type: "TEXT",
  searchable: true,
};

const OPERATING_WEIGHT: AttrSeed = {
  key: "operating_weight",
  labelFa: "وزن عملیاتی",
  labelEn: "Operating Weight",
  type: "DECIMAL",
  unit: "TON",
  filterable: true,
  sortable: true,
  visibleOnCard: true,
  aiRelevant: true,
};

const BUCKET_CAPACITY: AttrSeed = {
  key: "bucket_capacity",
  labelFa: "گنجایش باکت",
  labelEn: "Bucket Capacity",
  type: "DECIMAL",
  unit: "M3",
  filterable: true,
  sortable: true,
  visibleOnCard: true,
  aiRelevant: true,
};

const FUEL_TYPE_MACHINE: AttrSeed = {
  key: "fuel_type",
  labelFa: "نوع سوخت",
  labelEn: "Fuel Type",
  type: "SELECT",
  filterable: true,
  aiRelevant: true,
  options: ["دیزل", "بنزین", "گاز", "دوگانه‌سوز", "الکتریکی", "هیبریدی"],
};

const DRIVE_TYPE: AttrSeed = {
  key: "drive_type",
  labelFa: "نوع انتقال قدرت",
  labelEn: "Drive Type",
  type: "TEXT",
  filterable: true,
};

const COUNTRY_OF_ORIGIN: AttrSeed = {
  key: "country_of_origin",
  labelFa: "کشور سازنده",
  labelEn: "Country of Origin",
  type: "TEXT",
  filterable: true,
  searchable: true,
};

const MANUFACTURER: AttrSeed = {
  key: "manufacturer",
  labelFa: "سازنده",
  labelEn: "Manufacturer",
  type: "TEXT",
  searchable: true,
};

const LOCATION: AttrSeed = {
  key: "location",
  labelFa: "موقعیت",
  labelEn: "Location",
  type: "TEXT",
  filterable: true,
  visibleOnCard: true,
};

const AVAILABILITY: AttrSeed = {
  key: "availability",
  labelFa: "موجودی",
  labelEn: "Availability",
  type: "SELECT",
  filterable: true,
  options: ["موجود", "سفارشی", "فروخته‌شده"],
};

const WARRANTY: AttrSeed = {
  key: "warranty",
  labelFa: "گارانتی",
  labelEn: "Warranty",
  type: "BOOLEAN",
  filterable: true,
};

const SERIAL_NUMBER: AttrSeed = {
  key: "serial_number",
  labelFa: "شماره سریال",
  labelEn: "Serial Number",
  type: "TEXT",
  searchable: true,
};

const TIRE_SIZE: AttrSeed = {
  key: "tire_size",
  labelFa: "سایز تایر",
  labelEn: "Tire Size",
  type: "TEXT",
  filterable: true,
  searchable: true,
};

const OVERALL_LENGTH: AttrSeed = {
  key: "overall_length",
  labelFa: "طول کلی",
  labelEn: "Overall Length",
  type: "DECIMAL",
  unit: "M",
};

const OVERALL_WIDTH: AttrSeed = {
  key: "overall_width",
  labelFa: "عرض کلی",
  labelEn: "Overall Width",
  type: "DECIMAL",
  unit: "M",
};

const OVERALL_HEIGHT: AttrSeed = {
  key: "overall_height",
  labelFa: "ارتفاع کلی",
  labelEn: "Overall Height",
  type: "DECIMAL",
  unit: "M",
};

const GROUND_CLEARANCE: AttrSeed = {
  key: "ground_clearance",
  labelFa: "فاصله از زمین",
  labelEn: "Ground Clearance",
  type: "DECIMAL",
  unit: "M",
};

const TURNING_RADIUS: AttrSeed = {
  key: "turning_radius",
  labelFa: "شعاع گردش",
  labelEn: "Turning Radius",
  type: "DECIMAL",
  unit: "M",
};

const TRAVEL_SPEED: AttrSeed = {
  key: "travel_speed",
  labelFa: "سرعت حرکت",
  labelEn: "Travel Speed",
  type: "DECIMAL",
  unit: "KMH",
};

const LIFTING_CAPACITY: AttrSeed = {
  key: "lifting_capacity",
  labelFa: "ظرفیت باربرداری",
  labelEn: "Lifting Capacity",
  type: "DECIMAL",
  unit: "TON",
  filterable: true,
  sortable: true,
  visibleOnCard: true,
  aiRelevant: true,
};

const MAX_LIFT_HEIGHT: AttrSeed = {
  key: "max_lift_height",
  labelFa: "حداکثر ارتفاع بالابرده",
  labelEn: "Max Lift Height",
  type: "DECIMAL",
  unit: "M",
  filterable: true,
  aiRelevant: true,
};

const PART_NUMBER: AttrSeed = {
  key: "part_number",
  labelFa: "شماره قطعه",
  labelEn: "Part Number",
  type: "TEXT",
  filterable: true,
  searchable: true,
  aiRelevant: true,
};

const OEM_NUMBER: AttrSeed = {
  key: "oem_number",
  labelFa: "شماره OEM",
  labelEn: "OEM Number",
  type: "TEXT",
  filterable: true,
  searchable: true,
};

const MOTOR_POWER_KW: AttrSeed = {
  key: "motor_power",
  labelFa: "توان موتور الکتریکی",
  labelEn: "Motor Power",
  type: "DECIMAL",
  unit: "KW",
  filterable: true,
};

// ════════════════════════════════════════════════════════════
// LINKS — full HBR Attribute Catalog V1.0
// ════════════════════════════════════════════════════════════

const LINKS: CatLink[] = [
  // ─── §2.A GLOBAL ATTRIBUTES — linked to root "machinery" ───────
  {
    slugCandidates: ["machinery"],
    label: "Global (machinery root)",
    attributes: [
      BRAND, MODEL, MODEL_YEAR, YEAR, CONDITION_MACHINE, OPERATING_HOURS,
      COUNTRY_OF_ORIGIN, MANUFACTURER, LOCATION, AVAILABILITY, WARRANTY,
      SERIAL_NUMBER, ENGINE_BRAND,
    ],
  },

  // ─── §7 MACHINE COMMON (domain) — linked to root + key categories ──
  {
    slugCandidates: ["road-construction"],
    label: "Machine Common (road-construction root)",
    attributes: [
      BRAND, MODEL, MODEL_YEAR, MANUFACTURING_YEAR, CONDITION_MACHINE,
      OPERATING_HOURS, SERIAL_NUMBER, COUNTRY_OF_ORIGIN, MANUFACTURER,
      ENGINE_BRAND, ENGINE_MODEL, ENGINE_POWER, FUEL_TYPE_MACHINE,
      { key: "transmission_type", labelFa: "نوع گیربکس", labelEn: "Transmission Type", type: "TEXT" },
      DRIVE_TYPE, OPERATING_WEIGHT,
      { key: "dimensions", labelFa: "ابعاد", labelEn: "Dimensions", type: "TEXT" },
      LOCATION, AVAILABILITY,
      {
        key: "usage_type", labelFa: "نوع کاربرد", labelEn: "Usage Type", type: "SELECT",
        filterable: true,
        options: ["راهسازی", "معدن", "ساختمان", "کشاورزی", "صنعتی"],
      },
      { key: "ownership_status", labelFa: "وضعیت مالکیت", labelEn: "Ownership Status", type: "TEXT" },
      WARRANTY,
      {
        key: "inspection_status", labelFa: "وضعیت کارشناسی", labelEn: "Inspection Status", type: "SELECT",
        filterable: true,
        options: ["کارشناسی‌شده", "در انتظار", "نشده"],
      },
    ],
  },

  // ─── §8 EXCAVATOR ──────────────────────────────────────────────
  {
    slugCandidates: ["excavator"],
    label: "Excavator",
    requiredKeys: ["operating_weight", "engine_power", "operating_hours", "bucket_capacity", "condition"],
    attributes: [
      { key: "machine_type", labelFa: "نوع ماشین", labelEn: "Machine Type", type: "SELECT",
        options: ["زنجیری", "چرخ لاستیکی", "مینی", "Long Reach", "Mining"] },
      OPERATING_WEIGHT, ENGINE_POWER, ENGINE_MODEL, ENGINE_BRAND,
      OPERATING_HOURS, MANUFACTURING_YEAR, MODEL_YEAR, CONDITION_MACHINE,
      { key: "max_digging_depth", labelFa: "حداکثر عمق حفاری", labelEn: "Max Digging Depth", type: "DECIMAL", unit: "M", filterable: true, aiRelevant: true },
      { key: "max_reach", labelFa: "حداکثر برد دسترسی", labelEn: "Max Reach", type: "DECIMAL", unit: "M", aiRelevant: true },
      { key: "max_dump_height", labelFa: "حداکثر ارتفاع تخلیه", labelEn: "Max Dump Height", type: "DECIMAL", unit: "M" },
      { key: "max_cutting_height", labelFa: "حداکثر ارتفاع برش", labelEn: "Max Cutting Height", type: "DECIMAL", unit: "M" },
      { key: "tail_swing_radius", labelFa: "شعاع چرخش عقب", labelEn: "Tail Swing Radius", type: "DECIMAL", unit: "M" },
      GROUND_CLEARANCE,
      { key: "track_length", labelFa: "طول زنجیر", labelEn: "Track Length", type: "DECIMAL", unit: "M" },
      { key: "track_width", labelFa: "عرض زنجیر", labelEn: "Track Width", type: "DECIMAL", unit: "M" },
      OVERALL_LENGTH, OVERALL_WIDTH, OVERALL_HEIGHT,
      BUCKET_CAPACITY,
      { key: "bucket_type", labelFa: "نوع باکت", labelEn: "Bucket Type", type: "SELECT",
        options: ["general", "rock", "heavy_duty", "ditch"] },
      { key: "hydraulic_flow", labelFa: "دبی هیدرولیک", labelEn: "Hydraulic Flow", type: "DECIMAL", unit: "LPM" },
      { key: "hydraulic_pressure", labelFa: "فشار هیدرولیک", labelEn: "Hydraulic Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "boom_type", labelFa: "نوع بازو", labelEn: "Boom Type", type: "TEXT" },
      { key: "arm_type", labelFa: "نوع ذراع", labelEn: "Arm Type", type: "TEXT" },
      { key: "track_type", labelFa: "نوع زیربندی", labelEn: "Track Type", type: "SELECT",
        filterable: true, options: ["زنجیری", "چرخ لاستیکی"] },
      { key: "swing_speed", labelFa: "سرعت چرخش", labelEn: "Swing Speed", type: "DECIMAL", unit: "RPM" },
      TRAVEL_SPEED,
      { key: "fuel_tank_capacity", labelFa: "ظرفیت مخزن سوخت", labelEn: "Fuel Tank Capacity", type: "DECIMAL", unit: "L" },
      { key: "fuel_consumption", labelFa: "مصرف سوخت", labelEn: "Fuel Consumption", type: "DECIMAL", unit: "L/HOUR" },
      { key: "engine_displacement", labelFa: "حجم موتور", labelEn: "Engine Displacement", type: "DECIMAL", unit: "L" },
      { key: "cylinder_count", labelFa: "تعداد سیلندر", labelEn: "Cylinder Count", type: "INTEGER" },
      { key: "emission_standard", labelFa: "استاندارد آلایندگی", labelEn: "Emission Standard", type: "TEXT" },
      { key: "undercarriage_condition", labelFa: "وضعیت زیربندی", labelEn: "Undercarriage Condition", type: "TEXT" },
      { key: "engine_condition", labelFa: "وضعیت موتور", labelEn: "Engine Condition", type: "TEXT" },
      { key: "hydraulic_condition", labelFa: "وضعیت هیدرولیک", labelEn: "Hydraulic Condition", type: "TEXT" },
      { key: "electrical_condition", labelFa: "وضعیت برق", labelEn: "Electrical Condition", type: "TEXT" },
    ],
  },

  // ─── §9 WHEEL LOADER ──────────────────────────────────────────
  {
    slugCandidates: ["loader"],
    label: "Wheel Loader",
    requiredKeys: ["operating_weight", "bucket_capacity", "operating_hours", "condition"],
    attributes: [
      OPERATING_WEIGHT, ENGINE_POWER, ENGINE_BRAND, ENGINE_MODEL,
      BUCKET_CAPACITY,
      { key: "bucket_type", labelFa: "نوع باکت", labelEn: "Bucket Type", type: "SELECT",
        options: ["general", "rock", "heavy_duty", "ditch"] },
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "rated_load", labelFa: "بار نامی", labelEn: "Rated Load", type: "DECIMAL", unit: "TON", filterable: true },
      { key: "breakout_force", labelFa: "نیروی شکست", labelEn: "Breakout Force", type: "DECIMAL", unit: "KG" },
      { key: "dump_clearance", labelFa: "ارتفاع تخلیه", labelEn: "Dump Clearance", type: "DECIMAL", unit: "M" },
      { key: "dump_reach", labelFa: "برد تخلیه", labelEn: "Dump Reach", type: "DECIMAL", unit: "M" },
      { key: "lift_height", labelFa: "ارتفاع بالابرده", labelEn: "Lift Height", type: "DECIMAL", unit: "M" },
      TURNING_RADIUS, TRAVEL_SPEED,
      OVERALL_LENGTH, OVERALL_WIDTH, OVERALL_HEIGHT,
      { key: "wheelbase", labelFa: "فاصله محورها", labelEn: "Wheelbase", type: "DECIMAL", unit: "M" },
      GROUND_CLEARANCE, TIRE_SIZE,
      { key: "tire_condition", labelFa: "وضعیت تایر", labelEn: "Tire Condition", type: "TEXT" },
      DRIVE_TYPE,
      { key: "axle_type", labelFa: "نوع اکسل", labelEn: "Axle Type", type: "TEXT" },
    ],
  },

  // ─── §10 BULLDOZER ────────────────────────────────────────────
  {
    slugCandidates: ["bulldozer"],
    label: "Bulldozer",
    requiredKeys: ["operating_weight", "engine_power", "operating_hours", "condition"],
    attributes: [
      OPERATING_WEIGHT, ENGINE_POWER, ENGINE_BRAND, ENGINE_MODEL,
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "blade_width", labelFa: "عرض تیغه", labelEn: "Blade Width", type: "DECIMAL", unit: "M", filterable: true },
      { key: "blade_height", labelFa: "ارتفاع تیغه", labelEn: "Blade Height", type: "DECIMAL", unit: "M" },
      { key: "blade_capacity", labelFa: "گنجایش تیغه", labelEn: "Blade Capacity", type: "DECIMAL", unit: "M3" },
      { key: "blade_type", labelFa: "نوع تیغه", labelEn: "Blade Type", type: "SELECT",
        filterable: true, options: ["مستقیم", "U-shape", "زاویه‌دار", "مخلوط"] },
      { key: "blade_angle", labelFa: "زاویه تیغه", labelEn: "Blade Angle", type: "DECIMAL", unit: "DEG" },
      { key: "blade_tilt", labelFa: "تمایل تیغه", labelEn: "Blade Tilt", type: "DECIMAL", unit: "DEG" },
      { key: "track_type", labelFa: "نوع زیربندی", labelEn: "Track Type", type: "SELECT",
        filterable: true, options: ["زنجیری-LGP", "زنجیری-استاندارد"] },
      { key: "track_width", labelFa: "عرض زنجیر", labelEn: "Track Width", type: "DECIMAL", unit: "M" },
      { key: "track_shoes", labelFa: "تعداد کفشک", labelEn: "Track Shoes", type: "INTEGER" },
      { key: "undercarriage_condition", labelFa: "وضعیت زیربندی", labelEn: "Undercarriage Condition", type: "TEXT" },
      { key: "drawbar_pull", labelFa: "نیروی کششی", labelEn: "Drawbar Pull", type: "DECIMAL", unit: "KG" },
      { key: "ground_pressure", labelFa: "فشار بر زمین", labelEn: "Ground Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "max_speed", labelFa: "حداکثر سرعت", labelEn: "Max Speed", type: "DECIMAL", unit: "KMH" },
    ],
  },

  // ─── §11 MOTOR GRADER ─────────────────────────────────────────
  {
    slugCandidates: ["grader"],
    label: "Motor Grader",
    requiredKeys: ["operating_weight", "engine_power", "operating_hours", "condition"],
    attributes: [
      OPERATING_WEIGHT, ENGINE_POWER, ENGINE_BRAND, ENGINE_MODEL,
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "moldboard_width", labelFa: "عرض تیغه", labelEn: "Moldboard Width", type: "DECIMAL", unit: "M", filterable: true },
      { key: "moldboard_height", labelFa: "ارتفاع تیغه", labelEn: "Moldboard Height", type: "DECIMAL", unit: "M" },
      { key: "moldboard_angle", labelFa: "زاویه تیغه", labelEn: "Moldboard Angle", type: "DECIMAL", unit: "DEG" },
      { key: "blade_lift", labelFa: "ارتفاع بالابرده تیغه", labelEn: "Blade Lift", type: "DECIMAL", unit: "M" },
      { key: "blade_side_shift", labelFa: "جابجایی جانبی تیغه", labelEn: "Blade Side Shift", type: "DECIMAL", unit: "M" },
      { key: "circle_shift", labelFa: "چرخش دایره", labelEn: "Circle Shift", type: "DECIMAL", unit: "DEG" },
      { key: "max_cut_depth", labelFa: "حداکثر عمق برش", labelEn: "Max Cut Depth", type: "DECIMAL", unit: "M" },
      TURNING_RADIUS, TRAVEL_SPEED,
    ],
  },

  // ─── §12 BACKHOE LOADER ───────────────────────────────────────
  {
    slugCandidates: ["backhoe-loader"],
    label: "Backhoe Loader",
    requiredKeys: ["operating_weight", "engine_power", "operating_hours", "condition"],
    attributes: [
      OPERATING_WEIGHT, ENGINE_POWER, ENGINE_BRAND, ENGINE_MODEL,
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "loader_bucket_capacity", labelFa: "گنجایش باکت جلو", labelEn: "Loader Bucket Capacity", type: "DECIMAL", unit: "M3", filterable: true },
      { key: "loader_lift_capacity", labelFa: "ظرفیت بالابرده جلو", labelEn: "Loader Lift Capacity", type: "DECIMAL", unit: "KG" },
      { key: "dump_height", labelFa: "ارتفاع تخلیه", labelEn: "Dump Height", type: "DECIMAL", unit: "M" },
      { key: "backhoe_bucket_capacity", labelFa: "گنجایش باکت عقب", labelEn: "Backhoe Bucket Capacity", type: "DECIMAL", unit: "M3" },
      { key: "digging_depth", labelFa: "عمق حفاری", labelEn: "Digging Depth", type: "DECIMAL", unit: "M", filterable: true },
      { key: "reach", labelFa: "برد دسترسی", labelEn: "Reach", type: "DECIMAL", unit: "M" },
      { key: "loading_height", labelFa: "ارتفاع بارگیری", labelEn: "Loading Height", type: "DECIMAL", unit: "M" },
    ],
  },

  // ─── §13 MINI EXCAVATOR ───────────────────────────────────────
  {
    slugCandidates: ["mini-excavator"],
    label: "Mini Excavator",
    attributes: [
      OPERATING_WEIGHT, ENGINE_POWER, ENGINE_BRAND, ENGINE_MODEL,
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      BUCKET_CAPACITY,
      { key: "digging_depth", labelFa: "عمق حفاری", labelEn: "Digging Depth", type: "DECIMAL", unit: "M", filterable: true },
      { key: "max_reach", labelFa: "حداکثر برد", labelEn: "Max Reach", type: "DECIMAL", unit: "M" },
      { key: "tail_swing", labelFa: "چرخش عقب", labelEn: "Tail Swing", type: "DECIMAL", unit: "M" },
      { key: "track_width", labelFa: "عرض زنجیر", labelEn: "Track Width", type: "DECIMAL", unit: "M" },
      { key: "hydraulic_flow", labelFa: "دبی هیدرولیک", labelEn: "Hydraulic Flow", type: "DECIMAL", unit: "LPM" },
      { key: "zero_tail_swing", labelFa: "چرخش صفر عقب", labelEn: "Zero Tail Swing", type: "BOOLEAN" },
      { key: "canopy_or_cabin", labelFa: "کانوپی یا کابین", labelEn: "Canopy or Cabin", type: "SELECT",
        options: ["کانوپی", "کابین"] },
      { key: "attachment_compatibility", labelFa: "سازگاری با متعلقات", labelEn: "Attachment Compatibility", type: "TEXT" },
    ],
  },

  // ─── §14 DUMP TRUCK ───────────────────────────────────────────
  {
    slugCandidates: ["dump-truck"],
    label: "Dump Truck",
    requiredKeys: ["payload_capacity", "engine_power", "operating_hours", "condition"],
    attributes: [
      BRAND, MODEL, YEAR, CONDITION_MACHINE, OPERATING_HOURS, OPERATING_WEIGHT,
      { key: "payload_capacity", labelFa: "ظرفیت بار", labelEn: "Payload Capacity", type: "DECIMAL", unit: "TON", filterable: true, sortable: true, visibleOnCard: true, aiRelevant: true },
      { key: "gross_vehicle_weight", labelFa: "وزن ناخالص", labelEn: "Gross Vehicle Weight", type: "DECIMAL", unit: "TON" },
      ENGINE_POWER, ENGINE_BRAND, ENGINE_MODEL, FUEL_TYPE_MACHINE,
      { key: "transmission_type", labelFa: "نوع گیربکس", labelEn: "Transmission Type", type: "TEXT" },
      { key: "drive_configuration", labelFa: "پیکربندی محرک", labelEn: "Drive Configuration", type: "TEXT", filterable: true },
      { key: "body_capacity", labelFa: "گنجایش بدنه", labelEn: "Body Capacity", type: "DECIMAL", unit: "M3" },
      { key: "body_material", labelFa: "جنس بدنه", labelEn: "Body Material", type: "TEXT" },
      { key: "body_type", labelFa: "نوع بدنه", labelEn: "Body Type", type: "TEXT" },
      { key: "dump_angle", labelFa: "زاویه تخلیه", labelEn: "Dump Angle", type: "DECIMAL", unit: "DEG" },
      { key: "dump_time", labelFa: "زمان تخلیه", labelEn: "Dump Time", type: "DECIMAL", unit: "SEC" },
      { key: "axle_count", labelFa: "تعداد اکسل", labelEn: "Axle Count", type: "INTEGER", filterable: true },
      { key: "axle_configuration", labelFa: "پیکربندی اکسل", labelEn: "Axle Configuration", type: "TEXT", filterable: true },
      TIRE_SIZE,
      { key: "length", labelFa: "طول", labelEn: "Length", type: "DECIMAL", unit: "M" },
      { key: "width", labelFa: "عرض", labelEn: "Width", type: "DECIMAL", unit: "M" },
      { key: "height", labelFa: "ارتفاع", labelEn: "Height", type: "DECIMAL", unit: "M" },
      { key: "wheelbase", labelFa: "فاصله محورها", labelEn: "Wheelbase", type: "DECIMAL", unit: "M" },
    ],
  },

  // ─── §15 MINING TRUCK ─────────────────────────────────────────
  {
    slugCandidates: ["dump-truck-دامپ-تراک-معدنی", "mining-equipment-باربر-معدنی"],
    label: "Mining Truck",
    attributes: [
      { key: "payload_capacity", labelFa: "ظرفیت بار", labelEn: "Payload Capacity", type: "DECIMAL", unit: "TON", filterable: true, sortable: true, visibleOnCard: true, aiRelevant: true },
      { key: "gross_weight", labelFa: "وزن ناخالص", labelEn: "Gross Weight", type: "DECIMAL", unit: "TON" },
      { key: "empty_weight", labelFa: "وزن خالی", labelEn: "Empty Weight", type: "DECIMAL", unit: "TON" },
      ENGINE_POWER, ENGINE_BRAND, ENGINE_MODEL,
      { key: "body_capacity", labelFa: "گنجایش بدنه", labelEn: "Body Capacity", type: "DECIMAL", unit: "M3" },
      { key: "body_type", labelFa: "نوع بدنه", labelEn: "Body Type", type: "TEXT" },
      DRIVE_TYPE,
      { key: "axle_configuration", labelFa: "پیکربندی اکسل", labelEn: "Axle Configuration", type: "TEXT", filterable: true },
      TIRE_SIZE, OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "mine_application", labelFa: "کاربرد معدنی", labelEn: "Mine Application", type: "TEXT" },
      { key: "haul_distance", labelFa: "مسافت حمل", labelEn: "Haul Distance", type: "DECIMAL", unit: "KM" },
      { key: "gradient_capability", labelFa: "توانایی شیب", labelEn: "Gradient Capability", type: "DECIMAL", unit: "PCT" },
      { key: "fuel_consumption", labelFa: "مصرف سوخت", labelEn: "Fuel Consumption", type: "DECIMAL", unit: "L/HOUR" },
    ],
  },

  // ─── §16 MINING SHOVEL ────────────────────────────────────────
  {
    slugCandidates: ["shovel"],
    label: "Mining Shovel",
    attributes: [
      OPERATING_WEIGHT, ENGINE_POWER, BUCKET_CAPACITY,
      { key: "digging_depth", labelFa: "عمق حفاری", labelEn: "Digging Depth", type: "DECIMAL", unit: "M" },
      { key: "max_reach", labelFa: "حداکثر برد", labelEn: "Max Reach", type: "DECIMAL", unit: "M" },
      { key: "dump_height", labelFa: "ارتفاع تخلیه", labelEn: "Dump Height", type: "DECIMAL", unit: "M" },
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "shovel_type", labelFa: "نوع شاول", labelEn: "Shovel Type", type: "SELECT",
        filterable: true, options: ["ELECTRIC", "DIESEL", "HYDRAULIC", "ROPE"] },
    ],
  },

  // ─── §17 DRILL RIG ────────────────────────────────────────────
  {
    slugCandidates: ["drill-rig", "drilling-rigs", "rotary-drill", "dth", "top-hammer", "water-well-drilling", "drilling-machine"],
    label: "Drill Rig",
    requiredKeys: ["drilling_method", "max_drilling_depth", "operating_hours", "condition"],
    attributes: [
      { key: "drilling_method", labelFa: "روش حفاری", labelEn: "Drilling Method", type: "SELECT",
        filterable: true, aiRelevant: true,
        options: ["DTH", "TOP_HAMMER", "ROTARY", "RC", "CORE", "WELL_DRILLING"] },
      { key: "drilling_diameter", labelFa: "قطر حفاری", labelEn: "Drilling Diameter", type: "DECIMAL", unit: "MM", filterable: true },
      { key: "max_drilling_depth", labelFa: "حداکثر عمق حفاری", labelEn: "Max Drilling Depth", type: "DECIMAL", unit: "M", filterable: true, aiRelevant: true },
      { key: "drill_rod_diameter", labelFa: "قطر میله حفاری", labelEn: "Drill Rod Diameter", type: "DECIMAL", unit: "MM" },
      { key: "rod_length", labelFa: "طول میله", labelEn: "Rod Length", type: "DECIMAL", unit: "M" },
      { key: "rotation_speed", labelFa: "سرعت چرخش", labelEn: "Rotation Speed", type: "DECIMAL", unit: "RPM" },
      { key: "torque", labelFa: "گشتاور", labelEn: "Torque", type: "DECIMAL", unit: "NM" },
      { key: "feed_force", labelFa: "نیروی پیشرو", labelEn: "Feed Force", type: "DECIMAL", unit: "KG" },
      { key: "feed_length", labelFa: "طول پیشرو", labelEn: "Feed Length", type: "DECIMAL", unit: "M" },
      { key: "air_pressure", labelFa: "فشار هوا", labelEn: "Air Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "air_consumption", labelFa: "مصرف هوا", labelEn: "Air Consumption", type: "DECIMAL", unit: "M3H" },
      ENGINE_POWER, ENGINE_BRAND, OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §18 CRUSHER ──────────────────────────────────────────────
  {
    slugCandidates: ["jaw-crusher", "cone-crusher", "impact-crusher", "cubic-crusher", "mining-equipment-کراشر"],
    label: "Crusher",
    requiredKeys: ["crusher_type", "capacity", "motor_power", "condition"],
    attributes: [
      { key: "crusher_type", labelFa: "نوع سنگ‌شکن", labelEn: "Crusher Type", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["JAW", "CONE", "IMPACT", "HAMMER", "GIRATORY", "ROLL"] },
      { key: "capacity", labelFa: "ظرفیت تولید", labelEn: "Capacity", type: "DECIMAL", unit: "T/HOUR", filterable: true },
      { key: "feed_opening", labelFa: "دهانه ورودی", labelEn: "Feed Opening", type: "TEXT" },
      { key: "max_feed_size", labelFa: "حداکثر اندازه خوراک", labelEn: "Max Feed Size", type: "DECIMAL", unit: "MM" },
      { key: "output_size", labelFa: "اندازه خروجی", labelEn: "Output Size", type: "DECIMAL", unit: "MM", filterable: true },
      MOTOR_POWER_KW,
      { key: "motor_brand", labelFa: "برند موتور", labelEn: "Motor Brand", type: "TEXT" },
      { key: "number_of_stages", labelFa: "تعداد مرحله", labelEn: "Number of Stages", type: "INTEGER" },
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §19 SCREEN ───────────────────────────────────────────────
  {
    slugCandidates: ["screen", "mining-equipment-سرند"],
    label: "Screen",
    attributes: [
      { key: "screen_type", labelFa: "نوع سرند", labelEn: "Screen Type", type: "TEXT", filterable: true },
      { key: "screen_area", labelFa: "مساحت سرند", labelEn: "Screen Area", type: "DECIMAL", unit: "M2" },
      { key: "deck_count", labelFa: "تعداد طبقه", labelEn: "Deck Count", type: "INTEGER" },
      { key: "capacity", labelFa: "ظرفیت", labelEn: "Capacity", type: "DECIMAL", unit: "T/HOUR", filterable: true },
      { key: "feed_size", labelFa: "اندازه خوراک", labelEn: "Feed Size", type: "DECIMAL", unit: "MM" },
      { key: "output_size", labelFa: "اندازه خروجی", labelEn: "Output Size", type: "DECIMAL", unit: "MM" },
      MOTOR_POWER_KW,
      { key: "screen_mesh", labelFa: "توری سرند", labelEn: "Screen Mesh", type: "TEXT" },
      { key: "vibration_type", labelFa: "نوع ارتعاش", labelEn: "Vibration Type", type: "TEXT" },
      YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §20 CONVEYOR ─────────────────────────────────────────────
  {
    slugCandidates: ["conveyor-belt", "belt-conveyor", "sizing-conveyor"],
    label: "Conveyor",
    attributes: [
      { key: "belt_width", labelFa: "عرض تسمه", labelEn: "Belt Width", type: "DECIMAL", unit: "MM", filterable: true },
      { key: "belt_length", labelFa: "طول تسمه", labelEn: "Belt Length", type: "DECIMAL", unit: "M" },
      { key: "capacity", labelFa: "ظرفیت", labelEn: "Capacity", type: "DECIMAL", unit: "T/HOUR", filterable: true },
      { key: "belt_speed", labelFa: "سرعت تسمه", labelEn: "Belt Speed", type: "DECIMAL", unit: "M/S" },
      MOTOR_POWER_KW,
      { key: "motor_brand", labelFa: "برند موتور", labelEn: "Motor Brand", type: "TEXT" },
      { key: "inclination", labelFa: "زاویه شیب", labelEn: "Inclination", type: "DECIMAL", unit: "DEG" },
      { key: "belt_type", labelFa: "نوع تسمه", labelEn: "Belt Type", type: "TEXT" },
      { key: "frame_type", labelFa: "نوع قاب", labelEn: "Frame Type", type: "TEXT" },
      YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §21 CRANE ────────────────────────────────────────────────
  {
    slugCandidates: ["crane"],
    label: "Crane",
    requiredKeys: ["crane_type", "lifting_capacity", "max_lift_height", "operating_hours", "condition"],
    attributes: [
      { key: "crane_type", labelFa: "نوع جرثقیل", labelEn: "Crane Type", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["برجی", "چرخدار", "زنجیری", "متحرک", "سقفی", "کشنده"] },
      LIFTING_CAPACITY,
      MAX_LIFT_HEIGHT,
      { key: "boom_length", labelFa: "طول بازو", labelEn: "Boom Length", type: "DECIMAL", unit: "M" },
      { key: "jib_length", labelFa: "طول جیب", labelEn: "Jib Length", type: "DECIMAL", unit: "M" },
      { key: "working_radius", labelFa: "شعاع کاری", labelEn: "Working Radius", type: "DECIMAL", unit: "M" },
      OPERATING_WEIGHT, ENGINE_POWER, OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "boom_type", labelFa: "نوع بازو", labelEn: "Boom Type", type: "TEXT" },
      { key: "jib_type", labelFa: "نوع جیب", labelEn: "Jib Type", type: "TEXT" },
      { key: "counterweight", labelFa: "وزنه تعادل", labelEn: "Counterweight", type: "DECIMAL", unit: "TON" },
      { key: "outrigger_type", labelFa: "نوع جک", labelEn: "Outrigger Type", type: "TEXT" },
      { key: "chassis_type", labelFa: "نوع شاسی", labelEn: "Chassis Type", type: "TEXT" },
      { key: "load_chart_available", labelFa: "نمودار بار موجود", labelEn: "Load Chart Available", type: "BOOLEAN" },
      { key: "inspection_certificate", labelFa: "گواهینامه بازرسی", labelEn: "Inspection Certificate", type: "BOOLEAN" },
      { key: "last_inspection_date", labelFa: "تاریخ آخرین بازرسی", labelEn: "Last Inspection Date", type: "DATE" },
      { key: "certificate_expiry", labelFa: "انقضای گواهینامه", labelEn: "Certificate Expiry", type: "DATE" },
    ],
  },

  // ─── §22 FORKLIFT ─────────────────────────────────────────────
  {
    slugCandidates: ["forklift"],
    label: "Forklift",
    requiredKeys: ["lifting_capacity", "lift_height", "fuel_type", "condition"],
    attributes: [
      LIFTING_CAPACITY,
      { key: "lift_height", labelFa: "ارتفاع بالابرده", labelEn: "Lift Height", type: "DECIMAL", unit: "M", filterable: true },
      { key: "mast_type", labelFa: "نوع دکل", labelEn: "Mast Type", type: "TEXT" },
      { key: "mast_height", labelFa: "ارتفاع دکل", labelEn: "Mast Height", type: "DECIMAL", unit: "M" },
      { key: "fork_length", labelFa: "طول شاخک", labelEn: "Fork Length", type: "DECIMAL", unit: "MM" },
      { key: "fork_width", labelFa: "عرض شاخک", labelEn: "Fork Width", type: "DECIMAL", unit: "MM" },
      TURNING_RADIUS, OPERATING_WEIGHT, ENGINE_POWER,
      { key: "fuel_type", labelFa: "نوع سوخت", labelEn: "Fuel Type", type: "SELECT",
        filterable: true, options: ["DIESEL", "LPG", "ELECTRIC", "GASOLINE"] },
      { key: "battery_capacity", labelFa: "ظرفیت باتری", labelEn: "Battery Capacity", type: "DECIMAL", unit: "KWH" },
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §23 TELEHANDLER ──────────────────────────────────────────
  {
    slugCandidates: ["reach-stacker"],
    label: "Telehandler / Reach Stacker",
    attributes: [
      LIFTING_CAPACITY,
      { key: "max_lift_height", labelFa: "حداکثر ارتفاع بالا", labelEn: "Max Lift Height", type: "DECIMAL", unit: "M" },
      { key: "max_reach", labelFa: "حداکثر برد", labelEn: "Max Reach", type: "DECIMAL", unit: "M" },
      OPERATING_WEIGHT, ENGINE_POWER,
      { key: "fork_capacity", labelFa: "ظرفیت شاخک", labelEn: "Fork Capacity", type: "DECIMAL", unit: "KG" },
      { key: "boom_type", labelFa: "نوع بازو", labelEn: "Boom Type", type: "TEXT" },
      { key: "attachment_type", labelFa: "نوع متعلقه", labelEn: "Attachment Type", type: "TEXT" },
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §24 ROLLER ───────────────────────────────────────────────
  {
    slugCandidates: ["road-roller"],
    label: "Road Roller",
    attributes: [
      { key: "roller_type", labelFa: "نوع غلتک", labelEn: "Roller Type", type: "SELECT",
        filterable: true, visibleOnCard: true,
        options: ["SINGLE_DRUM", "DOUBLE_DRUM", "PNEUMATIC", "VIBRATORY"] },
      OPERATING_WEIGHT,
      { key: "drum_width", labelFa: "عرض درام", labelEn: "Drum Width", type: "DECIMAL", unit: "MM" },
      { key: "drum_diameter", labelFa: "قطر درام", labelEn: "Drum Diameter", type: "DECIMAL", unit: "MM" },
      { key: "vibration_frequency", labelFa: "فرکانس ارتعاش", labelEn: "Vibration Frequency", type: "DECIMAL", unit: "HZ" },
      { key: "centrifugal_force", labelFa: "نیروی گریز از مرکز", labelEn: "Centrifugal Force", type: "DECIMAL", unit: "KN" },
      ENGINE_POWER, TRAVEL_SPEED, OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §25 ASPHALT FINISHER ─────────────────────────────────────
  {
    slugCandidates: ["asphalt-finisher", "asphalt-machinery"],
    label: "Asphalt Finisher",
    attributes: [
      { key: "paving_width", labelFa: "عرض پاشش", labelEn: "Paving Width", type: "DECIMAL", unit: "M" },
      { key: "max_paving_width", labelFa: "حداکثر عرض پاشش", labelEn: "Max Paving Width", type: "DECIMAL", unit: "M" },
      { key: "paving_thickness", labelFa: "ضخامت پاشش", labelEn: "Paving Thickness", type: "DECIMAL", unit: "MM" },
      { key: "paving_capacity", labelFa: "ظرفیت پاشش", labelEn: "Paving Capacity", type: "DECIMAL", unit: "T/HOUR" },
      { key: "hopper_capacity", labelFa: "گنجایش هاپر", labelEn: "Hopper Capacity", type: "DECIMAL", unit: "TON" },
      ENGINE_POWER, ENGINE_BRAND, OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §26 CONCRETE MACHINERY ───────────────────────────────────
  {
    slugCandidates: ["concrete-machinery"],
    label: "Concrete Machinery (pump + mixer)",
    attributes: [
      { key: "pump_type", labelFa: "نوع پمپ", labelEn: "Pump Type", type: "SELECT",
        filterable: true, options: ["بوم", "خطی", "شاسی‌دار"] },
      { key: "max_output", labelFa: "حداکثر خروجی", labelEn: "Max Output", type: "DECIMAL", unit: "M3H", filterable: true },
      { key: "max_pressure", labelFa: "حداکثر فشار", labelEn: "Max Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "horizontal_reach", labelFa: "برد افقی", labelEn: "Horizontal Reach", type: "DECIMAL", unit: "M" },
      { key: "vertical_reach", labelFa: "برد عمودی", labelEn: "Vertical Reach", type: "DECIMAL", unit: "M" },
      { key: "pipeline_diameter", labelFa: "قطر لوله", labelEn: "Pipeline Diameter", type: "DECIMAL", unit: "MM" },
      { key: "hopper_capacity", labelFa: "گنجایش هاپر", labelEn: "Hopper Capacity", type: "DECIMAL", unit: "M3" },
      ENGINE_POWER, OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "drum_capacity", labelFa: "گنجایش دیگ", labelEn: "Drum Capacity", type: "DECIMAL", unit: "M3" },
      { key: "mixing_capacity", labelFa: "ظرفیت اختلاط", labelEn: "Mixing Capacity", type: "DECIMAL", unit: "M3" },
      { key: "discharge_capacity", labelFa: "ظرفیت تخلیه", labelEn: "Discharge Capacity", type: "DECIMAL", unit: "M3" },
      { key: "rotation_speed", labelFa: "سرعت چرخش", labelEn: "Rotation Speed", type: "DECIMAL", unit: "RPM" },
    ],
  },

  // ─── §27 GENERATOR ────────────────────────────────────────────
  {
    slugCandidates: ["generator"],
    label: "Generator",
    requiredKeys: ["rated_power_kva", "voltage", "phase", "fuel_type", "engine_brand", "condition"],
    attributes: [
      { key: "generator_type", labelFa: "نوع ژنراتور", labelEn: "Generator Type", type: "SELECT",
        filterable: true, options: ["دیزل", "گاز", "دوگانه‌سوز", "بنزینی"] },
      { key: "rated_power_kva", labelFa: "توان نامی (kVa)", labelEn: "Rated Power (kVa)", type: "DECIMAL", unit: "KVA", filterable: true, sortable: true, visibleOnCard: true, aiRelevant: true },
      { key: "rated_power_kw", labelFa: "توان نامی (kW)", labelEn: "Rated Power (kW)", type: "DECIMAL", unit: "KW" },
      { key: "standby_power", labelFa: "توان standby", labelEn: "Standby Power", type: "DECIMAL", unit: "KVA" },
      { key: "prime_power", labelFa: "توان prime", labelEn: "Prime Power", type: "DECIMAL", unit: "KVA" },
      { key: "voltage", labelFa: "ولتاژ", labelEn: "Voltage", type: "INTEGER", unit: "V", filterable: true },
      { key: "frequency", labelFa: "فرکانس", labelEn: "Frequency", type: "INTEGER", unit: "HZ" },
      { key: "phase", labelFa: "فاز", labelEn: "Phase", type: "SELECT",
        filterable: true, options: ["تک‌فاز", "سه‌فاز"] },
      { key: "power_factor", labelFa: "ضریب توان", labelEn: "Power Factor", type: "DECIMAL" },
      FUEL_TYPE_MACHINE,
      { key: "fuel_tank_capacity", labelFa: "ظرفیت مخزن", labelEn: "Fuel Tank Capacity", type: "DECIMAL", unit: "L" },
      { key: "fuel_consumption", labelFa: "مصرف سوخت", labelEn: "Fuel Consumption", type: "DECIMAL", unit: "L/HOUR" },
      ENGINE_BRAND, ENGINE_MODEL,
      { key: "alternator_brand", labelFa: "برند آلترناتور", labelEn: "Alternator Brand", type: "TEXT" },
      { key: "alternator_model", labelFa: "مدل آلترناتور", labelEn: "Alternator Model", type: "TEXT" },
      { key: "controller_brand", labelFa: "برند کنترلر", labelEn: "Controller Brand", type: "TEXT" },
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
      { key: "automatic_start", labelFa: "استارت خودکار", labelEn: "Automatic Start", type: "BOOLEAN" },
      { key: "ats_compatible", labelFa: "سازگار با ATS", labelEn: "ATS Compatible", type: "BOOLEAN" },
      { key: "remote_monitoring", labelFa: "پایش از راه دور", labelEn: "Remote Monitoring", type: "BOOLEAN" },
      { key: "soundproof", labelFa: "عایق صوتی", labelEn: "Soundproof", type: "BOOLEAN" },
      { key: "canopy", labelFa: "کانوپی", labelEn: "Canopy", type: "BOOLEAN" },
    ],
  },

  // ─── §28 COMPRESSOR ───────────────────────────────────────────
  {
    slugCandidates: ["compressor"],
    label: "Compressor",
    requiredKeys: ["compressor_type", "air_flow", "working_pressure", "condition"],
    attributes: [
      { key: "compressor_type", labelFa: "نوع کمپرسور", labelEn: "Compressor Type", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["SCREW", "PISTON", "CENTRIFUGAL", "RECIPROCATING", "PORTABLE"] },
      { key: "air_flow", labelFa: "دبی هوا", labelEn: "Air Flow", type: "DECIMAL", unit: "M3H", filterable: true },
      { key: "working_pressure", labelFa: "فشار کاری", labelEn: "Working Pressure", type: "DECIMAL", unit: "BAR", filterable: true },
      { key: "max_pressure", labelFa: "حداکثر فشار", labelEn: "Max Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "tank_capacity", labelFa: "گنجایش مخزن", labelEn: "Tank Capacity", type: "DECIMAL", unit: "L" },
      MOTOR_POWER_KW,
      { key: "engine_power", labelFa: "قدرت موتور", labelEn: "Engine Power", type: "DECIMAL", unit: "HP" },
      ENGINE_BRAND, FUEL_TYPE_MACHINE, OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §29 PUMP ─────────────────────────────────────────────────
  {
    slugCandidates: ["industrial-pumps", "hydraulic-pump"],
    label: "Pump",
    attributes: [
      { key: "pump_type", labelFa: "نوع پمپ", labelEn: "Pump Type", type: "TEXT", filterable: true },
      { key: "flow_rate", labelFa: "دبی جریان", labelEn: "Flow Rate", type: "DECIMAL", unit: "LPM", filterable: true },
      { key: "head", labelFa: "هد پمپ", labelEn: "Head", type: "DECIMAL", unit: "M" },
      { key: "pressure", labelFa: "فشار", labelEn: "Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "inlet_diameter", labelFa: "قطر ورودی", labelEn: "Inlet Diameter", type: "DECIMAL", unit: "MM" },
      { key: "outlet_diameter", labelFa: "قطر خروجی", labelEn: "Outlet Diameter", type: "DECIMAL", unit: "MM" },
      MOTOR_POWER_KW,
      { key: "motor_brand", labelFa: "برند موتور", labelEn: "Motor Brand", type: "TEXT" },
      { key: "rpm", labelFa: "دور موتور", labelEn: "RPM", type: "INTEGER", unit: "RPM" },
      { key: "fluid_type", labelFa: "نوع سیال", labelEn: "Fluid Type", type: "TEXT" },
      { key: "temperature_range", labelFa: "محدوده دما", labelEn: "Temperature Range", type: "TEXT" },
      { key: "material", labelFa: "جنس بدنه", labelEn: "Material", type: "TEXT" },
      YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §30 HYDRAULIC EQUIPMENT ──────────────────────────────────
  {
    slugCandidates: ["hydraulic-pump", "hydraulic-valve", "hydraulic-parts"],
    label: "Hydraulic Equipment",
    attributes: [
      { key: "component_type", labelFa: "نوع قطعه", labelEn: "Component Type", type: "SELECT",
        filterable: true, options: ["PUMP", "MOTOR", "VALVE", "CYLINDER", "POWER_UNIT", "CONTROL_VALVE"] },
      BRAND, MODEL,
      { key: "part_number", labelFa: "شماره قطعه", labelEn: "Part Number", type: "TEXT", filterable: true, searchable: true },
      { key: "pressure", labelFa: "فشار", labelEn: "Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "max_pressure", labelFa: "حداکثر فشار", labelEn: "Max Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "flow_rate", labelFa: "دبی", labelEn: "Flow Rate", type: "DECIMAL", unit: "LPM" },
      { key: "displacement", labelFa: "حجم جابجایی", labelEn: "Displacement", type: "DECIMAL", unit: "CC" },
      { key: "port_size", labelFa: "اندازه پورت", labelEn: "Port Size", type: "TEXT" },
      { key: "rotation", labelFa: "جهت چرخش", labelEn: "Rotation", type: "TEXT" },
      { key: "material", labelFa: "جنس", labelEn: "Material", type: "TEXT" },
      { key: "seal_type", labelFa: "نوع سیل", labelEn: "Seal Type", type: "TEXT" },
      { key: "temperature_range", labelFa: "محدوده دما", labelEn: "Temperature Range", type: "TEXT" },
      CONDITION_MACHINE,
    ],
  },

  // ─── §31 SPARE PARTS ──────────────────────────────────────────
  {
    slugCandidates: ["spare-parts"],
    label: "Spare Parts",
    requiredKeys: ["part_number", "condition", "brand"],
    attributes: [
      PART_NUMBER, OEM_NUMBER,
      { key: "manufacturer_part_number", labelFa: "شماره قطعه سازنده", labelEn: "Manufacturer Part Number", type: "TEXT" },
      { key: "aftermarket_number", labelFa: "شماره قطعه aftermarket", labelEn: "Aftermarket Number", type: "TEXT" },
      SERIAL_NUMBER,
      { key: "part_type", labelFa: "نوع قطعه", labelEn: "Part Type", type: "TEXT", filterable: true },
      BRAND, MANUFACTURER, COUNTRY_OF_ORIGIN,
      { key: "compatible_brands", labelFa: "برندهای سازگار", labelEn: "Compatible Brands", type: "MULTI_SELECT" },
      { key: "compatible_models", labelFa: "مدل‌های سازگار", labelEn: "Compatible Models", type: "TEXT", searchable: true },
      { key: "compatible_machine", labelFa: "ماشین‌آلات سازگار", labelEn: "Compatible Machines", type: "TEXT" },
      { key: "compatible_engine", labelFa: "موتورهای سازگار", labelEn: "Compatible Engines", type: "TEXT" },
      { key: "compatible_generation", labelFa: "نسل‌های سازگار", labelEn: "Compatible Generations", type: "TEXT" },
      { key: "condition", labelFa: "وضعیت", labelEn: "Condition", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["نو", "OEM", "Aftermarket", "دست‌دوم", "بازسازی", "بازسازی‌شده"] },
      { key: "warranty", labelFa: "گارانتی", labelEn: "Warranty", type: "SELECT",
        filterable: true, options: ["دارد", "ندارد"] },
      { key: "quantity", labelFa: "تعداد", labelEn: "Quantity", type: "INTEGER" },
      { key: "unit", labelFa: "واحد", labelEn: "Unit", type: "SELECT",
        options: ["PCS", "SET", "TON", "KG", "LITER", "M3"] },
      { key: "price", labelFa: "قیمت", labelEn: "Price", type: "CURRENCY" },
      { key: "currency", labelFa: "ارز", labelEn: "Currency", type: "TEXT" },
      { key: "minimum_order_quantity", labelFa: "حداقل سفارش", labelEn: "Minimum Order Quantity", type: "INTEGER" },
      { key: "availability", labelFa: "موجودی", labelEn: "Availability", type: "SELECT",
        filterable: true, options: ["موجود", "سفارشی", "ناموجود"] },
      { key: "lead_time", labelFa: "زمان تحویل", labelEn: "Lead Time", type: "TEXT" },
    ],
  },

  // ─── §32 BUCKET (attachment) ──────────────────────────────────
  {
    slugCandidates: ["bucket", "rock-bucket"],
    label: "Bucket (attachment)",
    attributes: [
      { key: "bucket_type", labelFa: "نوع باکت", labelEn: "Bucket Type", type: "SELECT",
        filterable: true, visibleOnCard: true,
        options: ["GENERAL_PURPOSE", "ROCK", "HEAVY_DUTY", "DITCH", "TRAPEZOIDAL", "SKELETON", "TILT", "V", "CRUSHER"] },
      { key: "capacity", labelFa: "گنجایش", labelEn: "Capacity", type: "DECIMAL", unit: "M3", filterable: true },
      { key: "width", labelFa: "عرض", labelEn: "Width", type: "DECIMAL", unit: "MM" },
      { key: "height", labelFa: "ارتفاع", labelEn: "Height", type: "DECIMAL", unit: "MM" },
      { key: "depth", labelFa: "عمق", labelEn: "Depth", type: "DECIMAL", unit: "MM" },
      { key: "weight", labelFa: "وزن", labelEn: "Weight", type: "DECIMAL", unit: "KG" },
      { key: "material", labelFa: "جنس", labelEn: "Material", type: "TEXT" },
      { key: "teeth_count", labelFa: "تعداد دندانه", labelEn: "Teeth Count", type: "INTEGER" },
      { key: "tooth_type", labelFa: "نوع دندانه", labelEn: "Tooth Type", type: "TEXT" },
      { key: "pin_diameter", labelFa: "قطر پین", labelEn: "Pin Diameter", type: "DECIMAL", unit: "MM", filterable: true },
      { key: "pin_spacing", labelFa: "فاصله پین", labelEn: "Pin Spacing", type: "DECIMAL", unit: "MM" },
      { key: "mounting_type", labelFa: "نوع اتصال", labelEn: "Mounting Type", type: "TEXT" },
      { key: "compatible_machine", labelFa: "ماشین‌های سازگار", labelEn: "Compatible Machines", type: "TEXT", searchable: true },
      { key: "compatible_models", labelFa: "مدل‌های سازگار", labelEn: "Compatible Models", type: "TEXT", searchable: true },
      CONDITION_MACHINE,
    ],
  },

  // ─── §33 HYDRAULIC HAMMER ─────────────────────────────────────
  {
    slugCandidates: ["hydraulic-breaker", "hammer"],
    label: "Hydraulic Hammer",
    attributes: [
      { key: "operating_weight", labelFa: "وزن عملیاتی", labelEn: "Operating Weight", type: "DECIMAL", unit: "KG" },
      { key: "tool_diameter", labelFa: "قطر ابزار", labelEn: "Tool Diameter", type: "DECIMAL", unit: "MM" },
      { key: "impact_energy", labelFa: "انرژی ضربه", labelEn: "Impact Energy", type: "DECIMAL", unit: "J" },
      { key: "blow_rate", labelFa: "نرخ ضربه", labelEn: "Blow Rate", type: "DECIMAL", unit: "BPM" },
      { key: "required_flow", labelFa: "دبی موردنیاز", labelEn: "Required Flow", type: "DECIMAL", unit: "LPM" },
      { key: "working_pressure", labelFa: "فشار کاری", labelEn: "Working Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "oil_flow", labelFa: "دبی روغن", labelEn: "Oil Flow", type: "DECIMAL", unit: "LPM" },
      { key: "carrier_weight", labelFa: "وزن ماشین حامل", labelEn: "Carrier Weight", type: "DECIMAL", unit: "TON" },
      { key: "tool_length", labelFa: "طول ابزار", labelEn: "Tool Length", type: "DECIMAL", unit: "MM" },
      { key: "weight", labelFa: "وزن", labelEn: "Weight", type: "DECIMAL", unit: "KG" },
      BRAND, MODEL, CONDITION_MACHINE,
    ],
  },

  // ─── §34 TIRE ─────────────────────────────────────────────────
  {
    slugCandidates: ["tires-tracks"],
    label: "Tire",
    attributes: [
      { key: "tire_type", labelFa: "نوع تایر", labelEn: "Tire Type", type: "TEXT", filterable: true },
      { key: "tire_size", labelFa: "سایز تایر", labelEn: "Tire Size", type: "TEXT", filterable: true, searchable: true, aiRelevant: true },
      { key: "rim_size", labelFa: "سایز رینگ", labelEn: "Rim Size", type: "TEXT" },
      { key: "load_index", labelFa: "اندیس بار", labelEn: "Load Index", type: "TEXT" },
      { key: "speed_rating", labelFa: "رده سرعت", labelEn: "Speed Rating", type: "TEXT" },
      { key: "ply_rating", labelFa: "رده لایه", labelEn: "Ply Rating", type: "TEXT" },
      { key: "pattern", labelFa: "نوع آج", labelEn: "Pattern", type: "TEXT" },
      { key: "application", labelFa: "کاربرد", labelEn: "Application", type: "SELECT",
        filterable: true, visibleOnCard: true,
        options: ["OTR", "MINING", "CONSTRUCTION", "AGRICULTURE", "TRUCK", "INDUSTRIAL"] },
      { key: "position", labelFa: "موقعیت نصب", labelEn: "Position", type: "TEXT" },
      { key: "tube_type", labelFa: "نوع تیوپ", labelEn: "Tube Type", type: "SELECT",
        options: ["تیوبی", "تیوبلس"] },
      { key: "tread_depth", labelFa: "عمق آج", labelEn: "Tread Depth", type: "DECIMAL", unit: "MM" },
      { key: "manufacturing_date", labelFa: "تاریخ تولید", labelEn: "Manufacturing Date", type: "DATE" },
      CONDITION_MACHINE,
    ],
  },

  // ─── §35 TRUCK / VEHICLE ──────────────────────────────────────
  {
    slugCandidates: ["truck", "commercial-vehicle"],
    label: "Truck / Vehicle",
    requiredKeys: ["vehicle_type", "engine_power", "mileage", "condition"],
    attributes: [
      { key: "vehicle_type", labelFa: "نوع خودرو", labelEn: "Vehicle Type", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["کامیون", "کمپرسی", "کشنده", "تریلر", "وانت"] },
      BRAND, MODEL, YEAR, CONDITION_MACHINE,
      { key: "mileage", labelFa: "کیلومتر کارکرد", labelEn: "Mileage", type: "INTEGER", unit: "KM", filterable: true, sortable: true, visibleOnCard: true },
      ENGINE_POWER,
      { key: "engine_displacement", labelFa: "حجم موتور", labelEn: "Engine Displacement", type: "DECIMAL", unit: "L" },
      FUEL_TYPE_MACHINE,
      { key: "transmission_type", labelFa: "نوع گیربکس", labelEn: "Transmission Type", type: "TEXT" },
      DRIVE_TYPE,
      { key: "axle_count", labelFa: "تعداد اکسل", labelEn: "Axle Count", type: "INTEGER", filterable: true },
      { key: "axle_configuration", labelFa: "پیکربندی اکسل", labelEn: "Axle Configuration", type: "TEXT", filterable: true },
      { key: "gross_weight", labelFa: "وزن ناخالص", labelEn: "Gross Weight", type: "DECIMAL", unit: "TON" },
      { key: "payload", labelFa: "بار مفید", labelEn: "Payload", type: "DECIMAL", unit: "TON", filterable: true },
      { key: "wheelbase", labelFa: "فاصله محورها", labelEn: "Wheelbase", type: "DECIMAL", unit: "MM" },
      TIRE_SIZE,
      { key: "cab_type", labelFa: "نوع کابین", labelEn: "Cab Type", type: "TEXT" },
      { key: "sleeping_cab", labelFa: "کابین خواب", labelEn: "Sleeping Cab", type: "BOOLEAN" },
      { key: "air_conditioning", labelFa: "تهویه مطبوع", labelEn: "Air Conditioning", type: "BOOLEAN" },
      { key: "seat_count", labelFa: "تعداد صندلی", labelEn: "Seat Count", type: "INTEGER" },
    ],
  },

  // ─── §36 TRACTOR ──────────────────────────────────────────────
  {
    slugCandidates: ["tractor", "agricultural-تراکتور"],
    label: "Tractor",
    requiredKeys: ["tractor_type", "engine_power", "operating_hours", "condition"],
    attributes: [
      { key: "tractor_type", labelFa: "نوع تراکتور", labelEn: "Tractor Type", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["باغی", "زراعی", "سنگین", "تخصصی"] },
      ENGINE_POWER, ENGINE_BRAND, ENGINE_MODEL,
      { key: "drive_type", labelFa: "نوع انتقال قدرت", labelEn: "Drive Type", type: "SELECT",
        filterable: true, options: ["دو چرخ محرک", "چهار چرخ محرک", "کششی"] },
      { key: "transmission_type", labelFa: "نوع گیربکس", labelEn: "Transmission Type", type: "TEXT" },
      { key: "pto_power", labelFa: "توان PTO", labelEn: "PTO Power", type: "DECIMAL", unit: "HP" },
      { key: "pto_speed", labelFa: "سرعت PTO", labelEn: "PTO Speed", type: "INTEGER", unit: "RPM" },
      { key: "hydraulic_flow", labelFa: "دبی هیدرولیک", labelEn: "Hydraulic Flow", type: "DECIMAL", unit: "LPM" },
      { key: "hydraulic_lift_capacity", labelFa: "ظرفیت بالابرده هیدرولیک", labelEn: "Hydraulic Lift Capacity", type: "DECIMAL", unit: "KG" },
      { key: "fuel_tank_capacity", labelFa: "ظرفیت مخزن", labelEn: "Fuel Tank Capacity", type: "DECIMAL", unit: "L" },
      OPERATING_WEIGHT,
      { key: "tire_size_front", labelFa: "سایز تایر جلو", labelEn: "Front Tire Size", type: "TEXT" },
      { key: "tire_size_rear", labelFa: "سایز تایر عقب", labelEn: "Rear Tire Size", type: "TEXT" },
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §37 COMBINE ──────────────────────────────────────────────
  {
    slugCandidates: ["combine-harvester", "agricultural-کمباین"],
    label: "Combine Harvester",
    attributes: [
      ENGINE_POWER, ENGINE_BRAND,
      { key: "header_width", labelFa: "عرض هدر", labelEn: "Header Width", type: "DECIMAL", unit: "M" },
      { key: "grain_tank_capacity", labelFa: "گنجایش مخزن دانه", labelEn: "Grain Tank Capacity", type: "DECIMAL", unit: "M3" },
      { key: "unloading_rate", labelFa: "نرخ تخلیه", labelEn: "Unloading Rate", type: "DECIMAL", unit: "M3/MIN" },
      { key: "harvesting_capacity", labelFa: "ظرفیت برداشت", labelEn: "Harvesting Capacity", type: "DECIMAL", unit: "T/HOUR" },
      OPERATING_HOURS, YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §38 AGRICULTURAL IMPLEMENT ───────────────────────────────
  {
    slugCandidates: ["tillage-equipment", "planting-equipment", "harvesting-equipment"],
    label: "Agricultural Implement",
    attributes: [
      { key: "implement_type", labelFa: "نوع پیاده‌رو", labelEn: "Implement Type", type: "TEXT", filterable: true },
      { key: "working_width", labelFa: "عرض کاری", labelEn: "Working Width", type: "DECIMAL", unit: "M" },
      { key: "working_depth", labelFa: "عمق کاری", labelEn: "Working Depth", type: "DECIMAL", unit: "MM" },
      { key: "number_of_rows", labelFa: "تعداد ردیف", labelEn: "Number of Rows", type: "INTEGER" },
      { key: "power_requirement", labelFa: "توان موردنیاز", labelEn: "Power Requirement", type: "DECIMAL", unit: "HP" },
      { key: "capacity", labelFa: "ظرفیت", labelEn: "Capacity", type: "DECIMAL" },
      { key: "weight", labelFa: "وزن", labelEn: "Weight", type: "DECIMAL", unit: "KG" },
      { key: "attachment_type", labelFa: "نوع اتصال", labelEn: "Attachment Type", type: "TEXT" },
      { key: "compatible_tractor_power", labelFa: "توان تراکتور سازگار", labelEn: "Compatible Tractor Power", type: "DECIMAL", unit: "HP" },
      YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §39 MINERAL ──────────────────────────────────────────────
  {
    slugCandidates: ["minerals-materials", "iron-ore", "copper-ore", "coal", "limestone", "gypsum", "sand", "gravel", "stone-block", "basalt", "granite", "marble", "ceramic", "glass", "cement-clinker", "steel-materials"],
    label: "Mineral",
    requiredKeys: ["mineral_type", "grade", "quantity", "unit", "mine_location"],
    attributes: [
      { key: "mineral_type", labelFa: "نوع ماده معدنی", labelEn: "Mineral Type", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["سنگ آهن", "مس", "سرب", "روی", "کرومیت", "منگنز", "باریت", "سیلیس", "بنتونیت", "کائولن", "گچ", "سنگ آهک", "سنگ ساختمانی", "شن و ماسه", "سایر"] },
      { key: "commercial_name", labelFa: "نام تجاری", labelEn: "Commercial Name", type: "TEXT" },
      { key: "chemical_name", labelFa: "نام شیمیایی", labelEn: "Chemical Name", type: "TEXT" },
      { key: "grade", labelFa: "عیار / درجه", labelEn: "Grade", type: "TEXT", filterable: true, aiRelevant: true },
      { key: "purity", labelFa: "خلوص", labelEn: "Purity", type: "DECIMAL", unit: "PCT" },
      { key: "analysis", labelFa: "آنالیز", labelEn: "Analysis", type: "TEXT", searchable: true },
      { key: "chemical_composition", labelFa: "ترکیب شیمیایی", labelEn: "Chemical Composition", type: "TEXT" },
      { key: "moisture", labelFa: "رطوبت", labelEn: "Moisture", type: "DECIMAL", unit: "PCT" },
      { key: "ash", labelFa: "خاکستر", labelEn: "Ash", type: "DECIMAL", unit: "PCT" },
      { key: "particle_size", labelFa: "اندازه ذره", labelEn: "Particle Size", type: "TEXT" },
      { key: "density", labelFa: "چگالی", labelEn: "Density", type: "DECIMAL", unit: "KG/M3" },
      { key: "quantity", labelFa: "مقدار", labelEn: "Quantity", type: "DECIMAL", filterable: true, sortable: true, visibleOnCard: true },
      { key: "unit", labelFa: "واحد", labelEn: "Unit", type: "SELECT",
        filterable: true, options: ["TON", "KG", "M3"] },
      { key: "monthly_production_capacity", labelFa: "ظرفیت تولید ماهانه", labelEn: "Monthly Production Capacity", type: "DECIMAL", unit: "TON" },
      { key: "annual_production_capacity", labelFa: "ظرفیت تولید سالانه", labelEn: "Annual Production Capacity", type: "DECIMAL", unit: "TON" },
      { key: "minimum_order_quantity", labelFa: "حداقل سفارش", labelEn: "Minimum Order Quantity", type: "DECIMAL", unit: "TON", filterable: true },
      { key: "available_quantity", labelFa: "مقدار موجود", labelEn: "Available Quantity", type: "DECIMAL" },
      { key: "mine", labelFa: "نام معدن", labelEn: "Mine", type: "TEXT" },
      { key: "mine_location", labelFa: "محل معدن", labelEn: "Mine Location", type: "TEXT", filterable: true },
      { key: "province", labelFa: "استان", labelEn: "Province", type: "TEXT", filterable: true },
      { key: "country", labelFa: "کشور", labelEn: "Country", type: "TEXT" },
      { key: "origin", labelFa: "مبدا", labelEn: "Origin", type: "TEXT" },
      { key: "price", labelFa: "قیمت", labelEn: "Price", type: "CURRENCY" },
      { key: "currency", labelFa: "ارز", labelEn: "Currency", type: "TEXT" },
      { key: "pricing_unit", labelFa: "واحد قیمت", labelEn: "Pricing Unit", type: "TEXT" },
      { key: "payment_terms", labelFa: "شرایط پرداخت", labelEn: "Payment Terms", type: "TEXT" },
      { key: "delivery_terms", labelFa: "شرایط تحویل", labelEn: "Delivery Terms", type: "SELECT",
        filterable: true, options: ["EXW", "FOB", "CIF", "تحویل درب معدن", "تحویل مقصد"] },
      { key: "incoterm", labelFa: "اینکوترم", labelEn: "Incoterm", type: "TEXT" },
      { key: "packaging", labelFa: "بسته‌بندی", labelEn: "Packaging", type: "TEXT" },
    ],
  },

  // ─── §46 INDUSTRIAL EQUIPMENT ─────────────────────────────────
  {
    slugCandidates: ["industrial-equipment"],
    label: "Industrial Equipment",
    attributes: [
      { key: "equipment_type", labelFa: "نوع تجهیز", labelEn: "Equipment Type", type: "TEXT", filterable: true },
      BRAND, MODEL, MANUFACTURER,
      { key: "capacity", labelFa: "ظرفیت", labelEn: "Capacity", type: "DECIMAL" },
      { key: "power", labelFa: "توان", labelEn: "Power", type: "DECIMAL", unit: "KW" },
      { key: "voltage", labelFa: "ولتاژ", labelEn: "Voltage", type: "INTEGER", unit: "V" },
      { key: "frequency", labelFa: "فرکانس", labelEn: "Frequency", type: "INTEGER", unit: "HZ" },
      { key: "pressure", labelFa: "فشار", labelEn: "Pressure", type: "DECIMAL", unit: "BAR" },
      { key: "flow", labelFa: "دبی", labelEn: "Flow", type: "DECIMAL" },
      { key: "temperature", labelFa: "دما", labelEn: "Temperature", type: "DECIMAL", unit: "C" },
      { key: "material", labelFa: "جنس", labelEn: "Material", type: "TEXT" },
      { key: "dimensions", labelFa: "ابعاد", labelEn: "Dimensions", type: "TEXT" },
      { key: "weight", labelFa: "وزن", labelEn: "Weight", type: "DECIMAL", unit: "KG" },
      YEAR, CONDITION_MACHINE, OPERATING_HOURS, SERIAL_NUMBER,
    ],
  },

  // ─── §48 INDUSTRIAL ENGINE ────────────────────────────────────
  {
    slugCandidates: ["electric-motors", "engine-parts"],
    label: "Industrial Engine",
    attributes: [
      ENGINE_BRAND, ENGINE_MODEL,
      { key: "engine_type", labelFa: "نوع موتور", labelEn: "Engine Type", type: "SELECT",
        filterable: true, options: ["دیزل", "بنزینی", "گازی", "هیبریدی"] },
      { key: "power", labelFa: "توان", labelEn: "Power", type: "DECIMAL", unit: "HP" },
      { key: "torque", labelFa: "گشتاور", labelEn: "Torque", type: "DECIMAL", unit: "NM" },
      { key: "rpm", labelFa: "دور موتور", labelEn: "RPM", type: "INTEGER" },
      { key: "engine_displacement", labelFa: "حجم موتور", labelEn: "Displacement", type: "DECIMAL", unit: "L" },
      { key: "cylinder_count", labelFa: "تعداد سیلندر", labelEn: "Cylinder Count", type: "INTEGER" },
      FUEL_TYPE_MACHINE,
      { key: "cooling_type", labelFa: "نوع خنک‌کننده", labelEn: "Cooling Type", type: "SELECT",
        filterable: true, options: ["آب", "هوا"] },
      { key: "aspiration", labelFa: "نوع تنفس", labelEn: "Aspiration", type: "SELECT",
        options: ["تنفس طبیعی", "توربو", "سوپرشارژ"] },
      { key: "emission_standard", labelFa: "استاندارد آلایندگی", labelEn: "Emission Standard", type: "TEXT" },
      { key: "hours", labelFa: "ساعت کارکرد", labelEn: "Hours", type: "INTEGER", unit: "HOUR" },
      YEAR, CONDITION_MACHINE,
    ],
  },

  // ─── §49 GEARBOX ──────────────────────────────────────────────
  {
    slugCandidates: ["transmission-parts"],
    label: "Gearbox",
    attributes: [
      { key: "gearbox_type", labelFa: "نوع گیربکس", labelEn: "Gearbox Type", type: "TEXT", filterable: true },
      BRAND, MODEL,
      { key: "ratio", labelFa: "نسبت گیربکس", labelEn: "Ratio", type: "TEXT" },
      { key: "input_speed", labelFa: "سرعت ورودی", labelEn: "Input Speed", type: "INTEGER", unit: "RPM" },
      { key: "output_speed", labelFa: "سرعت خروجی", labelEn: "Output Speed", type: "INTEGER", unit: "RPM" },
      { key: "input_torque", labelFa: "گشتاور ورودی", labelEn: "Input Torque", type: "DECIMAL", unit: "NM" },
      { key: "max_torque", labelFa: "حداکثر گشتاور", labelEn: "Max Torque", type: "DECIMAL", unit: "NM" },
      { key: "power", labelFa: "توان", labelEn: "Power", type: "DECIMAL", unit: "KW" },
      { key: "mounting_type", labelFa: "نوع نصب", labelEn: "Mounting Type", type: "TEXT" },
      { key: "shaft_type", labelFa: "نوع شفت", labelEn: "Shaft Type", type: "TEXT" },
      CONDITION_MACHINE,
    ],
  },

  // ─── §50 BEARING ──────────────────────────────────────────────
  {
    slugCandidates: ["bearings"],
    label: "Bearing",
    attributes: [
      { key: "bearing_type", labelFa: "نوع بلبرینگ", labelEn: "Bearing Type", type: "TEXT", filterable: true },
      PART_NUMBER,
      { key: "inner_diameter", labelFa: "قطر داخلی", labelEn: "Inner Diameter", type: "DECIMAL", unit: "MM" },
      { key: "outer_diameter", labelFa: "قطر خارجی", labelEn: "Outer Diameter", type: "DECIMAL", unit: "MM" },
      { key: "width", labelFa: "عرض", labelEn: "Width", type: "DECIMAL", unit: "MM" },
      { key: "dynamic_load_rating", labelFa: "رتبه بار دینامیکی", labelEn: "Dynamic Load Rating", type: "DECIMAL", unit: "KN" },
      { key: "static_load_rating", labelFa: "رتبه بار استاتیک", labelEn: "Static Load Rating", type: "DECIMAL", unit: "KN" },
      { key: "speed_rating", labelFa: "حداکثر سرعت", labelEn: "Speed Rating", type: "INTEGER", unit: "RPM" },
      { key: "seal_type", labelFa: "نوع سیل", labelEn: "Seal Type", type: "TEXT" },
      { key: "clearance", labelFa: "لقی", labelEn: "Clearance", type: "TEXT" },
      { key: "material", labelFa: "جنس", labelEn: "Material", type: "TEXT" },
      CONDITION_MACHINE,
    ],
  },

  // ─── §51 FILTER ───────────────────────────────────────────────
  {
    slugCandidates: ["filters", "spare-parts-فیلتر-و-روغن"],
    label: "Filter",
    attributes: [
      { key: "filter_type", labelFa: "نوع فیلتر", labelEn: "Filter Type", type: "TEXT", filterable: true },
      PART_NUMBER, OEM_NUMBER,
      { key: "filter_media", labelFa: "ماده فیلتر", labelEn: "Filter Media", type: "TEXT" },
      { key: "filtration_rating", labelFa: "رتبه فیلتراسیون", labelEn: "Filtration Rating", type: "TEXT" },
      { key: "micron_rating", labelFa: "رتبه میکرون", labelEn: "Micron Rating", type: "DECIMAL", unit: "UM" },
      { key: "outer_diameter", labelFa: "قطر خارجی", labelEn: "Outer Diameter", type: "DECIMAL", unit: "MM" },
      { key: "inner_diameter", labelFa: "قطر داخلی", labelEn: "Inner Diameter", type: "DECIMAL", unit: "MM" },
      { key: "length", labelFa: "طول", labelEn: "Length", type: "DECIMAL", unit: "MM" },
      { key: "compatible_engine", labelFa: "موتورهای سازگار", labelEn: "Compatible Engines", type: "TEXT", searchable: true },
      { key: "compatible_machine", labelFa: "ماشین‌های سازگار", labelEn: "Compatible Machines", type: "TEXT", searchable: true },
      CONDITION_MACHINE,
    ],
  },

  // ─── §52 SERVICE ──────────────────────────────────────────────
  {
    slugCandidates: ["services", "repair", "inspection"],
    label: "Service",
    attributes: [
      { key: "service_type", labelFa: "نوع خدمت", labelEn: "Service Type", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["کارشناسی", "بازرسی", "تعمیر", "سرویس", "اورهال", "نصب", "آموزش", "مشاوره"] },
      { key: "specialization", labelFa: "تخصص", labelEn: "Specialization", type: "TEXT", filterable: true },
      { key: "supported_brands", labelFa: "برندهای پشتیبانی‌شده", labelEn: "Supported Brands", type: "MULTI_SELECT" },
      { key: "supported_models", labelFa: "مدل‌های پشتیبانی‌شده", labelEn: "Supported Models", type: "TEXT" },
      { key: "experience_years", labelFa: "سال‌های تجربه", labelEn: "Experience Years", type: "INTEGER", filterable: true, visibleOnCard: true },
      { key: "team_size", labelFa: "اندازه تیم", labelEn: "Team Size", type: "INTEGER" },
      { key: "service_area", labelFa: "محدوده خدمت", labelEn: "Service Area", type: "TEXT" },
      { key: "onsite_service", labelFa: "خدمت در محل", labelEn: "Onsite Service", type: "BOOLEAN", filterable: true },
      { key: "emergency_service", labelFa: "خدمت اضطراری", labelEn: "Emergency Service", type: "BOOLEAN", filterable: true },
      { key: "working_hours", labelFa: "ساعات کاری", labelEn: "Working Hours", type: "TEXT" },
      { key: "response_time", labelFa: "زمان پاسخ", labelEn: "Response Time", type: "TEXT" },
      WARRANTY,
      { key: "certification", labelFa: "گواهینامه", labelEn: "Certification", type: "TEXT" },
    ],
  },

  // ─── §53 TRANSPORT ────────────────────────────────────────────
  {
    slugCandidates: ["transport-logistics", "heavy-haulage"],
    label: "Transport",
    requiredKeys: ["origin", "destination", "cargo_type", "cargo_weight"],
    attributes: [
      { key: "origin", labelFa: "مبدا", labelEn: "Origin", type: "TEXT", required: true, filterable: true },
      { key: "destination", labelFa: "مقصد", labelEn: "Destination", type: "TEXT", required: true, filterable: true },
      { key: "cargo_type", labelFa: "نوع بار", labelEn: "Cargo Type", type: "TEXT", filterable: true },
      { key: "cargo_weight", labelFa: "وزن بار", labelEn: "Cargo Weight", type: "DECIMAL", unit: "TON", filterable: true },
      { key: "cargo_length", labelFa: "طول بار", labelEn: "Cargo Length", type: "DECIMAL", unit: "M" },
      { key: "cargo_width", labelFa: "عرض بار", labelEn: "Cargo Width", type: "DECIMAL", unit: "M" },
      { key: "cargo_height", labelFa: "ارتفاع بار", labelEn: "Cargo Height", type: "DECIMAL", unit: "M" },
      { key: "cargo_volume", labelFa: "حجم بار", labelEn: "Cargo Volume", type: "DECIMAL", unit: "M3" },
      { key: "vehicle_type", labelFa: "نوع خودرو", labelEn: "Vehicle Type", type: "TEXT", filterable: true },
      { key: "required_capacity", labelFa: "ظرفیت موردنیاز", labelEn: "Required Capacity", type: "DECIMAL", unit: "TON" },
      { key: "loading_date", labelFa: "تاریخ بارگیری", labelEn: "Loading Date", type: "DATE", filterable: true },
      { key: "delivery_date", labelFa: "تاریخ تحویل", labelEn: "Delivery Date", type: "DATE" },
      { key: "route_type", labelFa: "نوع مسیر", labelEn: "Route Type", type: "TEXT" },
      { key: "permit_required", labelFa: "نیازمند مجوز", labelEn: "Permit Required", type: "BOOLEAN" },
      { key: "escort_required", labelFa: "نیازمند اسکورت", labelEn: "Escort Required", type: "BOOLEAN" },
      { key: "crane_required", labelFa: "نیازمند جرثقیل", labelEn: "Crane Required", type: "BOOLEAN" },
      { key: "insurance_required", labelFa: "نیازمند بیمه", labelEn: "Insurance Required", type: "BOOLEAN" },
    ],
  },

  // ─── §54 RENTAL ───────────────────────────────────────────────
  {
    slugCandidates: ["rent"],
    label: "Rental",
    attributes: [
      { key: "rental_period", labelFa: "دوره اجاره", labelEn: "Rental Period", type: "SELECT",
        filterable: true, visibleOnCard: true, aiRelevant: true,
        options: ["ساعتی", "روزانه", "هفتگی", "ماهانه", "پروژه‌ای", "بلندمدت"] },
      { key: "rental_unit", labelFa: "واحد اجاره", labelEn: "Rental Unit", type: "SELECT",
        filterable: true, options: ["HOUR", "DAY", "WEEK", "MONTH"] },
      { key: "daily_rate", labelFa: "نرخ روزانه", labelEn: "Daily Rate", type: "CURRENCY" },
      { key: "weekly_rate", labelFa: "نرخ هفتگی", labelEn: "Weekly Rate", type: "CURRENCY" },
      { key: "monthly_rate", labelFa: "نرخ ماهانه", labelEn: "Monthly Rate", type: "CURRENCY" },
      { key: "hourly_rate", labelFa: "نرخ ساعتی", labelEn: "Hourly Rate", type: "CURRENCY" },
      { key: "project_rate", labelFa: "نرخ پروژه‌ای", labelEn: "Project Rate", type: "CURRENCY" },
      { key: "deposit", labelFa: "ودیعه", labelEn: "Deposit", type: "CURRENCY" },
      { key: "operator_included", labelFa: "اپراتور شامل", labelEn: "Operator Included", type: "BOOLEAN", filterable: true },
      { key: "fuel_included", labelFa: "سوخت شامل", labelEn: "Fuel Included", type: "BOOLEAN" },
      { key: "transport_included", labelFa: "حمل شامل", labelEn: "Transport Included", type: "BOOLEAN" },
      { key: "minimum_rental_period", labelFa: "حداقل دوره اجاره", labelEn: "Minimum Rental Period", type: "INTEGER" },
      { key: "availability_start", labelFa: "شروع در دسترس بودن", labelEn: "Availability Start", type: "DATE" },
      { key: "availability_end", labelFa: "پایان در دسترس بودن", labelEn: "Availability End", type: "DATE" },
      { key: "delivery_available", labelFa: "تحویل در محل", labelEn: "Delivery Available", type: "BOOLEAN" },
      { key: "pickup_available", labelFa: "تحویل گرفتن در محل", labelEn: "Pickup Available", type: "BOOLEAN" },
    ],
  },

  // ─── §55 AUCTION ──────────────────────────────────────────────
  {
    slugCandidates: ["auction"],
    label: "Auction",
    attributes: [
      { key: "auction_type", labelFa: "نوع مزایده", labelEn: "Auction Type", type: "SELECT",
        filterable: true, options: ["آنلاین", "حضوری", "سفارشی"] },
      { key: "starting_price", labelFa: "قیمت شروع", labelEn: "Starting Price", type: "CURRENCY", filterable: true },
      { key: "reserve_price", labelFa: "قیمت حد", labelEn: "Reserve Price", type: "CURRENCY" },
      { key: "bid_increment", labelFa: "گام افزایش قیمت", labelEn: "Bid Increment", type: "CURRENCY" },
      { key: "start_date", labelFa: "تاریخ شروع", labelEn: "Start Date", type: "DATETIME", filterable: true },
      { key: "end_date", labelFa: "تاریخ پایان", labelEn: "End Date", type: "DATETIME", filterable: true },
      { key: "deposit_required", labelFa: "نیازمند ودیعه", labelEn: "Deposit Required", type: "BOOLEAN" },
      { key: "inspection_date", labelFa: "تاریخ بازرسی", labelEn: "Inspection Date", type: "DATE" },
      { key: "auction_location", labelFa: "محل مزایده", labelEn: "Auction Location", type: "TEXT" },
      { key: "payment_deadline", labelFa: "مهلت پرداخت", labelEn: "Payment Deadline", type: "DATE" },
      { key: "pickup_deadline", labelFa: "مهلت تحویل", labelEn: "Pickup Deadline", type: "DATE" },
    ],
  },

  // ─── §56 WANTED / RFQ ─────────────────────────────────────────
  {
    slugCandidates: ["wanted"],
    label: "Wanted / RFQ",
    attributes: [
      { key: "requested_category", labelFa: "دسته درخواستی", labelEn: "Requested Category", type: "TEXT", filterable: true },
      { key: "requested_product_type", labelFa: "نوع محصول درخواستی", labelEn: "Requested Product Type", type: "TEXT", filterable: true },
      { key: "requested_brand", labelFa: "برند درخواستی", labelEn: "Requested Brand", type: "TEXT", filterable: true },
      { key: "requested_model", labelFa: "مدل درخواستی", labelEn: "Requested Model", type: "TEXT" },
      { key: "minimum_condition", labelFa: "حداقل وضعیت", labelEn: "Minimum Condition", type: "SELECT",
        options: ["نو", "صفر کارکرد", "کم‌کارکرد", "کارکرده", "نیازمند تعمیر"] },
      { key: "maximum_condition", labelFa: "حداکثر وضعیت", labelEn: "Maximum Condition", type: "SELECT",
        options: ["نو", "صفر کارکرد", "کم‌کارکرد", "کارکرده", "نیازمند تعمیر"] },
      { key: "quantity", labelFa: "تعداد", labelEn: "Quantity", type: "INTEGER", filterable: true },
      { key: "budget_min", labelFa: "حداقل بودجه", labelEn: "Budget Min", type: "CURRENCY", filterable: true },
      { key: "budget_max", labelFa: "حداکثر بودجه", labelEn: "Budget Max", type: "CURRENCY", filterable: true },
      { key: "currency", labelFa: "ارز", labelEn: "Currency", type: "TEXT" },
      { key: "required_location", labelFa: "موقعیت موردنیاز", labelEn: "Required Location", type: "TEXT", filterable: true },
      { key: "delivery_required", labelFa: "نیازمند تحویل", labelEn: "Delivery Required", type: "BOOLEAN" },
      { key: "deadline", labelFa: "مهلت", labelEn: "Deadline", type: "DATE", filterable: true },
      { key: "technical_requirements", labelFa: "الزامات فنی", labelEn: "Technical Requirements", type: "LONG_TEXT" },
    ],
  },
];

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

/** Resolve a category by trying each slug candidate; first existing slug wins. */
async function resolveCategory(slugCandidates: string[]) {
  for (const slug of slugCandidates) {
    const cat = await db.category.findUnique({ where: { slug } });
    if (cat) return { cat, matchedSlug: slug };
  }
  return null;
}

/**
 * Upsert an AttributeDefinition by `key`. Shared attributes reuse the same
 * row across categories. Updates metadata flags on existing rows.
 * Returns the attr id.
 */
async function upsertAttr(a: AttrSeed): Promise<string> {
  const data = {
    key: a.key,
    name: a.labelFa, // legacy compat — Persian display name
    nameEn: a.labelEn ?? null,
    labelFa: a.labelFa,
    labelEn: a.labelEn ?? null,
    type: a.type,
    unit: a.unit ?? null,
    required: !!a.required, // definition-level default; per-category override at link
    filterable: !!a.filterable,
    searchable: !!a.searchable,
    sortable: !!a.sortable,
    visibleOnCard: !!a.visibleOnCard,
    visibleOnDetail: a.visibleOnDetail !== false, // default true unless explicitly false
    seoRelevant: !!a.seoRelevant,
    aiRelevant: !!a.aiRelevant,
  };

  // Try upsert by unique `key` first. If key is missing on an existing row
  // (shouldn't happen post-migration), fall back to findFirst by name.
  const existing = await db.attributeDefinition.findUnique({
    where: { key: a.key },
  });

  const attr = existing
    ? await db.attributeDefinition.update({ where: { id: existing.id }, data })
    : await db.attributeDefinition.create({ data });

  // Upsert each option (no unique constraint on (attributeId,value) — use findFirst).
  if (a.options && a.options.length > 0) {
    for (let i = 0; i < a.options.length; i++) {
      const opt = a.options[i];
      const ex = await db.attributeOption.findFirst({
        where: { attributeId: attr.id, value: opt },
      });
      if (!ex) {
        await db.attributeOption.create({
          data: {
            attributeId: attr.id,
            value: opt,
            label: opt,
            sortOrder: i,
          },
        });
      } else {
        await db.attributeOption.update({
          where: { id: ex.id },
          data: { label: opt, sortOrder: i },
        });
      }
    }
  }

  return attr.id;
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════

async function main() {
  console.log("══════════════════════════════════════════════════");
  console.log("HEAVIX Attribute Master Seed — HBR Catalog V1.0");
  console.log("══════════════════════════════════════════════════");

  // ── GUARD: taxonomy must exist ─────────────────────────────
  const excavator = await db.category.findUnique({
    where: { slug: "excavator" },
  });
  if (!excavator) {
    console.error(
      "ERROR: V1.1 taxonomy not seeded (excavator slug missing). " +
        "Run seed-taxonomy-v11.ts first.",
    );
    process.exit(1);
  }
  const totalCats = await db.category.count();
  console.log(`✓ V1.1 taxonomy present (${totalCats} categories).`);

  const startCounts = await Promise.all([
    db.attributeDefinition.count(),
    db.attributeOption.count(),
    db.categoryAttribute.count(),
  ]);
  console.log(
    `  start: ${startCounts[0]} attrDefs, ${startCounts[1]} options, ${startCounts[2]} cat-attr links`,
  );

  const perCategory: { label: string; slug: string; attrCount: number }[] = [];
  const skipped: { label: string; tried: string[] }[] = [];

  for (const link of LINKS) {
    const resolved = await resolveCategory(link.slugCandidates);
    if (!resolved) {
      console.warn(
        `  ⚠ [${link.label}] no category found for slugs [${link.slugCandidates.join(", ")}] — skipping`,
      );
      skipped.push({ label: link.label, tried: link.slugCandidates });
      continue;
    }
    const { cat, matchedSlug } = resolved;
    const requiredSet = new Set(link.requiredKeys ?? []);

    for (let i = 0; i < link.attributes.length; i++) {
      const a = link.attributes[i];
      const attrId = await upsertAttr(a);
      const isRequired = requiredSet.has(a.key);
      await db.categoryAttribute.upsert({
        where: {
          categoryId_attributeId: { categoryId: cat.id, attributeId: attrId },
        },
        create: {
          categoryId: cat.id,
          attributeId: attrId,
          required: isRequired,
          filterable: !!a.filterable,
          searchable: !!a.searchable,
          sortable: !!a.sortable,
          displayOrder: i,
        },
        update: {
          required: isRequired,
          filterable: !!a.filterable,
          searchable: !!a.searchable,
          sortable: !!a.sortable,
          displayOrder: i,
        },
      });
    }
    console.log(
      `  ✓ [${link.label}] ${link.attributes.length} attrs → slug "${matchedSlug}"`,
    );
    perCategory.push({
      label: link.label,
      slug: matchedSlug,
      attrCount: link.attributes.length,
    });
  }

  // ── LEGACY METADATA CLEANUP ────────────────────────────────
  // Some of the original 44 AttributeDefinitions use keys that the V1.0
  // catalog renamed (e.g. max_lift_capacity → lifting_capacity). The rows
  // still exist (and may still be referenced by legacy listings), so we
  // touch them up with proper V1.0 metadata flags rather than leaving
  // them with stale NUMBER/Persian-unit data.
  // ----------------------------------------------------------------
  const LEGACY_FIXUPS: { key: string; patch: Partial<AttrSeed> }[] = [
    { key: "max_lift_capacity", patch: { filterable: true, sortable: true, visibleOnCard: true, aiRelevant: true, type: "DECIMAL", unit: "TON" } },
    { key: "max_lift_height", patch: { filterable: true, aiRelevant: true, type: "DECIMAL", unit: "M" } },
    { key: "hydraulic_capacity", patch: { filterable: true, type: "DECIMAL", unit: "LPM" } },
    { key: "power_output", patch: { filterable: true, sortable: true, visibleOnCard: true, aiRelevant: true, type: "DECIMAL", unit: "KVA" } },
    { key: "power_source", patch: { filterable: true } },
    { key: "undercarriage_type", patch: { filterable: true } },
    { key: "excavator_type", patch: { filterable: true, visibleOnCard: true } },
    { key: "engine_type", patch: { filterable: true } },
    { key: "transmission_type", patch: { filterable: true } },
    { key: "fuel_tank_capacity", patch: { type: "DECIMAL", unit: "L" } },
    { key: "dump_height", patch: { type: "DECIMAL", unit: "M" } },
    { key: "boom_length", patch: { type: "DECIMAL", unit: "M" } },
    { key: "flow_rate", patch: { filterable: true, type: "DECIMAL", unit: "LPM" } },
    { key: "pressure", patch: { filterable: true, type: "DECIMAL", unit: "BAR" } },
    { key: "pto_power", patch: { type: "DECIMAL", unit: "HP" } },
    { key: "reach", patch: { type: "DECIMAL", unit: "M" } },
    { key: "moldboard_angle", patch: { type: "DECIMAL", unit: "DEG" } },
    { key: "blade_width", patch: { type: "DECIMAL", unit: "M" } },
    { key: "alternator_brand", patch: { searchable: true } },
    { key: "manufacturer", patch: { searchable: true } },
    { key: "country_of_origin", patch: { searchable: true, filterable: true } },
    { key: "compatible_brands", patch: { filterable: true } },
    { key: "compatible_models", patch: { searchable: true } },
    { key: "voltage", patch: { filterable: true } },
  ];
  let legacyTouched = 0;
  for (const fix of LEGACY_FIXUPS) {
    const ex = await db.attributeDefinition.findUnique({ where: { key: fix.key } });
    if (!ex) continue;
    const patch: Record<string, unknown> = {};
    if (fix.patch.type) patch.type = fix.patch.type;
    if (fix.patch.unit) patch.unit = fix.patch.unit;
    if (fix.patch.filterable !== undefined) patch.filterable = fix.patch.filterable;
    if (fix.patch.searchable !== undefined) patch.searchable = fix.patch.searchable;
    if (fix.patch.sortable !== undefined) patch.sortable = fix.patch.sortable;
    if (fix.patch.visibleOnCard !== undefined) patch.visibleOnCard = fix.patch.visibleOnCard;
    if (fix.patch.visibleOnDetail !== undefined) patch.visibleOnDetail = fix.patch.visibleOnDetail;
    if (fix.patch.seoRelevant !== undefined) patch.seoRelevant = fix.patch.seoRelevant;
    if (fix.patch.aiRelevant !== undefined) patch.aiRelevant = fix.patch.aiRelevant;
    if (Object.keys(patch).length === 0) continue;
    await db.attributeDefinition.update({ where: { id: ex.id }, data: patch });
    legacyTouched++;
  }
  console.log(`  ✓ legacy metadata fixup touched ${legacyTouched} rows`);

  // ── FINAL COUNTS ───────────────────────────────────────────
  const [attrDefs, attrOptions, catAttrLinks] = await Promise.all([
    db.attributeDefinition.count(),
    db.attributeOption.count(),
    db.categoryAttribute.count(),
  ]);

  const result = {
    attrDefs,
    attrOptions,
    catAttrLinks,
    categoriesLinked: perCategory.length,
    categoriesSkipped: skipped.length,
    perCategory,
    skipped,
  };
  console.log("\n══════════════════════════════════════════════════");
  console.log("SEED COMPLETE — HEAVIX Attribute Master Catalog V1.0");
  console.log("══════════════════════════════════════════════════");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
