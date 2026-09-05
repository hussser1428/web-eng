import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TranslatePopup } from "@/components/translate-popup/TranslatePopup";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "TOEIC Prep", template: "%s · TOEIC Prep" },
  description: "Luyện thi TOEIC: thi thử, luyện tập, từ vựng, đọc song ngữ và dịch nhanh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${beVietnam.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}>
        <SiteHeader />
        <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
        <SiteFooter />
        <TranslatePopup />
      </body>
    </html>
  );
}
