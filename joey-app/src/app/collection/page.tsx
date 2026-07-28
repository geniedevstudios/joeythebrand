import type { Metadata } from "next";
import CollectionClient from "./CollectionClient";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore the curated statement pieces and collections from JOEY THE BRAND.",
};

export default function CollectionPage() {
  return <CollectionClient />;
}
