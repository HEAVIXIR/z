/* HEAVIX seed v2 — expanded: 45 brands, 16 root categories with real data,
   30 listings across all categories. Idempotent upsert by slug. */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const slugify = (s: string) =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

/* ── 45 Brands (global heavy-machinery, real) ── */
const BRANDS: Array<{ name: string; nameEn: string; country: string; featured?: boolean }> = [
  { name: "کاترپیلر", nameEn: "Caterpillar", country: "USA", featured: true },
  { name: "کوماتسو", nameEn: "Komatsu", country: "Japan", featured: true },
  { name: "هیتاچی", nameEn: "Hitachi", country: "Japan", featured: true },
  { name: "وولوو", nameEn: "Volvo CE", country: "Sweden", featured: true },
  { name: "جی‌سی‌بی", nameEn: "JCB", country: "UK", featured: true },
  { name: "هیوندای", nameEn: "Hyundai", country: "South Korea", featured: true },
  { name: "دوسان", nameEn: "Doosan", country: "South Korea", featured: true },
  { name: "سانی", nameEn: "SANY", country: "China", featured: true },
  { name: "لیبهر", nameEn: "Liebherr", country: "Germany", featured: true },
  { name: "اش‌جی‌ام", nameEn: "XCMG", country: "China", featured: true },
  { name: "لیوگونگ", nameEn: "LiuGong", country: "China" },
  { name: "کیس", nameEn: "CASE", country: "USA" },
  { name: "کوبلکو", nameEn: "Kobelco", country: "Japan" },
  { name: "باب‌کت", nameEn: "Bobcat", country: "USA" },
  { name: "سومیتومو", nameEn: "Sumitomo", country: "Japan" },
  { name: "تادانو", nameEn: "Tadano", country: "Japan" },
  { name: "گروو", nameEn: "Grove", country: "USA" },
  { name: "مانیتووک", nameEn: "Manitowoc", country: "USA" },
  { name: "بومگ", nameEn: "BOMAG", country: "Germany" },
  { name: "ویرتگن", nameEn: "Wirtgen", country: "Germany" },
  { name: "هام", nameEn: "Hamm", country: "Germany" },
  { name: "دینگ‌لی", nameEn: "Dingli", country: "China" },
  { name: "سینوماچ", nameEn: "Sinomach", country: "China" },
  { name: "هپکو", nameEn: "HEPCO", country: "Iran" },
  { name: "مسی‌فرگوسن", nameEn: "Massey Ferguson", country: "USA" },
  { name: "جان‌دیر", nameEn: "John Deere", country: "USA" },
  { name: "نیو هالند", nameEn: "New Holland", country: "USA" },
  { name: "اسکانیا", nameEn: "Scania", country: "Sweden" },
  { name: "مان", nameEn: "MAN", country: "Germany" },
  { name: "مرسدس بنز", nameEn: "Mercedes-Benz", country: "Germany" },
  { name: "ایکاروس", nameEn: "Iveco", country: "Italy" },
  { name: "رنو تراک", nameEn: "Renault Trucks", country: "France" },
  { name: "داف", nameEn: "DAF", country: "Netherlands" },
  { name: "اتکینسون", nameEn: "Atkinson", country: "UK" },
  { name: "فوشنگ", nameEn: "Foton", country: "China" },
  { name: "دونگ‌فنگ", nameEn: "Dongfeng", country: "China" },
  { name: "اس‌جی‌ام موتور", nameEn: "SAIC Motor", country: "China" },
  { name: "کالما", nameEn: "Kalmar", country: "Finland" },
  { name: "هیراک", nameEn: "Hiload", country: "Turkey" },
  { name: "اسکای‌جک", nameEn: "Skyjack", country: "Canada" },
  { name: "جنی", nameEn: "Genie", country: "USA" },
  { name: "اسنوک", nameEn: "Snorkel", country: "USA" },
  { name: "مانیتو", nameEn: "Manitou", country: "France" },
  { name: "هیستر", nameEn: "Hyster", country: "USA" },
  { name: "ییل", nameEn: "Yale", country: "USA" },
];

/* ── 16 root categories with real machine-type icons ── */
const ROOT_CATS: Array<{ name: string; nameEn: string; icon: string; featured?: boolean; children: string[] }> = [
  { name: "بیل مکانیکی", nameEn: "Excavator", icon: "🛠️", featured: true, children: ["بیل زنجیری", "بیل چرخ‌دار", "بیل مینی", "بیل لاستیکی"] },
  { name: "لودر", nameEn: "Loader", icon: "🏗️", featured: true, children: ["لودر چرخ‌دار", "لودر زنجیری", "تیله‌انداز", "بک‌هو لودر"] },
  { name: "بلدوزر", nameEn: "Bulldozer", icon: "🚜", featured: true, children: ["بلدوزر زنجیری", "بلدوزر چرخ‌دار"] },
  { name: "گریدر", nameEn: "Grader", icon: "📏", featured: true, children: ["گریدر موتوری", "گریدر کششی"] },
  { name: "دامپ‌تراک", nameEn: "Dump Truck", icon: "🚛", featured: true, children: ["دامپ‌تراک معدنی", "دامپ‌تراک راه‌سازی", "دامپ‌تراک ۶ چرخ"] },
  { name: "جرثقیل", nameEn: "Crane", icon: "🏗️", featured: true, children: ["جرثقیل زنجیری", "جرثقیل چرخ‌دار", "جرثقیل برجی", "جرثقیل متحرک", "جرثقیل سقفی"] },
  { name: "غلتک راه‌سازی", nameEn: "Road Roller", icon: "🛞", children: ["غلتک فولادی", "غلتک لاستیکی", "غلتک دستی"] },
  { name: "فورک‌لیفت", nameEn: "Forklift", icon: "📦", children: ["فورک‌لیفت دیزلی", "فورک‌لیفت برقی", "ریچ‌تراک", "فورک‌لیفت راه‌آهن"] },
  { name: "ژنراتور", nameEn: "Generator", icon: "⚡", children: ["ژنراتور دیزلی", "ژنراتور گازی", "ژنراتور بادی"] },
  { name: "کمپرسور", nameEn: "Compressor", icon: "🌬️", children: ["کمپرسور پیستونی", "کمپرسور اسکرو", "کمپرسور قابل حمل"] },
  { name: "ماشین‌آلات بتن", nameEn: "Concrete Machinery", icon: "🧱", children: ["بتن‌پمپ", "میکسر بتن", "باتچینگ پلانت", "ویبراتور"] },
  { name: "ماشین‌آلات کشاورزی", nameEn: "Agricultural", icon: "🌾", children: ["تراکتور", "کمباین", "دیسک", "خوشه‌چین", "بذرکار"] },
  { name: "قطعات یدکی", nameEn: "Spare Parts", icon: "⚙️", children: ["قطعات موتور", "قطعات هیدرولیک", "قطعات الکتریکی", "لاستیک و زنجیر", "فیلتر و روغن"] },
  { name: "تجهیزات معدنی", nameEn: "Mining Equipment", icon: "⛏️", children: ["دریل معدن", "باربر معدنی", "کراشر", "سرند"] },
  { name: "سکوی بلندبر", nameEn: "Aerial Platform", icon: "🪜", children: ["سکو متحرک", "سکو کششی", "دوربال"] },
  { name: "ماشین‌آلات جنگل", nameEn: "Forestry", icon: "🌲", children: ["هاروستر", "فوروادر", "شاخه‌چین"] },
];

/* ── 30 sample listings across all major categories ── */
type SampleListing = {
  title: string;
  brandEn: string;
  catEn: string;
  price: number | null;
  priceType: string;
  condition: string;
  province: string;
  city: string;
  year: number;
  hours: number;
  featured?: boolean;
  shortDesc: string;
  desc: string;
};

const SAMPLE_LISTINGS: SampleListing[] = [
  { title: "بیل مکانیکی کوماتسو PC220-8 کارکرده", brandEn: "Komatsu", catEn: "Excavator", price: 8500000000, priceType: "NEGOTIABLE", condition: "USED", province: "تهران", city: "تهران", year: 2019, hours: 4200, featured: true, shortDesc: "بیل زنجیری کوماتسو PC220-8، سالم و آماده کار، سرویس دوره‌ای انجام شده.", desc: "بیل مکانیکی زنجیری کوماتسو مدل PC220-8 با ۴۲۰۰ ساعت کارکرد. دستگاه سالم، روغن‌ها تعویض شده، زنجیرها حداقل ۶۰٪ عمر. دارای همه‌گیربکس و پمپ اصلی سالم. مناسب کار خاکی، سنگ‌شکنی و بارگیری. تحویل فوری در تهران." },
  { title: "لودر کاترپیلار 966H صفر کارکرد", brandEn: "Caterpillar", catEn: "Loader", price: 12500000000, priceType: "FIXED", condition: "USED", province: "اصفهان", city: "اصفهان", year: 2021, hours: 1800, featured: true, shortDesc: "لودر چرخ‌دار کاترپیلار ۹۶۶H، کم‌کارکرد، تایرها نو، لاستیک‌ها ۹۰٪.", desc: "لودر چرخ‌دار کاترپیلار مدل ۹۶۶H سال ۲۰۲۱ با ۱۸۰۰ ساعت کارکرد. دستگاه کاملاً سالم، تایرها نو، هیدرولیک بدون مشکل. مناسب معدن و بارگیری سنگین. گارانتی خدمات پس از فروش." },
  { title: "بلدوزر کوماتسو D85A کارکرده معدنی", brandEn: "Komatsu", catEn: "Bulldozer", price: 6200000000, priceType: "NEGOTIABLE", condition: "USED", province: "کرمان", city: "کرمان", year: 2017, hours: 6500, shortDesc: "بلدوزر زنجیری کوماتسو D85A، کارکرد معدنی، تیغه و زنجیر تعویض شده.", desc: "بلدوزر زنجیری کوماتسو مدل D85A-18 با ۶۵۰۰ ساعت کارکرد در معدن. تیغه و زنجیرها اخیراً تعویض شده‌اند. موتور اورهال شده. مناسب کار سنگین معدنی و راه‌سازی." },
  { title: "گریدر کوماتسو GD825A آماده کار", brandEn: "Komatsu", catEn: "Grader", price: 4800000000, priceType: "NEGOTIABLE", condition: "USED", province: "خراسان رضوی", city: "مشهد", year: 2016, hours: 5800, shortDesc: "گریدر موتوری کوماتسو GD825A، تیغه سالم، هیدرولیک قوی.", desc: "گریدر موتوری کوماتسو مدل GD825A سال ۲۰۱۶. دستگاه سالم و آماده کار در پروژه‌های راه‌سازی. تیغه تسطیح و برگردان سالم، سیستم فرمان و هیدرولیک بدون مشکل." },
  { title: "دامپ‌تراک وولوو A40G معدنی", brandEn: "Volvo CE", catEn: "Dump Truck", price: 15000000000, priceType: "CALL_FOR_PRICE", condition: "USED", province: "یزد", city: "یزد", year: 2020, hours: 3100, featured: true, shortDesc: "دامپ‌تراک معدنی وولوو A40G، ظرفیت ۴۰ تن، کم‌کارکرد.", desc: "دامپ‌تراک معدنی وولوو مدل A40G با ظرفیت بار ۴۰ تن. ۳۱۰۰ ساعت کارکرد. تایرهای نو، کابین راحت، سیستم تعلیق قوی. مناسب حمل بار در معدن." },
  { title: "جرثقیل زنجیری لیبهر LR1100", brandEn: "Liebherr", catEn: "Crane", price: 9500000000, priceType: "NEGOTIABLE", condition: "USED", province: "تهران", city: "تهران", year: 2018, hours: 2400, shortDesc: "جرثقیل زنجیری لیبهر LR1100، توان ۱۰۰ تن، بازوی کامل.", desc: "جرثقیل زنجیری لیبهر مدل LR1100 با توان بالابرندگی ۱۰۰ تن. ۲۴۰۰ ساعت کارکرد. تمام بازوها و وزنه‌ها موجود. سرویس کامل انجام شده. مناسب پروژه‌های سنگین نصب." },
  { title: "بیل مکانیکی هیتاچی ZX350 کارکرده", brandEn: "Hitachi", catEn: "Excavator", price: 7200000000, priceType: "NEGOTIABLE", condition: "USED", province: "البرز", city: "کرج", year: 2018, hours: 5100, shortDesc: "بیل زنجیری هیتاچی ZX350، سالم، زنجیر ۵۰٪، آماده تحویل.", desc: "بیل مکانیکی زنجیری هیتاچی مدل ZX350-5 با ۵۱۰۰ ساعت کارکرد. دستگاه سالم و آماده کار. زنجیرها حدود ۵۰٪ عمر. مناسب کار خاکی و بارگیری." },
  { title: "لودر هیوندای HL770 صفر", brandEn: "Hyundai", catEn: "Loader", price: 9800000000, priceType: "FIXED", condition: "NEW", province: "تهران", city: "تهران", year: 2023, hours: 120, featured: true, shortDesc: "لودر چرخ‌دار هیوندای HL770، صفر کارکرد، گارانتی رسمی.", desc: "لودر چرخ‌دار هیوندای مدل HL770-9A سال ۲۰۲۳، عملاً صفر کارکرد (۱۲۰ ساعت تست). دارای گارانتی رسمی نمایندگی. مناسب پروژه‌های جدید راه‌سازی و بارگیری." },
  { title: "غلتک راه‌سازی بومگ BW213", brandEn: "BOMAG", catEn: "Road Roller", price: 3500000000, priceType: "NEGOTIABLE", condition: "USED", province: "فارس", city: "شیراز", year: 2017, hours: 4200, shortDesc: "غلتک فولادی بومگ BW213، درام سالم، لرزش‌گیر کار می‌کند.", desc: "غلتک راه‌سازی بومگ مدل BW213 با درام فولادی. ۴۲۰۰ ساعت کارکرد. سیستم لرزش و تعلیق سالم. مناسب اسفالت و خاک‌ریزی راه‌سازی." },
  { title: "فورک‌لیفت دوسان 5تن دیزلی", brandEn: "Doosan", catEn: "Forklift", price: 1800000000, priceType: "FIXED", condition: "USED", province: "تهران", city: "تهران", year: 2019, hours: 2800, shortDesc: "فورک‌لیفت دیزلی دوسان ۵ تن، توان بالا، مناسب انبار.", desc: "فورک‌لیفت دیزلی دوسان با توان بالابرندگی ۵ تن. ۲۸۰۰ ساعت کارکرد. مناسب انبارهای بزرگ و بارگیری سنگین. باتری و استارت سالم." },
  { title: "کمپرسور اسکرو سانی 22m³", brandEn: "SANY", catEn: "Compressor", price: 920000000, priceType: "NEGOTIABLE", condition: "USED", province: "خراسان رضوی", city: "مشهد", year: 2020, hours: 1900, shortDesc: "کمپرسور اسکرو سانی ۲۲ مترمکعب بر دقیقه، فشار ۱۲ بار.", desc: "کمپرسور اسکرو سانی با دبی ۲۲ مترمکعب بر دقیقه و فشار کاری ۱۲ بار. ۱۹۰۰ ساعت کارکرد. مناسب کارگاه‌های سنگ‌شکنی و صنعتی." },
  { title: "بتن‌پمپ سانی 37متر", brandEn: "SANY", catEn: "Concrete Machinery", price: 5400000000, priceType: "CALL_FOR_PRICE", condition: "USED", province: "اصفهان", city: "اصفهان", year: 2021, hours: 1500, featured: true, shortDesc: "بتن‌پمپ بوم‌دار سانی ۳۷ متری، کم‌کارکرد، روی شاسی بنز.", desc: "بتن‌پمپ بوم‌دار سانی با بازوی ۳۷ متری روی شاسی مرسدس‌بنز. ۱۵۰۰ ساعت کارکرد. سیستم هیدرولیک سالم. مناسب پروژه‌های بلندمرتبه‌سازی." },
  { title: "تراکتور مسی‌فرگوسن 75 اسب بخار", brandEn: "Massey Ferguson", catEn: "Agricultural", price: 1200000000, priceType: "NEGOTIABLE", condition: "USED", province: "گلستان", city: "گرگان", year: 2015, hours: 3800, shortDesc: "تراکتور مسی‌فرگوسن ۷۵ اسب بخار، سالم، مناسب کشاورزی.", desc: "تراکتور مسی‌فرگوسن مدل MF-75 با ۳۸۰۰ ساعت کارکرد. موتور دیزلی سالم، سیستم سه‌نقطه‌ای کامل. مناسب شخم‌زنی، دیسک‌زنی و حمل بار در مزرعه." },
  { title: "بیل مینی باب‌کت E35", brandEn: "Bobcat", catEn: "Excavator", price: 2100000000, priceType: "FIXED", condition: "NEW", province: "تهران", city: "تهران", year: 2024, hours: 50, shortDesc: "بیل مینی باب‌کت E35، صفر کارکرد، مناسب کار در فضای کوچک.", desc: "بیل مینی باب‌کت مدل E35 سال ۲۰۲۴، صفر کارکرد. مناسب کار در فضاهای کوچک، داخل شهر و ساختمان‌سازی. دسترسی آسان به محل کار." },
  { title: "جرثقیل چرخ‌دار تادانو GT550", brandEn: "Tadano", catEn: "Crane", price: 11000000000, priceType: "NEGOTIABLE", condition: "USED", province: "تهران", city: "تهران", year: 2019, hours: 2600, featured: true, shortDesc: "جرثقیل چرخ‌دار تادانو GT550، توان ۵۵ تن، کم‌کارکرد.", desc: "جرثقیل چرخ‌دار تادانو مدل GT550 با توان ۵۵ تن. ۲۶۰۰ ساعت کارکرد. شاسی مرسدس‌بنز، سیستم هیدرولیک سالم. مناسب نصب دکل، سازه و پروژه‌های صنعتی." },
  { title: "لودر جی‌سی‌بی 3CX کارکرده", brandEn: "JCB", catEn: "Loader", price: 4200000000, priceType: "NEGOTIABLE", condition: "USED", province: "مازندران", city: "ساری", year: 2018, hours: 4500, shortDesc: "بک‌هو لودر جی‌سی‌بی 3CX، همه‌کاره، سالم.", desc: "بک‌هو لودر جی‌سی‌بی مدل 3CX با ۴۵۰۰ ساعت کارکرد. دستگاه همه‌کاره برای حفاری، بارگیری و حمل. مناسب شهرداری‌ها و پروژه‌های کوچک." },
  { title: "بلدوزر کاترپیلار D6R", brandEn: "Caterpillar", catEn: "Bulldozer", price: 7800000000, priceType: "NEGOTIABLE", condition: "USED", province: "خوزستان", city: "اهواز", year: 2018, hours: 4800, shortDesc: "بلدوزر زنجیری کاترپیلار D6R، کارکرد راه‌سازی.", desc: "بلدوزر زنجیری کاترپیلار مدل D6R با ۴۸۰۰ ساعت کارکرد. تیغه سالم، زنجیر ۶۵٪. مناسب راه‌سازی و حرکت خاک در پروژه‌های متوسط." },
  { title: "ژنراتور کوماتسو 250 کیلو وات", brandEn: "Komatsu", catEn: "Generator", price: 2600000000, priceType: "FIXED", condition: "USED", province: "تهران", city: "تهران", year: 2020, hours: 2200, shortDesc: "ژنراتور دیزلی کوماتسو ۲۵۰ کیلو وات، صداپوش سالم.", desc: "ژنراتور دیزلی کوماتسو با توان ۲۵۰ کیلو وات. ۲۲۰۰ ساعت کارکرد. کانوپی صداپوش کامل، مناسب کارگاه و مجتمع. سوئیچ برق ATS همراه دستگاه." },
  { title: "دامپ‌تراک 6 چرخ سانی", brandEn: "SANY", catEn: "Dump Truck", price: 3200000000, priceType: "NEGOTIABLE", condition: "USED", province: "قم", city: "قم", year: 2019, hours: 5200, shortDesc: "دامپ‌تراک ۶ چرخ سانی، مناسب حمل مصالح ساختمانی.", desc: "دامپ‌تراک ۶ چرخ سانی با ۵۲۰۰ ساعت کارکرد. تایرها ۶۰٪، کابین سالم. مناسب حمل مصالح، خاک و سنگ در مسیرهای کوتاه و متوسط." },
  { title: "میکسر بتن دوو 12 متری", brandEn: "Daewoo", catEn: "Concrete Machinery", price: 1900000000, priceType: "NEGOTIABLE", condition: "USED", province: "البرز", city: "کرج", year: 2017, hours: 4100, shortDesc: "میکسر بتن کامیون‌سوار دوو ۱۲ متری، تانک سالم.", desc: "میکسر بتن کامیون‌سوار دوو با ظرفیت ۱۲ مترمکعب. ۴۱۰۰ ساعت کارکرد. تانک چرخان سالم، پره‌ها تعویض شده. مناسب بتن‌ریزی در پروژه‌های ساختمانی." },
  { title: "بیل مکانیکی اش‌جی‌ام XE215", brandEn: "XCMG", catEn: "Excavator", price: 5800000000, priceType: "NEGOTIABLE", condition: "USED", province: "سیستان و بلوچستان", city: "زاهدان", year: 2020, hours: 3400, shortDesc: "بیل زنجیری اش‌جی‌ام XE215، اقتصادی، سالم.", desc: "بیل مکانیکی زنجیری اش‌جی‌ام مدل XE215 با ۳۴۰۰ ساعت کارکرد. دستگاه اقتصادی و سالم، مناسب کار خاکی و بارگیری. قطعات در دسترس و ارزان." },
  { title: "گریدر کاترپیلار 140K", brandEn: "Caterpillar", catEn: "Grader", price: 6800000000, priceType: "FIXED", condition: "USED", province: "آذربایجان شرقی", city: "تبریز", year: 2019, hours: 3600, featured: true, shortDesc: "گریدر موتوری کاترپیلار 140K، کم‌کارکرد، تیغه نو.", desc: "گریدر موتوری کاترپیلار مدل 140K سال ۲۰۱۹ با ۳۶۰۰ ساعت کارکرد. تیغه تسطیح نو، سیستم هیدرولیک سالم. مناسب راه‌سازی و تسطیح زمین." },
  { title: "فورک‌لیفت برقی ییل 3تن", brandEn: "Yale", catEn: "Forklift", price: 1400000000, priceType: "NEGOTIABLE", condition: "USED", province: "تهران", city: "تهران", year: 2021, hours: 1600, shortDesc: "فورک‌لیفت برقی ییل ۳ تن، مناسب داخل انبار.", desc: "فورک‌لیفت برقی ییل با توان ۳ تن. ۱۶۰۰ ساعت کارکرد. باتری لیتیوم سالم، بدون آلاینده. مناسب انبارهای سرپوشیده و صنایع غذایی." },
  { title: "سکوی بلندبر مانیتو 1800", brandEn: "Manitou", catEn: "Aerial Platform", price: 2200000000, priceType: "NEGOTIABLE", condition: "USED", province: "اصفهان", city: "اصفهان", year: 2019, hours: 1800, shortDesc: "سکوی بلندبر مانیتو ۱۸ متری، مناسب انبار و نگهداری.", desc: "سکوی بلندبر مانیتو با ارتفاع ۱۸ متر. ۱۸۰۰ ساعت کارکرد. دیزل موتور سالم، سیستم هیدرولیک قوی. مناسب انبارها و نگهداری ساختمان." },
  { title: "کراشر فکی کاترپیلار PE900", brandEn: "Caterpillar", catEn: "Mining Equipment", price: 8500000000, priceType: "CALL_FOR_PRICE", condition: "USED", province: "کرمان", city: "سیرجان", year: 2017, hours: 6800, shortDesc: "کراشر فکی کاترپیلار PE900، کارکرد معدنی سنگین.", desc: "کراشر فکی کاترپیلار مدل PE900 با ۶۸۰۰ ساعت کارکرد در معدن سنگ‌آهن. فک‌ها تعویض شده، موتور سالم. ظرفیت ۵۰۰ تن بر ساعت." },
  { title: "تراکتور جان‌دیر 6155", brandEn: "John Deere", catEn: "Agricultural", price: 3400000000, priceType: "FIXED", condition: "NEW", province: "فارس", city: "شیراز", year: 2024, hours: 80, shortDesc: "تراکتور جان‌دیر 6155، صفر کارکرد، گارانتی رسمی.", desc: "تراکتور جان‌دیر مدل 6155 با ۱۵۵ اسب بخار. صفر کارکرد. کابین راحت، سیستم GPS دقیق. مناسب مزارع بزرگ و کشاورزی مدرن." },
  { title: "بیل مکانیکی لیوگونگ CLG920E", brandEn: "LiuGong", catEn: "Excavator", price: 4900000000, priceType: "NEGOTIABLE", condition: "USED", province: "گیلان", city: "رشت", year: 2019, hours: 3900, shortDesc: "بیل زنجیری لیوگونگ CLG920E، اقتصادی و سالم.", desc: "بیل مکانیکی زنجیری لیوگونگ مدل CLG920E با ۳۹۰۰ ساعت کارکرد. دستگاه اقتصادی با قطعات در دسترس. مناسب کار خاکی و بارگیری متوسط." },
  { title: "جرثقیل برجی لیبهر 280EC-H", brandEn: "Liebherr", catEn: "Crane", price: 18000000000, priceType: "CALL_FOR_PRICE", condition: "NEW", province: "تهران", city: "تهران", year: 2024, hours: 200, featured: true, shortDesc: "جرثقیل برجی لیبهر 280EC-H، صفر کارکرد، مناسب بلندمرتبه.", desc: "جرثقیل برجی لیبهر مدل 280EC-H با توان بالابرندگی ۱۲ تن در نوک بازوی ۷۰ متری. صفر کارکرد. مناسب پروژه‌های بلندمرتبه‌سازی. نصب و آموزش رایگان." },
  { title: "کمپرسور پیستونی آتلاس 100 لیتری", brandEn: "Atlas Copco", catEn: "Compressor", price: 480000000, priceType: "FIXED", condition: "NEW", province: "تهران", city: "تهران", year: 2024, hours: 10, shortDesc: "کمپرسور پیستونی آتلاس کوپکو ۱۰۰ لیتری، صفر کارکرد.", desc: "کمپرسور پیستونی آتلاس کوپکو با مخزن ۱۰۰ لیتری و فشار ۱۰ بار. صفر کارکرد. مناسب کارگاه‌های کوچک، بادی‌کاری و صنایع چوب." },
  { title: "لودر زنجیری کوماتسو D39EX-24", brandEn: "Komatsu", catEn: "Loader", price: 5600000000, priceType: "NEGOTIABLE", condition: "USED", province: "هرمزگان", city: "بندرعباس", year: 2018, hours: 4200, shortDesc: "لودر زنجیری کوماتسو D39EX، کارکرد بندری.", desc: "لودر زنجیری کوماتسو مدل D39EX-24 با ۴۲۰۰ ساعت کارکرد در اسکله. دستگاه سالم، زنجیر ۵۵٪. مناسب بارگیری کشتی و کار بندری." },
];

async function main() {
  console.log("🌱 Seeding HEAVIX v2 (expanded)…");

  /* Brands */
  for (let i = 0; i < BRANDS.length; i++) {
    const b = BRANDS[i];
    await db.brand.upsert({
      where: { slug: slugify(b.nameEn) },
      update: {
        name: b.name, nameEn: b.nameEn, country: b.country,
        featured: b.featured ?? false, active: true, sortOrder: i,
      },
      create: {
        name: b.name, nameEn: b.nameEn, slug: slugify(b.nameEn),
        country: b.country, featured: b.featured ?? false, active: true, sortOrder: i,
      },
    });
  }
  console.log(`  ✓ ${BRANDS.length} brands`);

  /* Categories */
  const catByEn = new Map<string, string>();
  for (let i = 0; i < ROOT_CATS.length; i++) {
    const c = ROOT_CATS[i];
    const slug = slugify(c.nameEn);
    const parent = await db.category.upsert({
      where: { slug },
      update: {
        name: c.name, nameEn: c.nameEn, icon: c.icon,
        featured: c.featured ?? false, active: true, showOnHome: true,
        sortOrder: i, level: 0, parentId: null,
      },
      create: {
        name: c.name, nameEn: c.nameEn, slug, icon: c.icon,
        featured: c.featured ?? false, active: true, showOnHome: true,
        sortOrder: i, level: 0,
      },
    });
    catByEn.set(c.nameEn, parent.id);

    for (let j = 0; j < c.children.length; j++) {
      const childName = c.children[j];
      const childSlug = slugify(`${c.nameEn}-${childName}`);
      await db.category.upsert({
        where: { slug: childSlug },
        update: { name: childName, parentId: parent.id, active: true, showOnHome: false, sortOrder: j, level: 1 },
        create: { name: childName, slug: childSlug, parentId: parent.id, active: true, showOnHome: false, sortOrder: j, level: 1 },
      });
    }
  }
  console.log(`  ✓ ${ROOT_CATS.length} root categories + children`);

  /* Listings — delete existing ASCII-slug listings first to avoid dupes */
  await db.listingImage.deleteMany({});
  await db.listing.deleteMany({});

  for (let i = 0; i < SAMPLE_LISTINGS.length; i++) {
    const s = SAMPLE_LISTINGS[i];
    const brand = await db.brand.findFirst({ where: { nameEn: s.brandEn } });
    const cat = await db.category.findFirst({ where: { nameEn: s.catEn, parentId: null } });
    if (!brand || !cat) {
      console.log(`  ⚠ skip: ${s.title} (brand/cat missing)`);
      continue;
    }
    const base = (brand.nameEn || "machine").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const catBase = (cat.nameEn || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${base}${catBase ? "-" + catBase : ""}-${(i + 1).toString().padStart(2, "0")}`;

    const listing = await db.listing.create({
      data: {
        slug,
        title: s.title,
        shortDesc: s.shortDesc,
        description: s.desc,
        price: s.price,
        priceType: s.priceType,
        listingType: "SALE",
        condition: s.condition,
        province: s.province,
        city: s.city,
        year: s.year,
        workingHours: s.hours,
        status: "PUBLISHED",
        featured: s.featured ?? false,
        viewCount: Math.floor(Math.random() * 400) + 20,
        favoriteCount: Math.floor(Math.random() * 30),
        publishedAt: new Date(Date.now() - Math.floor(Math.random() * 15) * 86400000),
        brandId: brand.id,
        categoryId: cat.id,
      },
    });
  }
  console.log(`  ✓ ${SAMPLE_LISTINGS.length} listings`);

  console.log("✅ Seed v2 complete.");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
