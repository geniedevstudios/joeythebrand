import type { Product, PublicCollection } from "./types";

/**
 * Images for collection blob slideshows: admin collection main/hover first,
 * then each product’s primary image (and distinct hover URLs), deduped.
 */
export function slideshowImagesForCollectionBlob(
  col: Pick<PublicCollection, "image" | "image2" | "image3">,
  colProducts: Product[],
  maxImages = 8,
): string[] {
  const out: string[] = [];
  const add = (url?: string | null) => {
    const t = url?.trim();
    if (t && !out.includes(t)) out.push(t);
  };

  add(col.image);
  add(col.image2);
  add(col.image3);

  for (const p of colProducts) {
    add(p.image);
  }
  for (const p of colProducts) {
    if (p.hoverImage?.trim() && p.hoverImage !== p.image) add(p.hoverImage);
  }

  return out.slice(0, maxImages);
}
