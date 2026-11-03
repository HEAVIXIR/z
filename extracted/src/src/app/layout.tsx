import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import MobileNav from "@/components/layout/MobileNav";

const VAZIRMATN_URL =
  "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css";

export const metadata: Metadata = {
  title: "هویکس | بزرگ‌ترین مارکت‌پلیس ماشین‌آلات سنگین ایران",
  description:
    "خرید، فروش و اجاره ماشین‌آلات سنگین: بیل مکانیکی، لودر، بلدوزر، گریدر، دامپ‌تراک، جرثقیل و قطعات یدکی. شبکه سراسری دیلرها و متخصصین.",
  keywords: [
    "ماشین آلات سنگین",
    "بیل مکانیکی",
    "لودر",
    "بلدوزر",
    "گریدر",
    "دامپ تراک",
    "جرثقیل",
    "فروش ماشین آلات",
    "اجاره ماشین آلات",
    "قطعات یدکی",
    "هویکس",
    "HEAVIX",
  ],
  authors: [{ name: "آریا ماشین جم" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link href={VAZIRMATN_URL} rel="stylesheet" type="text/css" />
      </head>
      <body className="min-h-screen bg-[#0b0b0b] pb-16 text-white antialiased lg:pb-0">
        {children}
        <MobileNav />
        <Toaster />
      </body>
    </html>
  );
}
