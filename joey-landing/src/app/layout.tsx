import type { Metadata } from "next";
import { Jost, Playfair_Display, Bodoni_Moda } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

const jost = Jost({ subsets: ["latin"], variable: "--font-body" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-logo", weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "JOEY THE BRAND",
  description: "JOEY THE BRAND — Power. Precision. Presence.",
  openGraph: {
    title: "JOEY THE BRAND",
    description: "Power. Precision. Presence.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${jost.variable} ${playfair.variable} ${bodoni.variable} antialiased`}>
        {children}
        <Toaster position="top-center" richColors closeButton />
        <Analytics />
      </body>
    </html>
  );
}

