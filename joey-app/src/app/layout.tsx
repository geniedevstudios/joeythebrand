import type { Metadata } from "next";
import { Jost, Playfair_Display, Bodoni_Moda } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ScrollToTop from "@/components/ScrollToTop";
import DataStoreInit from "@/components/DataStoreInit";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-label",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-logo",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "JOEY THE BRAND — Power. Precision. Presence.",
  description:
    "JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity. Based in Accra, Ghana.",
  keywords: ["JOEY THE BRAND", "African fashion", "luxury clothing", "bespoke tailoring", "Accra Ghana", "contemporary fashion"],
  openGraph: {
    title: "JOEY THE BRAND — Power. Precision. Presence.",
    description: "Contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jost.variable} ${playfair.variable} ${bodoni.variable} antialiased`}>
        <DataStoreInit />
        <Nav />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
        <ScrollToTop />
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  );
}
