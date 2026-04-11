import type { Metadata } from "next";
import { Suspense } from "react";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact — JOEY THE BRAND",
  description: "Reach out to JOEY THE BRAND for custom orders, press inquiries, collaborations, or consulting. Based in Accra, Ghana.",
};

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "clamp(3rem, 12vw, 6rem) 0" }} aria-busy="true" />}>
      <ContactClient />
    </Suspense>
  );
}
