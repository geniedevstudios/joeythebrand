"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { dataStore } from "@/lib/dataStore";
import type {
  Product,
  ProductSize,
  Collection,
  WearTag,
  ProductVariant,
  ProductCombo,
  ProductFulfillmentMode,
} from "@/lib/types";
import { X, ArrowLeft, ArrowRight, Plus, Trash2, Check, Package, Layers, PlusCircle } from "lucide-react";
import AssetUrlField from "@/components/AssetUrlField";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import { toast } from "sonner";

const DEFAULT_SIZES: ProductSize[] = [
  { name: "XS", available: true },
  { name: "S", available: true },
  { name: "M", available: true },
  { name: "L", available: true },
  { name: "XL", available: true },
  { name: "XXL", available: true },
  { name: "Custom", available: true },
];

const UK_SIZES: ProductSize[] = [
  { name: "UK 6", available: true },
  { name: "UK 8", available: true },
  { name: "UK 10", available: true },
  { name: "UK 12", available: true },
  { name: "UK 14", available: true },
  { name: "UK 16", available: true },
  { name: "UK 18", available: true },
  { name: "UK 20", available: true },
  { name: "UK 22", available: true },
  { name: "Custom", available: true },
];

function isUkSizeName(name: string): boolean {
  return String(name || "").trim().toUpperCase().startsWith("UK");
}

function inferSizeButtonsMode(sizes?: ProductSize[] | null) {
  if (!sizes || sizes.length === 0) return "standard";
  return sizes.some((s) => isUkSizeName(s.name)) ? "uk" : "standard";
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function ProductWizard({
  isOpen,
  onClose,
  editingProduct,
  collections,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  collections: Collection[];
  onSuccess: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const maxSteps = 5;

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("none");
  const [wearTag, setWearTag] = useState<WearTag>("unisex");

  const [mainImageUrl, setMainImageUrl] = useState("");
  const [hoverImageUrl, setHoverImageUrl] = useState("");
  const [extraImageUrls, setExtraImageUrls] = useState<string[]>(["", "", ""]);
  
  const [detailsLines, setDetailsLines] = useState<string[]>([""]);
  const [sizeButtonsMode, setSizeButtonsMode] = useState<"standard" | "uk">("standard");
  const [sizeSelections, setSizeSelections] = useState<Record<string, boolean>>({});
  
  const [badgeType, setBadgeType] = useState<string>("none");
  const [fulfillmentMode, setFulfillmentMode] = useState<ProductFulfillmentMode>("stock_only");
  const [showOnBespokePage, setShowOnBespokePage] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [featured, setFeatured] = useState(false);
  
  const [quantity, setQuantity] = useState<number | "">(0);
  const [bespokeLeadDays, setBespokeLeadDays] = useState<number | "">(14);
  const [mtoMaxQtyPerOrder, setMtoMaxQtyPerOrder] = useState<number | "">(5);
  const [weightKg, setWeightKg] = useState<number | "">(0.5);
  const [hsCode, setHsCode] = useState("");

  const [hasVariants, setHasVariants] = useState<boolean | null>(null);
  const [variantType, setVariantType] = useState<"colors" | "fits" | "matrix" | null>(null);
  
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [newProductUploadKey] = useState(`draft-${Date.now()}`);

  const productUploadFolder = editingProduct?.id
    ? `products/${editingProduct.id}`
    : `products/${newProductUploadKey}`;

  // Initialize State
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        // We go straight to Summary step if editing!
        setCurrentStep(7); // 7 is the edit hub / summary step
        setName(editingProduct.name);
        setSlug(editingProduct.slug || "");
        setPrice(editingProduct.price);
        setDescription(editingProduct.description || "");
        setCategory(editingProduct.category || "none");
        setWearTag(editingProduct.wearTag || "unisex");

        const main = editingProduct.image?.trim() || editingProduct.images?.find((u) => u?.trim()) || "";
        setMainImageUrl(main);
        setHoverImageUrl(editingProduct.hoverImage?.trim() || "");
        const extras = (editingProduct.images || []).filter((u) => u?.trim() && u.trim() !== main).slice(0, 3);
        setExtraImageUrls([0, 1, 2].map((i) => extras[i] ?? ""));

        setDetailsLines(editingProduct.details?.length ? editingProduct.details : [""]);
        
        const mode = inferSizeButtonsMode(editingProduct.sizes);
        setSizeButtonsMode(mode);
        const sel: Record<string, boolean> = {};
        (editingProduct.sizes || []).forEach(s => { sel[s.name] = s.available; });
        setSizeSelections(sel);

        const resolvedMode: ProductFulfillmentMode =
          editingProduct.fulfillmentMode ||
          (editingProduct.bespokeAvailable ? "stock_then_made_to_order" : "stock_only");
        setFulfillmentMode(resolvedMode);
        setShowOnBespokePage(
          resolvedMode === "made_to_order_only" && Boolean(editingProduct.showOnBespokePage),
        );
        setIsPublished(editingProduct.isPublished !== false);

        setBadgeType(
          editingProduct.isOutOfStock && resolvedMode === "stock_only" ? "isOutOfStock" :
          editingProduct.isLimited ? "isLimited" :
          editingProduct.isBestSeller ? "isBestSeller" : "none"
        );
        setFeatured(editingProduct.featured || false);

        setQuantity(editingProduct.quantity ?? 0);
        setBespokeLeadDays(editingProduct.madeToOrderLeadDays ?? editingProduct.bespokeLeadDays ?? 14);
        setMtoMaxQtyPerOrder(editingProduct.mtoMaxQtyPerOrder ?? 5);
        setWeightKg(editingProduct.weightKg ?? 0.5);
        setHsCode(editingProduct.hsCode || "");

        let existingVars: ProductVariant[] = (editingProduct.variants || []).map(v => 
          (!v.type ? { ...v, type: "color" as const } : v) as ProductVariant
        );

        // Clean up stale main-color from buggy saves (where both fit-combo and an empty main-color were saved)
        const hasFitCombo = existingVars.some(v => v.type === "fit_combo");
        const hasTrueColors = existingVars.some(v => v.type === "color" && (v.id !== "main-color" || (v.combos && v.combos.length > 0) || (v.images && v.images.length > 0)));
        if (hasFitCombo && !hasTrueColors) {
            existingVars = existingVars.filter(v => v.type !== "color");
        }

        const hasColor = existingVars.some(v => v.type === "color");
        if (hasColor && !existingVars.some(v => v.id === "main-color")) {
           existingVars = [{ id: "main-color", type: "color", name: editingProduct.name || "", images: [], combos: [] } as ProductVariant, ...existingVars];
        }

        // Migrate older flat fit_combo variants into the new nested fit-combo structure
        const oldFitVariants = existingVars.filter(v => v.type === "fit_combo" && (!v.combos || v.combos.length === 0) && v.name);
        if (oldFitVariants.length > 0) {
            existingVars = existingVars.filter(v => !(v.type === "fit_combo" && (!v.combos || v.combos.length === 0) && v.name));
            
            const existingFitParent = existingVars.find(v => v.type === "fit_combo" && v.combos);
            if (existingFitParent) {
               existingFitParent.combos = [...(existingFitParent.combos || []), ...oldFitVariants.map((v, i) => ({
                 id: `migrated-${v.id}-${i}`, name: v.name || "", price: v.price || 0, thumbnailUrl: v.thumbnailUrl || "", images: v.images || [], nameFormat: v.nameFormat
               }))];
            } else {
               existingVars.push({
                 id: "fit-combo",
                 type: "fit_combo",
                 combos: oldFitVariants.map((v, i) => ({
                    id: `migrated-${v.id}-${i}`, name: v.name || "", price: v.price || 0, thumbnailUrl: v.thumbnailUrl || "", images: v.images || [], nameFormat: v.nameFormat
                 }))
               } as ProductVariant);
            }
        }

        setVariants(existingVars);
        if (existingVars.length > 0) {
          setHasVariants(true);
          const hasCombos = existingVars.some(v => v.type === "fit_combo" || (v.combos && v.combos.length > 0));
          if (hasColor && hasCombos) setVariantType("matrix");
          else if (hasColor) setVariantType("colors");
          else setVariantType("fits");
        } else {
          setHasVariants(false);
          setVariantType(null);
        }
      } else {
        setCurrentStep(0);
        setName("");
        setSlug("");
        setPrice("");
        setDescription("");
        setCategory("none");
        setWearTag("unisex");
        setMainImageUrl("");
        setHoverImageUrl("");
        setExtraImageUrls(["", "", ""]);
        setDetailsLines([""]);
        setSizeButtonsMode("standard");
        setSizeSelections({});
        setBadgeType("none");
        setFulfillmentMode("stock_only");
        setShowOnBespokePage(false);
        setIsPublished(true);
        setFeatured(false);
        setQuantity(0);
        setBespokeLeadDays(14);
        setMtoMaxQtyPerOrder(5);
        setWeightKg(0.5);
        setHsCode("");
        setVariants([]);
        setHasVariants(null);
        setVariantType(null);
      }
      setError("");
    }
  }, [isOpen, editingProduct]);

  const sizesForEditor = useMemo(() => {
    const base = sizeButtonsMode === "uk" ? UK_SIZES : DEFAULT_SIZES;
    return base.map((s) => ({
      ...s,
      available: sizeSelections[s.name] ?? s.available,
    }));
  }, [sizeButtonsMode, sizeSelections]);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    let finalSlug = slug.trim().toLowerCase();
    if (!finalSlug) {
      finalSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    if (!finalSlug || !SLUG_PATTERN.test(finalSlug)) {
      setError("Invalid slug. Lowercase, numbers, hyphens only.");
      setIsSaving(false);
      return;
    }

    if (!mainImageUrl.trim()) {
      setError("Main image is required.");
      setIsSaving(false);
      return;
    }

    const primary = mainImageUrl.trim();
    const extras = extraImageUrls.map((s) => s.trim()).filter((u) => u && u !== primary);
    const images = [primary, ...extras];

    const finalDetails = detailsLines.map(s => s.trim()).filter(Boolean);

    const isOutOfStock = fulfillmentMode === "made_to_order_only" ? false : badgeType === "isOutOfStock";
    const isLimited = badgeType === "isLimited";
    const isBestSeller = badgeType === "isBestSeller";
    const bespokeAvailable = fulfillmentMode !== "stock_only";
    const finalLeadDays = fulfillmentMode === "stock_only" ? (Number(bespokeLeadDays) || 14) : Number(bespokeLeadDays);
    const finalMtoMaxQty = fulfillmentMode === "stock_only" ? (Number(mtoMaxQtyPerOrder) || 5) : Number(mtoMaxQtyPerOrder);
    if (fulfillmentMode !== "stock_only" && (!Number.isInteger(finalLeadDays) || finalLeadDays < 1 || finalLeadDays > 180 || !Number.isInteger(finalMtoMaxQty) || finalMtoMaxQty < 1 || finalMtoMaxQty > 50)) {
      setError("Enter whole numbers: production time 1–180 calendar days and per-order limit 1–50."); setIsSaving(false); return;
    }
    const finalQuantity = Number(quantity) || 0;
    const finalShowOnBespoke = fulfillmentMode === "made_to_order_only" ? showOnBespokePage : false;

    const col = collections.find((c) => c.slug === category);
    const categoryName = category === "none" ? "" : col?.name || category;

    // Filter variants to only the active ones, based on the current selection.
    let finalVariants: ProductVariant[] = [];
    if (hasVariants) {
       if (variantType === "fits") {
         finalVariants = variants.filter(v => v.type === "fit_combo");
       } else if (variantType === "colors") {
         finalVariants = variants.filter(v => v.type === "color").map(v => ({ ...v, combos: [] }));
       } else if (variantType === "matrix") {
         finalVariants = variants.filter(v => v.type === "color");
       } else {
         finalVariants = [...variants];
       }
    }

    const processedVariants = finalVariants.map(v => 
      v.type === "color" && (!v.images || v.images.length === 0) 
      ? { ...v, images: [primary] } 
      : v
    );

    try {
      if (editingProduct) {
        await dataStore.updateProduct(editingProduct.id, {
          slug: finalSlug,
          name,
          categoryName,
          category,
          price: Number(price) || 0,
          image: primary,
          hoverImage: hoverImageUrl.trim(),
          images,
          description,
          details: finalDetails,
          isOutOfStock,
          isLimited,
          isBestSeller,
          featured,
          sizes: sizesForEditor,
          wearTag,
          quantity: finalQuantity,
          isPublished,
          fulfillmentMode,
          showOnBespokePage: finalShowOnBespoke,
          madeToOrderLeadDays: finalLeadDays,
          mtoMaxQtyPerOrder: finalMtoMaxQty,
          bespokeAvailable,
          bespokeLeadDays: finalLeadDays,
          weightKg: Number(weightKg) || 0,
          hsCode: hsCode.trim(),
          variants: processedVariants,
        });
      } else {
        await dataStore.addProduct({
          slug: finalSlug,
          name,
          categoryName,
          category,
          price: Number(price) || 0,
          image: primary,
          hoverImage: hoverImageUrl.trim(),
          images,
          description,
          details: finalDetails,
          sizes: sizesForEditor,
          isOutOfStock,
          isLimited,
          isBestSeller,
          featured,
          wearTag,
          quantity: finalQuantity,
          isPublished,
          fulfillmentMode,
          showOnBespokePage: finalShowOnBespoke,
          madeToOrderLeadDays: finalLeadDays,
          mtoMaxQtyPerOrder: finalMtoMaxQty,
          bespokeAvailable,
          bespokeLeadDays: finalLeadDays,
          weightKg: Number(weightKg) || 0,
          hsCode: hsCode.trim(),
          variants: processedVariants,
        });
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

  const renderProgressBar = () => {
    if (currentStep > 6) return null;
    
    return (
      <div className="w-full max-w-sm mx-auto mb-8">
        {currentStep > 0 && currentStep <= 6 && (
          <button type="button" onClick={() => {
            setCurrentStep(currentStep - 1);
          }} className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <div className="flex gap-2 w-full">
          {[1, 2, 3, 4, 5, 6].map(stepNum => (
            <div key={stepNum} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${currentStep >= stepNum ? "bg-zinc-900" : "bg-zinc-200"}`} />
          ))}
        </div>
      </div>
    );
  };

  const renderSellingMode = () => (
    <div className="space-y-5 max-w-xl mx-auto w-full">
      <h2 className="text-2xl font-bold">How is this product sold?</h2>
      {([
        ["stock_only", "Ready to Wear only", "Sell the pieces you have in stock."],
        ["stock_then_made_to_order", "Ready to Wear with Made to Order fallback", "Sell stock first; offer made to order when it runs out."],
        ["made_to_order_only", "Made to Order only", "Make each piece after the customer orders."],
      ] as const).map(([value, title, description]) => (
        <label key={value} className="block border rounded-xl p-4 cursor-pointer">
          <input type="radio" name="sellingMode" checked={fulfillmentMode === value} onChange={() => setFulfillmentMode(value)} />
          <span className="font-semibold ml-2">{title}</span><p className="text-sm mt-1">{description}</p>
        </label>
      ))}
      {fulfillmentMode !== "made_to_order_only" && showOnBespokePage && <p className="text-amber-800">Saving this mode removes this design from the bespoke section. Switching back before saving keeps your selection.</p>}
      <button type="button" onClick={() => setCurrentStep(1)} className="rounded-full bg-zinc-950 text-white px-8 py-3">Next</button>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">Product Information</h2>
        <p className="text-zinc-500 mt-2">Let's start with the basics.</p>
      </div>

      <div className="space-y-4 max-w-lg mx-auto w-full">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Product Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Classic Joey Tee" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 shadow-sm" required />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-700">URL Slug (Optional)</label>
          <input type="text" value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. classic-joey-tee" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 shadow-sm font-mono text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Price (GHC)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value ? Number(e.target.value) : "")} placeholder="0.00" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 shadow-sm" required min={0} step={0.01} />
          </div>
          {fulfillmentMode !== "made_to_order_only" && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Quantity in Stock
            </label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value ? Number(e.target.value) : "")}
              placeholder="0"
              className="mt-1 block w-full rounded-md border border-zinc-300 p-2 shadow-sm disabled:bg-zinc-100 disabled:text-zinc-500"
              min={0}
            />
          </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Write a short description..." className="mt-1 block w-full rounded-md border border-zinc-300 p-2 shadow-sm" />
        </div>
      </div>

      <div className="mt-auto pt-4 flex justify-center">
        <button type="button" onClick={() => setCurrentStep(2)} disabled={!name.trim() || !price} className="flex w-48 justify-center rounded-full bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors">
          Next
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">Upload Images</h2>
        <p className="text-zinc-500 mt-2">Add visuals for your product.</p>
      </div>
      <div className="space-y-6 max-w-xl mx-auto w-full pb-8">
        <AssetUrlField
          id="product-main-img"
          label="Main Image (Required)"
          value={mainImageUrl}
          onChange={setMainImageUrl}
          uploadFolder={productUploadFolder}
          accept="image/*"
        />
        <AssetUrlField
          id="product-hover-img"
          label="Hover Image (Optional)"
          value={hoverImageUrl}
          onChange={setHoverImageUrl}
          uploadFolder={productUploadFolder}
          accept="image/*"
        />
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Extra Gallery Images (Optional)</label>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <AssetUrlField
                key={i}
                id={`product-extra-img-${i}`}
                label={`Extra ${i + 1}`}
                value={extraImageUrls[i]}
                onChange={(url) => {
                  const next = [...extraImageUrls];
                  next[i] = url;
                  setExtraImageUrls(next);
                }}
                uploadFolder={productUploadFolder}
                accept="image/*,video/mp4,video/webm"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-auto pt-4 flex justify-center">
        <button type="button" onClick={() => setCurrentStep(3)} disabled={!mainImageUrl.trim()} className="flex w-48 justify-center rounded-full bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors">
          Next
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">General Product Details</h2>
        <p className="text-zinc-500 mt-2">Set categories, sizes, and tags.</p>
      </div>
      <div className="space-y-6 max-w-xl mx-auto w-full pb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Category Collection</label>
            <AdminStyledSelect
              name="category"
              defaultValue={category}
              onValueChange={setCategory}
              options={[{ value: "none", label: "None" }, ...collections.map(c => ({ value: c.slug, label: c.name }))]}
              wrapperClassName="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Wear Tag</label>
            <AdminStyledSelect
              name="wearTag"
              defaultValue={wearTag}
              onValueChange={(v) => setWearTag(v as WearTag)}
              options={[
                { value: "unisex", label: "Unisex" },
                { value: "mens", label: "Men's" },
                { value: "womens", label: "Women's" }
              ]}
              wrapperClassName="mt-1"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-zinc-700">Sizes</label>
            <AdminStyledSelect
              name="sizeMode"
              defaultValue={sizeButtonsMode}
              onValueChange={(v) => setSizeButtonsMode(v as "standard" | "uk")}
              options={[
                { value: "standard", label: "Standard (XS - Custom)" },
                { value: "uk", label: "UK (UK 6 - UK 22)" },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {sizesForEditor.map((sz) => (
              <label key={sz.name} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sz.available}
                  onChange={(e) => setSizeSelections({ ...sizeSelections, [sz.name]: e.target.checked })}
                  className="rounded border-zinc-300"
                />
                <span className="text-sm">{sz.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Care Guide</label>
          <div className="space-y-2 mt-2">
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
                    setDetailsLines(next);
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
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Line
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Promotional Badge</label>
            <AdminStyledSelect
              name="badgeType"
              defaultValue={badgeType}
              onValueChange={setBadgeType}
              options={[
                { value: "none", label: "None" },
                ...(fulfillmentMode === "stock_only"
                  ? [{ value: "isOutOfStock", label: "Out of Stock" }]
                  : []),
                { value: "isLimited", label: "Limited Edition" },
                { value: "isBestSeller", label: "Best Seller" },
              ]}
              wrapperClassName="mt-1"
            />
          </div>
        </div>

        {(fulfillmentMode === "stock_then_made_to_order" || fulfillmentMode === "made_to_order_only") && (
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Production Time (Calendar Days)</label>
              <input
                type="number"
                min={1}
                max={180}
                value={bespokeLeadDays}
                onChange={e => setBespokeLeadDays(e.target.value ? Number(e.target.value) : "")}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white p-2 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Maximum quantity per order (not total production capacity)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={mtoMaxQtyPerOrder}
                onChange={e => setMtoMaxQtyPerOrder(e.target.value ? Number(e.target.value) : "")}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white p-2 shadow-sm"
              />
            </div>

          </div>
        )}
        
        <div className="flex flex-wrap gap-6 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="rounded border-zinc-300" />
            <span className="text-sm font-medium">Feature on Homepage</span>
          </label>

        </div>
      </div>
      <div className="mt-auto pt-4 flex justify-center">
        <button type="button" onClick={() => setCurrentStep(4)} className="flex w-48 justify-center rounded-full bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors">
          Next
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">DHL Information</h2>
        <p className="text-zinc-500 mt-2">Details for international shipping.</p>
      </div>
      <div className="space-y-4 max-w-sm mx-auto w-full">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Weight (kg)</label>
          <input type="number" step="0.01" value={weightKg} onChange={e => setWeightKg(e.target.value ? Number(e.target.value) : "")} placeholder="0.5" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Commodity (HS) Code</label>
          <AdminStyledSelect
            name="hsCode"
            defaultValue={hsCode || "620442"}
            onValueChange={setHsCode}
            wrapperClassName="mt-1"
            options={[
              { value: "620442", label: "620442 - Women's Dresses (Cotton)" },
              { value: "620319", label: "620319 - Men's Suits (Woven)" },
              { value: "621142", label: "621142 - Women's Garments (Other)" },
              { value: "610910", label: "610910 - T-shirts / Apparel (Knitted)" },
            ]}
          />
        </div>
      </div>
      <div className="mt-auto pt-8 flex justify-center">
        <button type="button" onClick={() => setCurrentStep(5)} className="flex w-48 justify-center rounded-full bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors">
          Next
        </button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 flex-1 flex flex-col items-center justify-center pb-12">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-zinc-900">Variants</h2>
        <p className="text-zinc-500 mt-2 text-lg">Does this product have any variants?</p>
      </div>
      <div className="flex items-center gap-6 mt-8">
        <button type="button" onClick={() => { setHasVariants(false); setCurrentStep(7); }} className="px-8 py-4 rounded-xl border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all font-semibold text-lg flex flex-col items-center gap-2 w-40">
          No
        </button>
        <button type="button" onClick={() => { setHasVariants(true); setCurrentStep(6); }} className="px-8 py-4 rounded-xl border-2 border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 transition-all font-semibold text-lg flex flex-col items-center gap-2 w-40">
          Yes
        </button>
      </div>
    </div>
  );

  const handleAddColorVariant = () => {
    setVariants([...variants, { id: `color-${Date.now()}`, type: "color", name: "", images: [], combos: [] }]);
  };

  const handleAddFitCombo = (variantId: string) => {
    const next = [...variants];
    const vIdx = next.findIndex(v => v.id === variantId);
    if (vIdx !== -1) {
      next[vIdx].combos = [
        ...(next[vIdx].combos || []),
        { id: `combo-${Date.now()}`, name: "", price: 0, thumbnailUrl: "", images: [] }
      ];
      setVariants(next);
    } else if (variantType === "fits") {
      // If we are in "fits" mode and no fit-combo variant exists yet, create it.
      setVariants([{ 
        id: "fit-combo", type: "fit_combo", images: [], 
        combos: [{ id: `combo-${Date.now()}`, name: "", price: 0, thumbnailUrl: "", images: [] }] 
      }]);
    }
  };

  const renderStep6 = () => {
    if (!variantType) {
      return (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-zinc-900">Select Variant Type</h2>
            <p className="text-zinc-500 mt-2">How does this product vary?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto w-full mt-4">
            <button type="button" onClick={() => { 
              setVariantType("colors"); 
              const existingColors = variants.filter(v => v.type === "color");
              if (existingColors.length === 0) setVariants([{ id: "main-color", type: "color", name: "", images: [], combos: [] }]); 
              else setVariants(existingColors);
            }} className="text-left p-6 rounded-xl border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all">
              <h3 className="font-bold text-lg text-zinc-900 mb-2">Varying Colors</h3>
              <p className="text-sm text-zinc-500">Different colors like Black, White, Red. Each color gets its own images.</p>
            </button>
            <button type="button" onClick={() => { 
              setVariantType("fits"); 
              const existingCombos = variants.flatMap(v => v.combos || []);
              setVariants([{ id: "fit-combo", type: "fit_combo", combos: existingCombos }]); 
            }} className="text-left p-6 rounded-xl border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all">
              <h3 className="font-bold text-lg text-zinc-900 mb-2">Varying Fit Options</h3>
              <p className="text-sm text-zinc-500">Different fits like Tall, Petite, with varying price additions.</p>
            </button>
            <button type="button" onClick={() => { 
              setVariantType("matrix"); 
              const existingColors = variants.filter(v => v.type === "color");
              if (existingColors.length === 0) setVariants([{ id: "main-color", type: "color", name: "", images: [], combos: [] }]); 
              else setVariants(existingColors);
            }} className="text-left p-6 rounded-xl border-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all">
              <h3 className="font-bold text-lg text-zinc-900 mb-2">Colors + Fit Options</h3>
              <p className="text-sm text-zinc-500">A combination. Define colors first, then set fits (and prices) for each color.</p>
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6 flex-1 flex flex-col">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Configure Variants</h2>
        </div>
        
        <div className="flex-1 w-full max-w-3xl mx-auto pb-8 space-y-8">
          
          {/* Colors and Matrix base: Color definitions */}
          {(variantType === "colors" || variantType === "matrix") && (
            <div className="space-y-6">
              {variants.filter(v => v.type === "color").map((v, idx) => (
                <div key={v.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold">{idx === 0 ? "Main Product Color (Option 1)" : `Color Option ${idx + 1}`}</h4>
                    <button type="button" onClick={() => setVariants(variants.filter(val => val.id !== v.id))} className="text-red-500 hover:text-red-700 p-1" disabled={idx === 0}><Trash2 className={`h-4 w-4 ${idx === 0 ? 'opacity-30' : ''}`} /></button>
                  </div>
                  <div className="flex flex-col gap-4 mb-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-zinc-700">Color Name</label>
                        <input type="text" value={v.name || ""} onChange={e => {
                          const next = [...variants];
                          const idx = next.findIndex(val => val.id === v.id);
                          next[idx].name = e.target.value;
                          setVariants(next);
                        }} placeholder="e.g. Classic Black" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-zinc-700">Product Name Override (Optional)</label>
                        <input type="text" value={v.productNameOverride || ""} onChange={e => {
                          const next = [...variants];
                          const idx = next.findIndex(val => val.id === v.id);
                          next[idx].productNameOverride = e.target.value;
                          setVariants(next);
                        }} placeholder="e.g. The Black Dress" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      {fulfillmentMode !== "made_to_order_only" && (<div className="flex-1">
                        <label className="block text-sm font-medium text-zinc-700">Quantity (Base Item)</label>
                        <input type="number" value={v.quantity ?? ""} onChange={e => {
                          const next = [...variants];
                          const idx = next.findIndex(val => val.id === v.id);
                          next[idx].quantity = Number(e.target.value);
                          setVariants(next);
                        }} placeholder="0" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                      </div>)}
                    </div>
                  </div>
                  
                  {idx === 0 ? (
                    <div className="mb-4 bg-white rounded-lg p-4 border border-zinc-200">
                      <p className="text-sm text-zinc-500 mb-2">Images for this primary color are automatically pulled from your General Information settings.</p>
                      <div className="flex gap-2 opacity-60 pointer-events-none grayscale">
                         <div className="w-16 h-16 rounded bg-zinc-200" style={{ backgroundImage: mainImageUrl ? `url(${mainImageUrl})` : "none", backgroundSize: "cover", backgroundPosition: "center" }} />
                         {extraImageUrls.filter(Boolean).map((url, i) => (
                           <div key={i} className="w-16 h-16 rounded bg-zinc-200" style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                         ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <AssetUrlField id={`col-thumb-${v.id}`} label="Color Thumbnail" value={v.thumbnailUrl || ""} onChange={url => {
                          const next = [...variants];
                          const idx = next.findIndex(val => val.id === v.id);
                          next[idx].thumbnailUrl = url;
                          setVariants(next);
                        }} uploadFolder={`${productUploadFolder}/variants/${v.id}`} accept="image/*" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Gallery Images</label>
                        <div className="grid grid-cols-3 gap-4">
                          {[0, 1, 2].map(imgIdx => (
                             <AssetUrlField key={imgIdx} id={`col-img-${v.id}-${imgIdx}`} label={`Image ${imgIdx+1}`} value={(v.images || [])[imgIdx] || ""} onChange={url => {
                               const next = [...variants];
                               const idx = next.findIndex(val => val.id === v.id);
                               const newImgs = [...(next[idx].images || [])];
                               newImgs[imgIdx] = url;
                               next[idx].images = newImgs;
                               setVariants(next);
                             }} uploadFolder={`${productUploadFolder}/variants/${v.id}`} accept="image/*,video/mp4,video/webm" />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {variantType === "matrix" && (
                     <div className="mt-8 pt-6 border-t border-zinc-200">
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="font-semibold text-zinc-800">Fit Options for {v.name || "this color"}</h5>
                          <button type="button" onClick={() => handleAddFitCombo(v.id)} className="text-sm font-medium text-blue-600 flex items-center gap-1"><Plus className="h-4 w-4"/> Add Fit</button>
                        </div>
                        <div className="space-y-4">
                          {(v.combos || []).map((combo, cIdx) => (
                            <div key={combo.id} className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col gap-4">
                               <div className="flex flex-col gap-4">
                                 <div className="flex gap-4 items-start">
                                   <div className="flex-1">
                                     <label className="block text-xs font-medium text-zinc-700">Fit Name Override (Optional)</label>
                                     <input type="text" value={combo.productNameOverride || ""} onChange={e => {
                                        const next = [...variants];
                                        const vIdx = next.findIndex(val => val.id === v.id);
                                        const cIdx2 = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                        next[vIdx].combos![cIdx2].productNameOverride = e.target.value;
                                        next[vIdx].combos![cIdx2].name = e.target.value;
                                        setVariants(next);
                                     }} placeholder="e.g. finesse 2.0 (blazer)" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                                   </div>
                                 </div>
                                 <div className="flex gap-4 items-start">
                                   <div className="flex-1">
                                     <label className="block text-xs font-medium text-zinc-700">Price Override (GHC)</label>
                                     <input type="number" value={combo.price} onChange={e => {
                                        const next = [...variants];
                                        const vIdx = next.findIndex(val => val.id === v.id);
                                        const cIdx2 = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                        next[vIdx].combos![cIdx2].price = Number(e.target.value);
                                        setVariants(next);
                                     }} placeholder="0.00" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                                   </div>
                                   {fulfillmentMode !== "made_to_order_only" && (<div className="flex-1">
                                     <label className="block text-xs font-medium text-zinc-700">Qty</label>
                                     <input type="number" value={combo.quantity ?? 0} onChange={e => {
                                        const next = [...variants];
                                        const vIdx = next.findIndex(val => val.id === v.id);
                                        const cIdx2 = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                        next[vIdx].combos![cIdx2].quantity = Number(e.target.value);
                                        setVariants(next);
                                     }} className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                                   </div>)}
                                   <button type="button" onClick={() => {
                                     const next = [...variants];
                                     const vIdx = next.findIndex(val => val.id === v.id);
                                     next[vIdx].combos = next[vIdx].combos!.filter(c => c.id !== combo.id);
                                     setVariants(next);
                                   }} className="pt-6 text-zinc-400 hover:text-red-500"><Trash2 className="h-5 w-5"/></button>
                                 </div>
                               </div>
                               
                               <div className="pt-2 border-t border-zinc-100">
                                 <label className="block text-xs font-medium text-zinc-700 mb-2">Combo Images (Optional)</label>
                                 <div className="flex gap-4">
                                   <div className="w-24 shrink-0">
                                      <AssetUrlField id={`mat-thumb-${combo.id}`} label="Thumbnail" value={combo.thumbnailUrl || ""} onChange={url => {
                                        const next = [...variants];
                                        const vIdx = next.findIndex(val => val.id === v.id);
                                        const cIdx2 = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                        next[vIdx].combos![cIdx2].thumbnailUrl = url;
                                        setVariants(next);
                                      }} uploadFolder={`${productUploadFolder}/variants/${v.id}/combos/${combo.id}`} accept="image/*" />
                                   </div>
                                   <div className="flex-1 grid grid-cols-3 gap-2">
                                     {[0, 1, 2].map(imgIdx => (
                                        <AssetUrlField key={imgIdx} id={`mat-img-${combo.id}-${imgIdx}`} label={`Img ${imgIdx+1}`} value={(combo.images || [])[imgIdx] || ""} onChange={url => {
                                          const next = [...variants];
                                          const vIdx = next.findIndex(val => val.id === v.id);
                                          const cIdx2 = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                          const newImgs = [...(next[vIdx].combos![cIdx2].images || [])];
                                          newImgs[imgIdx] = url;
                                          next[vIdx].combos![cIdx2].images = newImgs;
                                          setVariants(next);
                                        }} uploadFolder={`${productUploadFolder}/variants/${v.id}/combos/${combo.id}`} accept="image/*,video/mp4,video/webm" />
                                     ))}
                                   </div>
                                 </div>
                               </div>
                            </div>
                          ))}
                        </div>
                     </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddColorVariant} className="w-full py-4 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 transition-colors font-medium flex items-center justify-center gap-2">
                <Plus className="h-5 w-5" /> Add Color Option
              </button>
            </div>
          )}

          {/* Fits Only mode */}
          {variantType === "fits" && (
             <div className="space-y-6">
               <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold">Fit Options</h4>
                    <button type="button" onClick={() => handleAddFitCombo("fit-combo")} className="text-sm font-medium text-blue-600 flex items-center gap-1"><Plus className="h-4 w-4"/> Add Fit</button>
                 </div>
                 <div className="space-y-4">
                   {(variants.find(v => v.id === "fit-combo")?.combos || []).map(combo => (
                     <div key={combo.id} className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col gap-4">
                        <div className="flex flex-col gap-4">
                           <div className="flex gap-4 items-start">
                             <div className="flex-1">
                               <label className="block text-xs font-medium text-zinc-700">Fit Name Override (Optional)</label>
                               <input type="text" value={combo.productNameOverride || ""} onChange={e => {
                                  const next = [...variants];
                                  const vIdx = next.findIndex(val => val.id === "fit-combo");
                                  const cIdx = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                  next[vIdx].combos![cIdx].productNameOverride = e.target.value;
                                  next[vIdx].combos![cIdx].name = e.target.value;
                                  setVariants(next);
                               }} placeholder="e.g. finesse 2.0 (blazer)" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                             </div>
                           </div>
                           <div className="flex gap-4 items-start">
                             <div className="flex-1">
                               <label className="block text-xs font-medium text-zinc-700">Price Override (GHC)</label>
                               <input type="number" value={combo.price} onChange={e => {
                                  const next = [...variants];
                                  const vIdx = next.findIndex(val => val.id === "fit-combo");
                                  const cIdx = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                  next[vIdx].combos![cIdx].price = Number(e.target.value);
                                  setVariants(next);
                               }} placeholder="0.00" className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                             </div>
                             {fulfillmentMode !== "made_to_order_only" && (<div className="flex-1">
                               <label className="block text-xs font-medium text-zinc-700">Qty</label>
                               <input type="number" value={combo.quantity ?? 0} onChange={e => {
                                  const next = [...variants];
                                  const vIdx = next.findIndex(val => val.id === "fit-combo");
                                  const cIdx = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                  next[vIdx].combos![cIdx].quantity = Number(e.target.value);
                                  setVariants(next);
                               }} className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm" />
                             </div>)}
                             <button type="button" onClick={() => {
                               const next = [...variants];
                               const vIdx = next.findIndex(val => val.id === "fit-combo");
                               next[vIdx].combos = next[vIdx].combos!.filter(c => c.id !== combo.id);
                               setVariants(next);
                             }} className="pt-6 text-zinc-400 hover:text-red-500"><Trash2 className="h-5 w-5"/></button>
                           </div>
                        </div>
                        
                        <div className="pt-2 border-t border-zinc-100">
                          <label className="block text-xs font-medium text-zinc-700 mb-2">Combo Images (Optional)</label>
                          <div className="flex gap-4">
                            <div className="w-24 shrink-0">
                               <AssetUrlField id={`fit-thumb-${combo.id}`} label="Thumbnail" value={combo.thumbnailUrl || ""} onChange={url => {
                                 const next = [...variants];
                                 const vIdx = next.findIndex(val => val.id === "fit-combo");
                                 const cIdx = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                 next[vIdx].combos![cIdx].thumbnailUrl = url;
                                 setVariants(next);
                               }} uploadFolder={`${productUploadFolder}/variants/fit-combo/combos/${combo.id}`} accept="image/*" />
                            </div>
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              {[0, 1, 2].map(imgIdx => (
                                 <AssetUrlField key={imgIdx} id={`fit-img-${combo.id}-${imgIdx}`} label={`Img ${imgIdx+1}`} value={(combo.images || [])[imgIdx] || ""} onChange={url => {
                                   const next = [...variants];
                                   const vIdx = next.findIndex(val => val.id === "fit-combo");
                                   const cIdx = next[vIdx].combos!.findIndex(c => c.id === combo.id);
                                   const newImgs = [...(next[vIdx].combos![cIdx].images || [])];
                                   newImgs[imgIdx] = url;
                                   next[vIdx].combos![cIdx].images = newImgs;
                                   setVariants(next);
                                 }} uploadFolder={`${productUploadFolder}/variants/fit-combo/combos/${combo.id}`} accept="image/*,video/mp4,video/webm" />
                              ))}
                            </div>
                          </div>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
          )}

        </div>

        <div className="mt-auto pt-8 flex justify-center">
          <button type="button" onClick={() => setCurrentStep(7)} className="flex w-48 justify-center rounded-full bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors">
            Next (To Summary)
          </button>
        </div>
      </div>
    );
  };

  const renderPublication = () => {
    const isBespokeOnly =
      fulfillmentMode === "made_to_order_only" && showOnBespokePage && !isPublished;
    const isBothShopAndBespoke =
      fulfillmentMode === "made_to_order_only" && showOnBespokePage && isPublished;

    return (
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">
        <div className="text-sm font-semibold text-zinc-900">
          Where should this product appear?
        </div>

        {fulfillmentMode === "made_to_order_only" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                isBespokeOnly
                  ? "border-zinc-900 bg-zinc-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <input
                  type="radio"
                  name="mtoPlacement"
                  checked={isBespokeOnly}
                  onChange={() => {
                    setShowOnBespokePage(true);
                    setIsPublished(false);
                  }}
                />
                /bespoke Page Only
              </span>
              <span className="text-xs text-zinc-600">
                Appears beneath the consultation form on /bespoke (hidden from main /shop grid).
              </span>
            </label>

            <label
              className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                isBothShopAndBespoke
                  ? "border-zinc-900 bg-zinc-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <input
                  type="radio"
                  name="mtoPlacement"
                  checked={isBothShopAndBespoke}
                  onChange={() => {
                    setShowOnBespokePage(true);
                    setIsPublished(true);
                  }}
                />
                Both /shop &amp; /bespoke
              </span>
              <span className="text-xs text-zinc-600">
                Appears in the main Shop catalogue and in the /bespoke Made to Order section.
              </span>
            </label>

            <label
              className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                !showOnBespokePage && isPublished
                  ? "border-zinc-900 bg-white"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <input
                  type="radio"
                  name="mtoPlacement"
                  checked={!showOnBespokePage && isPublished}
                  onChange={() => {
                    setShowOnBespokePage(false);
                    setIsPublished(true);
                  }}
                />
                Main /shop Only
              </span>
              <span className="text-xs text-zinc-600">
                Appears only in the main Shop catalogue.
              </span>
            </label>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-zinc-800">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Publish on main Shop storefront
          </label>
        )}
      </div>
    );
  };
  const renderStep7 = () => {
    if (editingProduct) {
      return (
        <div className="space-y-6 flex-1 flex flex-col items-center justify-center py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-zinc-900">What would you like to edit?</h2>
            <p className="text-zinc-500 mt-2">Select a section to modify the product's details.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl px-4">
            <button type="button" onClick={() => setCurrentStep(0)} className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl hover:border-zinc-900 hover:shadow-lg transition-all text-left flex flex-col gap-3 group">
               <Package className="h-8 w-8 text-zinc-400 group-hover:text-zinc-900 transition-colors"/>
               <span className="font-bold text-lg text-zinc-900">Selling Mode</span>
               <span className="text-xs text-zinc-500">
                 Current: {fulfillmentMode === "made_to_order_only" ? "Made to Order Only" : fulfillmentMode === "stock_then_made_to_order" ? "RTW + MTO Fallback" : "Ready to Wear Only"}
               </span>
            </button>
            <button type="button" onClick={() => setCurrentStep(1)} className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl hover:border-zinc-900 hover:shadow-lg transition-all text-left flex flex-col gap-3 group">
               <Package className="h-8 w-8 text-zinc-400 group-hover:text-zinc-900 transition-colors"/>
               <span className="font-bold text-lg text-zinc-900">General Information</span>
               <span className="text-xs text-zinc-500">Edit product name, pricing, sizes, lead time, and images.</span>
            </button>
            {hasVariants ? (
              <button type="button" onClick={() => setCurrentStep(6)} className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl hover:border-zinc-900 hover:shadow-lg transition-all text-left flex flex-col gap-3 group">
                 <Layers className="h-8 w-8 text-zinc-400 group-hover:text-zinc-900 transition-colors"/>
                 <span className="font-bold text-lg text-zinc-900">Variants</span>
                 <span className="text-xs text-zinc-500">Manage colors, fits, variant pricing, and stock.</span>
              </button>
            ) : (
              <button type="button" onClick={() => { setHasVariants(true); setCurrentStep(6); }} className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl hover:border-zinc-900 hover:shadow-lg transition-all text-left flex flex-col gap-3 group">
                 <PlusCircle className="h-8 w-8 text-zinc-400 group-hover:text-zinc-900 transition-colors"/>
                 <span className="font-bold text-lg text-zinc-900">Add Variants</span>
                 <span className="text-xs text-zinc-500">Convert this product to use colors or fit options.</span>
              </button>
            )}
          </div>

          {renderPublication()}
          <div className="mt-12 pt-8 w-full max-w-2xl px-4 border-t border-zinc-100 flex flex-col items-center">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm w-full mb-4">
                {error}
              </div>
            )}
            <button type="button" onClick={handleSave} disabled={isSaving} className="flex w-64 justify-center rounded-full bg-zinc-950 px-4 py-4 text-lg font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors">
              {isSaving ? "Saving..." : "Save All Changes"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 flex-1 flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">Product Summary</h2>
        <p className="text-zinc-500 mt-2">Review your product before saving.</p>
      </div>
      
      <div className="max-w-2xl mx-auto w-full space-y-6 pb-8">
        {renderPublication()}
        <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
           <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
             Basic Info 
             <button type="button" onClick={() => setCurrentStep(1)} className="text-sm font-medium text-blue-600 hover:underline">Edit</button>
           </h3>
           <div className="grid grid-cols-2 gap-y-2 text-sm">
             <span className="text-zinc-500">Name:</span><span className="font-medium">{name || "—"}</span>
             <span className="text-zinc-500">Price:</span><span className="font-medium">GHC {price}</span>
             <span className="text-zinc-500">Slug:</span><span className="font-medium">{slug || "—"}</span>
           </div>
        </div>

        <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
           <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
             Images
             <button type="button" onClick={() => setCurrentStep(2)} className="text-sm font-medium text-blue-600 hover:underline">Edit</button>
           </h3>
           <div className="flex gap-4">
             {mainImageUrl ? (
               <img src={mainImageUrl} alt="Main" className="w-16 h-16 object-cover rounded-md border" />
             ) : <span className="text-sm text-zinc-500">No main image</span>}
             {extraImageUrls.filter(u => u).length > 0 && (
               <span className="text-sm text-zinc-500 self-center">+{extraImageUrls.filter(u => u).length} extra images</span>
             )}
           </div>
        </div>

        <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
           <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
             Variants
             <button type="button" onClick={() => setCurrentStep(hasVariants ? 6 : 5)} className="text-sm font-medium text-blue-600 hover:underline">Edit</button>
           </h3>
           <div className="text-sm">
             {hasVariants ? (
               <span>Configured as {variantType} ({variants.length} options)</span>
             ) : (
               <span className="text-zinc-500">No variants</span>
             )}
           </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
      
      <div className="mt-auto pt-4 flex justify-center pb-4">
        <button type="button" onClick={handleSave} disabled={isSaving} className="flex w-64 justify-center rounded-full bg-zinc-950 px-4 py-4 text-lg font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors">
          {isSaving ? "Saving..." : "Finish & Create Product"}
        </button>
      </div>
    </div>
  );
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90dvh] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl relative p-8">
        
        <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
          <button type="button" onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        


        <div className="mt-6 w-full max-w-lg mx-auto">
          {renderProgressBar()}
        </div>

        <div className="flex-1 overflow-y-auto w-full flex flex-col">
          {currentStep === 0 && renderSellingMode()}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          {currentStep === 7 && renderStep7()}
        </div>
      </div>
    </div>
  );
}
