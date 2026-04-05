import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Jost, Bodoni_Moda, Playfair_Display } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import HashScroll from "@/components/HashScroll";
import SiteFooter from "@/components/SiteFooter";
import ConsultationQueryOpener from "@/components/ConsultationQueryOpener";
import { PortfolioBookingProvider } from "@/components/booking/PortfolioBookingProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import RealtimeSync from "@/components/RealtimeSync";
import ScrollToTop from "@/components/ScrollToTop";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

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
  title: "URTAILORSTAILOR — Portfolio",
  description: "Tailoring portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jost.variable} ${playfair.variable} ${bodoni.variable} antialiased`}>
        <PortfolioBookingProvider>
          <RealtimeSync />
          <Suspense fallback={null}>
            <ConsultationQueryOpener />
          </Suspense>
          <Nav />
          <HashScroll />
          <main>{children}</main>
          <SiteFooter />
          <ScrollToTop />
          <Analytics />
          <SpeedInsights />
        </PortfolioBookingProvider>
      </body>
    </html>
  );
}
