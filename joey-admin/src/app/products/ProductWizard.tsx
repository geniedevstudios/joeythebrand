"use client";

import { useState, useEffect, useMemo } from "react";
import { dataStore } from "@/lib/dataStore";
import type {
  Product,
  Collection,
  WearTag,
  ProductFulfillmentMode,
} from "@/lib/types";
import { X, Plus, Trash2 } from "lucide-react";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import { toast } from "sonner";
import CustomsFields from "./CustomsFields";
import type { CustomsProfile } from "@/lib/customsProfile";
import {
  ColourwaysField,
  colourwaysFrom,
  commitColourways,
  blankColour,
  STANDARD_SIZES,
  UK_SIZES,
  type DraftColour,
} from "./ColourwaysField";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm";
const LABEL = "block text-sm font-medium text-zinc-700";

export default function ProductWizard({
  isOpen,
  onClose,
  editingProduct,
  collections,
  onSuccess,
  listKind = "rtw",
}: {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  collections: Collection[];
  onSuccess: () => void;
  listKind?: "rtw" | "mto";
}) {
  const isMtoForm = listKind === "mto";

  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("none");
  const [wearTag, setWearTag] = useState<WearTag>("unisex");
  const [detailsLines, setDetailsLines] = useState<string[]>([""]);
  const [badgeType, setBadgeType] = useState("none");
  const [mtoWhenSoldOut, setMtoWhenSoldOut] = useState(false);
  const [showOnBespokePage, setShowOnBespokePage] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [bespokeLeadDays, setBespokeLeadDays] = useState<number | "">(14);
  const [mtoMaxQtyPerOrder, setMtoMaxQtyPerOrder] = useState<number | "">(5);
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [customsProfile, setCustomsProfile] = useState<CustomsProfile>({ verified: false, components: [] });
  const [variants, setVariants] = useState<DraftColour[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadKey, setUploadKey] = useState(`draft-${Date.now()}`);

  const allSizes = useMemo(
    (): string[] => (wearTag === "womens" ? [...UK_SIZES] : [...STANDARD_SIZES]),
    [wearTag],
  );

  const productUploadFolder = editingProduct?.id
    ? `products/${editingProduct.id}`
    : `products/${uploadKey}`;

  useEffect(() => {
    if (!isOpen) return;
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(editingProduct.price);
      setDescription(editingProduct.description || "");
      setCategory(editingProduct.category || "none");
      setWearTag(editingProduct.wearTag || "unisex");
      setDetailsLines(editingProduct.details?.length ? editingProduct.details : [""]);

      const resolvedMode: ProductFulfillmentMode =
        editingProduct.fulfillmentMode ||
        (editingProduct.bespokeAvailable ? "stock_then_made_to_order" : "stock_only");
      setMtoWhenSoldOut(resolvedMode === "stock_then_made_to_order");
      setShowOnBespokePage(
        resolvedMode === "made_to_order_only" && Boolean(editingProduct.showOnBespokePage),
      );
      setIsPublished(editingProduct.isPublished !== false);
      setBadgeType(
        editingProduct.isOutOfStock && editingProduct.quantity > 0 && resolvedMode === "stock_only"
          ? "isOutOfStock"
          : editingProduct.isLimited
            ? "isLimited"
            : editingProduct.isBestSeller
              ? "isBestSeller"
              : "none",
      );
      setFeatured(editingProduct.featured || false);
      setBespokeLeadDays(editingProduct.madeToOrderLeadDays ?? editingProduct.bespokeLeadDays ?? 14);
      setMtoMaxQtyPerOrder(editingProduct.mtoMaxQtyPerOrder ?? 5);
      setWeightKg(editingProduct.weightKg || "");
      setCustomsProfile(editingProduct.customsProfile ?? { verified: false, components: [] });
      const sizes =
        (editingProduct.wearTag || "unisex") === "womens" ? [...UK_SIZES] : [...STANDARD_SIZES];
      setVariants(colourwaysFrom(editingProduct, sizes));
    } else {
      setName("");
      setPrice("");
      setDescription("");
      setCategory("none");
      setWearTag("unisex");
      setDetailsLines([""]);
      setBadgeType("none");
      setMtoWhenSoldOut(false);
      setShowOnBespokePage(isMtoForm);
      setIsPublished(true);
      setFeatured(false);
      setBespokeLeadDays(14);
      setMtoMaxQtyPerOrder(5);
      setWeightKg("");
      setCustomsProfile({ verified: false, components: [] });
      setUploadKey(`draft-${Date.now()}`);
      setVariants([blankColour([...STANDARD_SIZES])]);
    }
    setError("");
  }, [isOpen, editingProduct, isMtoForm]);

  useEffect(() => {
    if (!isOpen) return;
    setVariants((prev) =>
      prev.map((way) => {
        const sizeSet = allSizes as readonly string[];
        const chosenSizes = way.chosenSizes.filter((size) => sizeSet.includes(size));
        const nextChosen = chosenSizes.length ? chosenSizes : [...allSizes];
        return {
          ...way,
          chosenSizes: nextChosen,
          sizeQty: nextChosen.map((size) => {
            const existing = way.sizeQty.find((row) => row.size === size);
            return { size, quantity: existing?.quantity ?? 0 };
          }),
        };
      }),
    );
  }, [allSizes, isOpen]);

  const fulfillmentMode: ProductFulfillmentMode = isMtoForm
    ? "made_to_order_only"
    : mtoWhenSoldOut
      ? "stock_then_made_to_order"
      : "stock_only";

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    if (!name.trim()) {
      setError("Add a product name.");
      setIsSaving(false);
      return;
    }

    const finalSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!finalSlug || !SLUG_PATTERN.test(finalSlug)) {
      setError("Could not build a URL slug from the product name.");
      setIsSaving(false);
      return;
    }

    const trackStock = !isMtoForm;
    const committed = commitColourways(variants, trackStock);
    if ("error" in committed) {
      setError(committed.error);
      setIsSaving(false);
      return;
    }

    const finalDetails = detailsLines.map((s) => s.trim()).filter(Boolean);
    const isOutOfStock = fulfillmentMode === "stock_only" && badgeType === "isOutOfStock";
    const isLimited = badgeType === "isLimited";
    const isBestSeller = badgeType === "isBestSeller";
    const finalLeadDays = Number(bespokeLeadDays) || 14;
    const finalMtoMaxQty = Number(mtoMaxQtyPerOrder) || 5;
    if (
      (isMtoForm || mtoWhenSoldOut) &&
      (!Number.isInteger(finalLeadDays) ||
        finalLeadDays < 1 ||
        finalLeadDays > 180 ||
        !Number.isInteger(finalMtoMaxQty) ||
        finalMtoMaxQty < 1 ||
        finalMtoMaxQty > 50)
    ) {
      setError("Enter whole numbers: production time 1–180 calendar days and per-order limit 1–50.");
      setIsSaving(false);
      return;
    }

    const col = collections.find((c) => c.slug === category);
    const categoryName = category === "none" ? "" : col?.name || category;
    const finalShowOnBespoke = isMtoForm ? showOnBespokePage : false;

    const payload = {
      slug: editingProduct?.slug || finalSlug,
      name,
      categoryName,
      category,
      price: Number(price) || 0,
      image: committed.image,
      hoverImage: committed.hoverImage,
      images: committed.images,
      description,
      details: finalDetails,
      isOutOfStock,
      isLimited,
      isBestSeller,
      featured,
      sizes: committed.sizes,
      wearTag,
      quantity: isMtoForm ? 0 : committed.quantity,
      isPublished,
      fulfillmentMode,
      showOnBespokePage: finalShowOnBespoke,
      madeToOrderLeadDays: finalLeadDays,
      mtoMaxQtyPerOrder: finalMtoMaxQty,
      bespokeAvailable: fulfillmentMode !== "stock_only",
      bespokeLeadDays: finalLeadDays,
      weightKg: Number(weightKg) || 0,
      customsProfile,
      variants: committed.colourways,
    };

    try {
      if (editingProduct) {
        await dataStore.updateProduct(editingProduct.id, payload);
      } else {
        await dataStore.addProduct(payload);
      }
      toast.success(editingProduct ? "Product updated." : "Product created.");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save product.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isBespokeOnly = isMtoForm && showOnBespokePage && !isPublished;
  const isBothShopAndBespoke = isMtoForm && showOnBespokePage && isPublished;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90dvh] min-h-0 w-full max-w-[930px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {editingProduct ? "Edit piece" : "A new piece"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className={LABEL}>Product name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={LABEL}>Category</span>
                  <AdminStyledSelect
                    name="category"
                    defaultValue={category}
                    onValueChange={setCategory}
                    options={[
                      { value: "none", label: "None" },
                      ...collections.map((c) => ({ value: c.slug, label: c.name })),
                    ]}
                    wrapperClassName="mt-1"
                  />
                </div>
                <label className="block">
                  <span className={LABEL}>Price · GHC</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
                    className={FIELD}
                  />
                </label>
              </div>
              <label className="block">
                <span className={LABEL}>Description</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={FIELD}
                />
              </label>
              <div>
                <span className={LABEL}>Care guide</span>
                <div className="mt-2 space-y-2">
                  {detailsLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={line}
                        onChange={(e) => {
                          const next = [...detailsLines];
                          next[idx] = e.target.value;
                          setDetailsLines(next);
                        }}
                        className="flex-1 rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                        placeholder="e.g. 100% Cotton"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...detailsLines];
                          next.splice(idx, 1);
                          setDetailsLines(next.length ? next : [""]);
                        }}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDetailsLines([...detailsLines, ""])}
                    className="flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    <Plus className="h-4 w-4" /> Add line
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className={LABEL}>Wear tag</span>
                <AdminStyledSelect
                  name="wearTag"
                  value={wearTag}
                  onValueChange={(v) => setWearTag(v as WearTag)}
                  options={[
                    { value: "unisex", label: "Unisex" },
                    { value: "mens", label: "Men's" },
                    { value: "womens", label: "Women's" },
                  ]}
                  wrapperClassName="mt-1"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  {wearTag === "womens"
                    ? "Women’s sizes use the UK chart (UK 8–22)."
                    : "Sizes run from S through XXL."}
                </p>
              </div>

              <div>
                <span className={LABEL}>Label</span>
                <AdminStyledSelect
                  name="badgeType"
                  value={mtoWhenSoldOut && badgeType === "isOutOfStock" ? "none" : badgeType}
                  onValueChange={setBadgeType}
                  options={[
                    { value: "none", label: "None" },
                    ...(!isMtoForm && !mtoWhenSoldOut
                      ? [{ value: "isOutOfStock", label: "Out of stock" }]
                      : []),
                    { value: "isLimited", label: "Limited edition" },
                    { value: "isBestSeller", label: "Best seller" },
                  ]}
                  wrapperClassName="mt-1"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Feature on homepage
              </label>

              {!isMtoForm ? (
                <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={mtoWhenSoldOut}
                    onChange={(e) => {
                      setMtoWhenSoldOut(e.target.checked);
                      if (e.target.checked && badgeType === "isOutOfStock") setBadgeType("none");
                    }}
                    className="mt-0.5 rounded border-zinc-300"
                  />
                  <span>
                    Mark as made to order when sold out
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      Sell ready-to-wear stock first; offer made to order after it runs out.
                    </span>
                  </span>
                </label>
              ) : null}

              {(isMtoForm || mtoWhenSoldOut) && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className={LABEL}>Making time · days</span>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={bespokeLeadDays}
                      onChange={(e) =>
                        setBespokeLeadDays(e.target.value ? Number(e.target.value) : "")
                      }
                      className={FIELD}
                    />
                  </label>
                  <label className="block">
                    <span className={LABEL}>Max qty per order</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={mtoMaxQtyPerOrder}
                      onChange={(e) =>
                        setMtoMaxQtyPerOrder(e.target.value ? Number(e.target.value) : "")
                      }
                      className={FIELD}
                    />
                  </label>
                </div>
              )}

              {isMtoForm ? (
                <fieldset>
                  <legend className={LABEL}>Where it appears</legend>
                  <div className="mt-2 space-y-2 text-sm text-zinc-800">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="mtoPlacement"
                        checked={isBespokeOnly}
                        onChange={() => {
                          setShowOnBespokePage(true);
                          setIsPublished(false);
                        }}
                      />
                      /bespoke only
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="mtoPlacement"
                        checked={isBothShopAndBespoke}
                        onChange={() => {
                          setShowOnBespokePage(true);
                          setIsPublished(true);
                        }}
                      />
                      Shop and /bespoke
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="mtoPlacement"
                        checked={!showOnBespokePage && isPublished}
                        onChange={() => {
                          setShowOnBespokePage(false);
                          setIsPublished(true);
                        }}
                      />
                      Shop only
                    </label>
                  </div>
                </fieldset>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  Active — show on the storefront
                </label>
              )}

              <label className="block">
                <span className={LABEL}>Garment weight (kg)</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value ? Number(e.target.value) : "")}
                  className={FIELD}
                />
                <span className="mt-1 block text-xs text-zinc-600">
                  Weigh everything included in one unit, before shipping packaging. For Made to Order, use a representative sample.
                </span>
              </label>
              <CustomsFields profile={customsProfile} legacyCode={editingProduct?.hsCode} onChange={setCustomsProfile} />
            </div>
          </div>

          <div className="mt-8">
            <ColourwaysField
              key={editingProduct?.id ?? uploadKey}
              variants={variants}
              onChange={setVariants}
              uploadFolder={productUploadFolder}
              trackStock={!isMtoForm}
              allSizes={allSizes}
            />
          </div>

          {error ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : editingProduct ? "Save" : "Create piece"}
          </button>
        </div>
      </div>
    </div>
  );
}
