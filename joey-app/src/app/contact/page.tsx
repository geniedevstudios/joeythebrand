import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact — JOEY THE BRAND",
  description: "Reach out to JOEY THE BRAND for custom orders, press inquiries, collaborations, or consulting. Based in Accra, Ghana.",
};

export default function ContactPage() {
  return <ContactClient />;
}
