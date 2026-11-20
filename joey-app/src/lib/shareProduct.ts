import { toast } from "sonner";

/**
 * Shares a product page. Phones open the native share sheet; desktops copy the link.
 * The page link carries the photo, name and price in WhatsApp, Instagram and similar apps.
 */
export async function shareProduct(item: { id: string; slug?: string; name: string }) {
  const link = `${window.location.origin}/shop/${encodeURIComponent(item.slug || item.id)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: item.name, url: link });
      return;
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  } catch {
    toast.error("Could not copy the link.");
  }
}
