import type { Metadata, Viewport } from "next";
import { Jost, Playfair_Display, Bodoni_Moda } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ScrollToTop from "@/components/ScrollToTop";
import DataStoreInit from "@/components/DataStoreInit";
import PromotionPopup from "@/components/PromotionPopup";
import SplashLoader from "@/components/SplashLoader";
import { fetchSiteContent } from "@/lib/fetchSiteContentServer";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

const SITE_URL = "https://joeythebrand.com";
const BRAND_NAME = "JOEY THE BRAND";

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
    default: "JOEY THE BRAND — Power. Precision. Presence.",
    template: "%s - JOEY THE BRAND",
  },
  description:
    "JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity. Based in Accra, Ghana.",
  keywords: ["JOEY THE BRAND", "African fashion", "luxury clothing", "bespoke tailoring", "Accra Ghana", "contemporary fashion"],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  alternates: {
    canonical: "/",
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
  openGraph: {
    title: "JOEY THE BRAND — Power. Precision. Presence.",
    description: "Contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.",
    type: "website",
    url: SITE_URL,
    siteName: "JOEY THE BRAND",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "JOEY THE BRAND",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JOEY THE BRAND — Power. Precision. Presence.",
    description:
      "JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.",
    images: ["/icon.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteContentRow = await fetchSiteContent();
  const initialPromotionPopups = siteContentRow?.promotionPopups ?? [];

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-WGFJSVJM');
          `}
        </Script>
        <Script id="org-jsonld" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: BRAND_NAME,
            url: SITE_URL,
            logo: `${SITE_URL}/icon.png`,
            sameAs: [
              "https://www.instagram.com/joeythebrand/",
              "https://www.tiktok.com/@joeythebrand",
            ],
          })}
        </Script>
      </head>
      <body className={`${jost.variable} ${playfair.variable} ${bodoni.variable} antialiased`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WGFJSVJM"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        <SplashLoader />
        <DataStoreInit />
        <Nav />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
        <PromotionPopup initialPromotionPopups={initialPromotionPopups} />
        <ScrollToTop />
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  );
}
