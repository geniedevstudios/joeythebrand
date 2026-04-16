import type { Metadata } from "next";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden bg-[#0b0d10] font-sans text-white">
        <AdminAuthGate>
          <AdminRealtimeSync />
          <TopNav />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </AdminAuthGate>
        <AdminToaster />
        <Analytics />
      </body>
    </html>
  );
}
