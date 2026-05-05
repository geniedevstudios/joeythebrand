import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore JOEY THE BRAND collections and archives.",
};

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
