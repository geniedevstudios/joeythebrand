import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import AdminAuthGate from "@/components/AdminAuthGate";
import AdminRealtimeSync from "@/components/AdminRealtimeSync";
import { AdminToaster } from "@/components/AdminToaster";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin | Joey The Brand",
  description: "Management Portal for Joey The Brand",
  openGraph: {
    title: "Admin | Joey The Brand",
    description: "Management Portal for Joey The Brand",
    images: ["/icon.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Admin | Joey The Brand",
    description: "Management Portal for Joey The Brand",
    images: ["/icon.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full antialiased`}
    >
      <body className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden overscroll-x-none touch-pan-y bg-[#0b0d10] font-sans text-white">
        <AdminAuthGate>
          <AdminRealtimeSync />
          <TopNav />
          <main className="box-border min-h-0 min-w-0 w-full max-w-none flex-1 overflow-x-hidden overflow-y-auto overscroll-x-none touch-pan-y px-3 py-6 sm:px-5 md:px-6">
            {children}
          </main>
        </AdminAuthGate>
        <AdminToaster />
        <Analytics />
      </body>
    </html>
  );
}
