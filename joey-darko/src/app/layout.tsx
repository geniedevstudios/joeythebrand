import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Jost, Bodoni_Moda, Playfair_Display } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import HashScroll from "@/components/HashScroll";
import SiteFooter from "@/components/SiteFooter";
import ConsultationQueryOpener from "@/components/ConsultationQueryOpener";
import { PortfolioBookingProvider } from "@/components/booking/PortfolioBookingProvider";
import { Analytics } from "@vercel/analytics/next";
import RealtimeSync from "@/components/RealtimeSync";
import ScrollToTop from "@/components/ScrollToTop";

const SITE_URL = "https://consultwithurtailorstailor.joeythebrand.com";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "URTAILORSTAILOR — Portfolio",
    template: "%s — URTAILORSTAILOR",
  },
  description:
    "Looking for bespoke consultations for fashion brands and creatives — strategy, design and production guidance tailored for impact.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "URTAILORSTAILOR — Portfolio",
    description:
      "Looking for bespoke consultations for fashion brands and creatives — strategy, design and production guidance tailored for impact.",
    type: "website",
    url: SITE_URL,
    siteName: "URTAILORSTAILOR",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "URTAILORSTAILOR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "URTAILORSTAILOR — Portfolio",
    description:
      "Looking for bespoke consultations for fashion brands and creatives — strategy, design and production guidance tailored for impact.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
        </PortfolioBookingProvider>
      </body>
    </html>
  );
}
