import type { Metadata } from "next";
import CollectionClient from "./CollectionClient";
import { fetchCollectionsForHome } from "@/lib/fetchCollectionsServer";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore the curated statement pieces and collections from JOEY THE BRAND.",
};

export default async function CollectionPage() {
  const initialCollections = (await fetchCollectionsForHome()) ?? undefined;
  return <CollectionClient initialCollections={initialCollections} />;
}
