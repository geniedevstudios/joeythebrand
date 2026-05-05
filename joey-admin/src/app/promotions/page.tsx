"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { dataStore } from "@/lib/dataStore";
import type {
  Product,
  PromotionCode,
  PromotionPopupAction,
  PromotionPopupConfig,
  PromotionPopupMediaKind,
} from "@/lib/types";
import { Plus, Trash2, Tag, Megaphone } from "lucide-react";
import { toast } from "sonner";
import AssetUrlField from "@/components/AssetUrlField";
import AdminStyledSelect from "@/components/AdminStyledSelect";

type TabId = "codes" | "popup";

const POPUP_MEDIA_OPTIONS: { value: PromotionPopupMediaKind; label: string }[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

const POPUP_ACTION_OPTIONS: { value: PromotionPopupAction; label: string }[] = [
  { value: "newsletter", label: "Scroll to newsletter (footer)" },
  { value: "product", label: "Product detail page" },
  { value: "news", label: "News & Blog page" },
];

/** Matches Site Content / consultations-style controls */
const LABEL_CLASS = "block text-xs font-semibold uppercase tracking-wide text-zinc-600";
const FIELD_CLASS =
  "mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400";

function shopSegmentForProduct(p: Product): string {
  const slug = (p.slug ?? "").trim();
  return slug || p.id;
}

export default function PromotionsPage() {
  const [tab, setTab] = useState<TabId>("codes");

  const [promotions, setPromotions] = useState<PromotionCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [popupDraft, setPopupDraft] = useState<PromotionPopupConfig>({
    enabled: false,
    mediaKind: "image",
    mediaUrl: "",
    posterUrl: "",
    headline: "",
    body: "",
    buttonLabel: "Learn more",
    action: "news",
    productSlugOrId: "",
  });
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupSaving, setPopupSaving] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [products]);

  const productSegmentSet = useMemo(
    () => new Set(sortedProducts.map(shopSegmentForProduct)),
    [sortedProducts],
  );

  const productPickValue = popupDraft.productSlugOrId.trim();
  const productPickUnknown =
    Boolean(productPickValue) && popupDraft.action === "product" && !productSegmentSet.has(productPickValue);

  const productPickerOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: productsLoading ? "Loading products…" : "Select a product…" },
    ];
    const seen = new Set(opts.map((o) => o.value));
    if (productPickUnknown && productPickValue) {
      opts.push({ value: productPickValue, label: `Saved reference: ${productPickValue}` });
      seen.add(productPickValue);
    }
    for (const p of sortedProducts) {
      const seg = shopSegmentForProduct(p);
      if (seen.has(seg)) continue;
      seen.add(seg);
      const slugBit = p.slug?.trim() ? ` (${p.slug.trim()})` : "";
      opts.push({ value: seg, label: `${p.name}${slugBit}` });
    }
    return opts;
  }, [sortedProducts, productsLoading, productPickUnknown, productPickValue]);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getPromotions();
      setPromotions(data);
    } catch (err) {
      console.error("Failed to load promotions:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPopup = useCallback(async () => {
    setPopupLoading(true);
    try {
      const sc = await dataStore.getSiteContent();
      setPopupDraft({ ...sc.promotionPopup });
    } catch (e) {
      console.error(e);
      toast.error("Could not load popup settings.");
    } finally {
      setPopupLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = dataStore.subscribe(load);
    return unsubscribe;
  }, [load]);

  useEffect(() => {
    if (tab !== "popup") return;
    void loadPopup();
  }, [tab, loadPopup]);

  useEffect(() => {
    if (tab !== "popup") return;
    let cancelled = false;
    setProductsLoading(true);
    void dataStore
      .getProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) toast.error("Could not load products for picker.");
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const handleCreatePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsSaving(true);
    setError("");

    const formData = new FormData(form);
    const code = formData.get("code") as string;
    const percentage = Number(formData.get("percentage"));
    const active = formData.get("active") === "on";

    if (!code || isNaN(percentage)) {
      setError("Please fill in all fields.");
      setIsSaving(false);
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    if (promotions.some((p) => p.code.trim().toUpperCase() === normalizedCode)) {
      setError("That discount code already exists. Use a different code.");
      setIsSaving(false);
      return;
    }

    try {
      await dataStore.addPromotion({ code: normalizedCode, percentage, active });
      form.reset();
      await load();
      toast.success(`Promotion ${normalizedCode} created.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create promotion.";
      setError(msg);
      toast.error(msg);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (promo: PromotionCode) => {
    try {
      await dataStore.updatePromotion(promo.id, { active: !promo.active });
      await load();
      toast.success(promo.active ? "Promotion deactivated." : "Promotion activated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update promotion.";
      toast.error(msg);
      console.error("Failed to toggle promo:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promotion code?")) return;
    try {
      await dataStore.deletePromotion(id);
      await load();
      toast.success("Promotion deleted.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete promotion.";
      toast.error(msg);
      console.error("Failed to delete promo:", err);
    }
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setPopupSaving(true);
    try {
      const next: PromotionPopupConfig = {
        ...popupDraft,
        mediaKind: popupDraft.mediaKind,
        mediaUrl: popupDraft.mediaUrl.trim(),
        posterUrl: popupDraft.mediaKind === "video" ? popupDraft.posterUrl.trim() : "",
        headline: popupDraft.headline.trim(),
        body: popupDraft.body.trim(),
        buttonLabel: (popupDraft.buttonLabel.trim() || "Learn more").trim(),
        productSlugOrId: popupDraft.productSlugOrId.trim(),
      };

      if (next.enabled && (!next.mediaUrl || !next.headline)) {
        toast.error("Turn off the popup or add both media (image or video) and a headline.");
        setPopupSaving(false);
        return;
      }

      if (next.action === "product" && !next.productSlugOrId) {
        toast.error("Choose a product for the Product detail action.");
        setPopupSaving(false);
        return;
      }

      await dataStore.updateSiteContent({ promotionPopup: next });
      setPopupDraft(next);
      toast.success("Popup ad saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save popup.";
      toast.error(msg);
      console.error(err);
    } finally {
      setPopupSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-zinc-900">Loading promotions...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Promotions</h1>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-1">
          <button
            type="button"
            onClick={() => setTab("codes")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "codes" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Tag className="h-4 w-4" aria-hidden />
            Promo codes
          </button>
          <button
            type="button"
            onClick={() => setTab("popup")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "popup" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Megaphone className="h-4 w-4" aria-hidden />
            Popup ad
          </button>
        </div>
      </div>

      {tab === "codes" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <form onSubmit={handleCreatePromo} className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 space-y-4 sticky top-6">
              <h3 className="text-lg font-semibold text-zinc-900 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                New discount code
              </h3>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Code</label>
                <input
                  type="text"
                  name="code"
                  placeholder="e.g. SUMMER24"
                  required
                  className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm sm:text-sm p-2 border uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Discount percentage (%)</label>
                <input
                  type="number"
                  name="percentage"
                  min="1"
                  max="100"
                  placeholder="20"
                  required
                  className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm sm:text-sm p-2 border"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  id="active"
                  defaultChecked
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-zinc-900">
                  Active immediately
                </label>
              </div>

              {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded p-2">{error}</p>}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isSaving ? "Creating..." : "Create promo"}
              </button>
            </form>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
              {promotions.length === 0 ? (
                <div className="p-12 text-center text-zinc-900">
                  <Tag className="mx-auto h-12 w-12 text-zinc-300" />
                  <h3 className="mt-2 text-sm font-semibold text-zinc-900">No promotions</h3>
                  <p className="mt-1 text-sm text-zinc-800">Get started by creating a new discount code.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-800">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-800">Discount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-800">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {promotions.map((promo) => (
                      <tr key={promo.id}>
                        <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-zinc-900">{promo.code}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-800">{promo.percentage}% off</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(promo)}
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              promo.active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-800"
                            }`}
                          >
                            {promo.active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <button type="button" onClick={() => handleDelete(promo.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "popup" && (
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-sm text-zinc-600">
            Full-screen promo after the shop loads (and again after each full refresh). Left: image or autoplay video; right:
            copy and button.
          </p>

          {popupLoading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-800">
              Loading popup settings…
            </div>
          ) : (
            <form onSubmit={handleSavePopup} className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <input
                  id="popup-enabled"
                  type="checkbox"
                  checked={popupDraft.enabled}
                  onChange={(e) => setPopupDraft((d) => ({ ...d, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                />
                <label htmlFor="popup-enabled" className="text-sm font-medium text-zinc-900">
                  Show popup on the storefront
                </label>
              </div>

              <div>
                <p id="popup-media-kind-label" className={LABEL_CLASS}>
                  Media type
                </p>
                <AdminStyledSelect
                  name="popup-media-kind"
                  labelledBy="popup-media-kind-label"
                  wrapperClassName="mt-1 w-full min-w-0"
                  defaultValue={popupDraft.mediaKind}
                  options={POPUP_MEDIA_OPTIONS}
                  onValueChange={(v) => {
                    const mediaKind = v as PromotionPopupMediaKind;
                    setPopupDraft((d) => ({
                      ...d,
                      mediaKind,
                      posterUrl: mediaKind === "image" ? "" : d.posterUrl,
                    }));
                  }}
                />
              </div>

              <AssetUrlField
                label={popupDraft.mediaKind === "video" ? "Video URL" : "Image URL"}
                value={popupDraft.mediaUrl}
                onChange={(url) => setPopupDraft((d) => ({ ...d, mediaUrl: url }))}
                uploadFolder="promotions/popup"
                accept={popupDraft.mediaKind === "video" ? "video/*" : "image/*"}
                placeholder={popupDraft.mediaKind === "video" ? "Upload or paste MP4 / WebM URL" : "Upload or paste image URL"}
              />

              {popupDraft.mediaKind === "video" ? (
                <AssetUrlField
                  label="Poster image (optional)"
                  value={popupDraft.posterUrl}
                  onChange={(url) => setPopupDraft((d) => ({ ...d, posterUrl: url }))}
                  uploadFolder="promotions/popup/posters"
                  accept="image/*"
                  placeholder="Still shown before playback"
                />
              ) : null}

              <div>
                <label htmlFor="popup-headline" className={LABEL_CLASS}>
                  Headline
                </label>
                <input
                  id="popup-headline"
                  type="text"
                  value={popupDraft.headline}
                  onChange={(e) => setPopupDraft((d) => ({ ...d, headline: e.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="New collection"
                />
              </div>

              <div>
                <label htmlFor="popup-body" className={LABEL_CLASS}>
                  Body (optional)
                </label>
                <textarea
                  id="popup-body"
                  rows={4}
                  value={popupDraft.body}
                  onChange={(e) => setPopupDraft((d) => ({ ...d, body: e.target.value }))}
                  className={`${FIELD_CLASS} min-h-[6rem]`}
                  placeholder="Short message under the headline."
                />
              </div>

              <div>
                <label htmlFor="popup-button" className={LABEL_CLASS}>
                  Button label
                </label>
                <input
                  id="popup-button"
                  type="text"
                  value={popupDraft.buttonLabel}
                  onChange={(e) => setPopupDraft((d) => ({ ...d, buttonLabel: e.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Shop now"
                />
              </div>

              <div>
                <p id="popup-action-label" className={LABEL_CLASS}>
                  Button action
                </p>
                <AdminStyledSelect
                  name="popup-action"
                  labelledBy="popup-action-label"
                  wrapperClassName="mt-1 w-full min-w-0"
                  defaultValue={popupDraft.action}
                  options={POPUP_ACTION_OPTIONS}
                  onValueChange={(v) =>
                    setPopupDraft((d) => ({ ...d, action: v as PromotionPopupAction }))
                  }
                />
              </div>

              {popupDraft.action === "product" ? (
                <div>
                  <p id="popup-product-label" className={LABEL_CLASS}>
                    Product
                  </p>
                  <AdminStyledSelect
                    name="popup-product"
                    labelledBy="popup-product-label"
                    wrapperClassName="mt-1 w-full min-w-0"
                    defaultValue={popupDraft.productSlugOrId.trim()}
                    disabled={productsLoading}
                    options={productPickerOptions}
                    onValueChange={(v) => setPopupDraft((d) => ({ ...d, productSlugOrId: v }))}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Opens the product detail route using each product&apos;s slug when set, otherwise its ID.
                  </p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={popupSaving}
                className="inline-flex justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60"
              >
                {popupSaving ? "Saving…" : "Save popup"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
