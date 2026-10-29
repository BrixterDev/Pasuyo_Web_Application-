import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

function getMetadataBase(): URL {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!rawUrl) {
    return new URL("http://localhost:3000");
  }
  try {
    const withProtocol = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `https://${rawUrl}`;
    return new URL(withProtocol);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  title: {
    default: "Pasuyo — Local Marketplace & Delivery",
    template: "%s | Pasuyo",
  },
  description: "Connect local customers, sellers, and riders through a secure marketplace and delivery experience.",
  metadataBase: getMetadataBase(),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
