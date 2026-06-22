"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { dataStore } from "@/lib/dataStore";
import type { Product, ProductSize, Collection, WearTag, ProductVariant } from "@/lib/types";
import { Edit2, Plus, X, Trash2, Layers, Package } from "lucide-react";
import AssetUrlField from "@/components/AssetUrlField";
import AssetGalleryField from "@/components/AssetGalleryField";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";

const DEFAULT_SIZES: ProductSize[] = [
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

type SizeButtonsMode = "standard" | "uk";

function isUkSizeName(name: string): boolean {
  const n = String(name || "").trim().toUpperCase();
  return n.startsWith("UK");
}

function inferSizeButtonsMode(sizes?: ProductSize[] | null): SizeButtonsMode {
  if (!sizes || sizes.length === 0) return "standard";
  return sizes.some((s) => isUkSizeName(s.name)) ? "uk" : "standard";
}



const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sanitizeCollectionSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type TabId = "collections" | "products";

function CombosEditor({ variantId, variants, setVariants, productUploadFolder }: { variantId: string, variants: ProductVariant[], setVariants: (v: ProductVariant[]) => void, productUploadFolder: string }) {
  const variant = variants.find(v => v.id === variantId);
  const combos = variant?.combos || [];
  return (
    <div className="mt-6 border-t border-zinc-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-zinc-700">Paired Combos</label>
        <button
          type="button"
          onClick={() => {
            const next = [...variants];
            const vIdx = next.findIndex(v => v.id === variantId);
            if (vIdx !== -1) {
              const nextCombos = [...(next[vIdx].combos || []), { id: `combo-${Date.now()}`, name: "", price: 0, thumbnailUrl: "", images: [] }];
              next[vIdx] = { ...next[vIdx], combos: nextCombos };
              setVariants(next);
            }
          }}
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Plus className="-ml-1 mr-1 h-3 w-3" />
          Add Combo
        </button>
      </div>

      <div className="space-y-4">
        {combos.map((combo, comboIdx) => (
          <div key={combo.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-zinc-900">Combo {comboIdx + 1}</span>
              <button
                type="button"
                onClick={() => {
                  const next = [...variants];
                  const vIdx = next.findIndex(v => v.id === variantId);
                  if (vIdx !== -1) {
                    const nextCombos = (next[vIdx].combos || []).filter(c => c.id !== combo.id);
                    next[vIdx] = { ...next[vIdx], combos: nextCombos };
                    setVariants(next);
                  }
                }}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Combo Name</label>
                <input
                  type="text"
                  value={combo.name}
                  placeholder="e.g. White Jeans"
                  onChange={(e) => {
                    const next = [...variants];
                    const vIdx = next.findIndex(v => v.id === variantId);
                    if (vIdx !== -1) {
                      const nextCombos = [...(next[vIdx].combos || [])];
                      const cIdx = nextCombos.findIndex(c => c.id === combo.id);
                      if (cIdx !== -1) {
                        nextCombos[cIdx] = { ...nextCombos[cIdx], name: e.target.value };
                        next[vIdx] = { ...next[vIdx], combos: nextCombos };
                        setVariants(next);
                      }
                    }
                  }}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Display Format</label>
                <AdminStyledSelect
                  name={`combo-format-${combo.id}`}
                  defaultValue={combo.nameFormat || "plus"}
                  options={[
                    { value: "plus", label: "Base + Combo" },
                    { value: "brackets", label: "Base (Combo)" },
                  ]}
                  onValueChange={(val) => {
                    const next = [...variants];
                    const vIdx = next.findIndex(v => v.id === variantId);
                    if (vIdx !== -1) {
                      const nextCombos = [...(next[vIdx].combos || [])];
                      const cIdx = nextCombos.findIndex(c => c.id === combo.id);
                      if (cIdx !== -1) {
                        nextCombos[cIdx] = { ...nextCombos[cIdx], nameFormat: val as "plus" | "brackets" };
                        next[vIdx] = { ...next[vIdx], combos: nextCombos };
                        setVariants(next);
                      }
                    }
                  }}
                  wrapperClassName="mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Price Override (GHC)</label>
                <input
                  type="number"
                  value={combo.price || ""}
                  placeholder="0.00"
                  onChange={(e) => {
                    const next = [...variants];
                    const vIdx = next.findIndex(v => v.id === variantId);
                    if (vIdx !== -1) {
                      const nextCombos = [...(next[vIdx].combos || [])];
                      const cIdx = nextCombos.findIndex(c => c.id === combo.id);
                      if (cIdx !== -1) {
                        nextCombos[cIdx] = { ...nextCombos[cIdx], price: parseFloat(e.target.value) || 0 };
                        next[vIdx] = { ...next[vIdx], combos: nextCombos };
                        setVariants(next);
                      }
                    }
                  }}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="mb-4">
              <AssetUrlField
                id={`variant-${variantId}-combo-${combo.id}-thumb`}
                label="Thumbnail Image (Small swatch)"
                value={combo.thumbnailUrl || ""}
                onChange={(url) => {
                  const next = [...variants];
                  const vIdx = next.findIndex(v => v.id === variantId);
                  if (vIdx !== -1) {
                    const nextCombos = [...(next[vIdx].combos || [])];
                    const cIdx = nextCombos.findIndex(c => c.id === combo.id);
                    if (cIdx !== -1) {
                      nextCombos[cIdx] = { ...nextCombos[cIdx], thumbnailUrl: url };
                      next[vIdx] = { ...next[vIdx], combos: nextCombos };
                      setVariants(next);
                    }
                  }
                }}
                uploadFolder={`${productUploadFolder}/variants/${variantId}/combos/${combo.id}`}
                accept="image/*"
                placeholder="URL or upload"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-700">Gallery Images (Max 3)</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((imgIdx) => (
                  <AssetUrlField
                    key={imgIdx}
                    id={`variant-${variantId}-combo-${combo.id}-img-${imgIdx}`}
                    label={`Image ${imgIdx + 1}`}
                    value={(combo.images || [])[imgIdx] || ""}
                    onChange={(url) => {
                      const next = [...variants];
                      const vIdx = next.findIndex(v => v.id === variantId);
                      if (vIdx !== -1) {
                        const nextCombos = [...(next[vIdx].combos || [])];
                        const cIdx = nextCombos.findIndex(c => c.id === combo.id);
                        if (cIdx !== -1) {
                          const newImages = [...(nextCombos[cIdx].images || [])];
                          newImages[imgIdx] = url;
                          nextCombos[cIdx] = { ...nextCombos[cIdx], images: newImages };
                          next[vIdx] = { ...next[vIdx], combos: nextCombos };
                          setVariants(next);
                        }
                      }
                    }}
                    uploadFolder={`${productUploadFolder}/variants/${variantId}/combos/${combo.id}`}
                    accept="image/*,video/mp4,video/webm"
                    placeholder="URL or upload"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
        {combos.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-center">
            <p className="text-sm text-zinc-500">No combos added for this color.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoadError, setCollectionsLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [collectionFormError, setCollectionFormError] = useState("");
  const [collectionSaving, setCollectionSaving] = useState(false);

  const [mainImageUrl, setMainImageUrl] = useState("");
  const [hoverImageUrl, setHoverImageUrl] = useState("");
  const [extraImageUrls, setExtraImageUrls] = useState<string[]>(["", "", ""]);
  const [newProductUploadKey, setNewProductUploadKey] = useState("");
  const [detailsLines, setDetailsLines] = useState<string[]>([""]);
  const detailInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [sizeButtonsMode, setSizeButtonsMode] = useState<SizeButtonsMode>("standard");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [productModalTab, setProductModalTab] = useState<"regular" | "variant">("regular");

  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [collectionPendingDelete, setCollectionPendingDelete] = useState<Collection | null>(null);

  const [colMainImageUrl, setColMainImageUrl] = useState("");
  const [colHoverImageUrl, setColHoverImageUrl] = useState("");
  const [colGalleryUrls, setColGalleryUrls] = useState<string[]>([]);
  const [colDetailWriteup, setColDetailWriteup] = useState("");
  const [colDetailVideoUrl, setColDetailVideoUrl] = useState("");
  const [colDetailVideoPosterUrl, setColDetailVideoPosterUrl] = useState("");
  const [colDetailGalleryUrls, setColDetailGalleryUrls] = useState<string[]>([]);
  const [pendingColSlug, setPendingColSlug] = useState("");

  const productUploadFolder = editingProduct?.id
    ? `products/${editingProduct.id}`
    : newProductUploadKey
      ? `products/${newProductUploadKey}`
      : "products/draft";

  useEffect(() => {
    if (!isModalOpen) return;
    if (editingProduct) {
      const main =
        editingProduct.image?.trim() ||
        editingProduct.images?.find((u) => u?.trim()) ||
        "";
      setMainImageUrl(main);
      const extras = (editingProduct.images || [])
        .filter((u) => u?.trim() && u.trim() !== main)
        .slice(0, 3);
      setExtraImageUrls([0, 1, 2].map((i) => extras[i] ?? ""));
      setHoverImageUrl(editingProduct.hoverImage?.trim() || "");
      setDetailsLines(editingProduct.details?.length ? editingProduct.details : [""]);
      setSizeButtonsMode(inferSizeButtonsMode(editingProduct.sizes));
      setVariants(editingProduct.variants || []);
      setProductModalTab(editingProduct.variants && editingProduct.variants.length > 0 ? "variant" : "regular");
    } else {
      setMainImageUrl("");
      setHoverImageUrl("");
      setExtraImageUrls(["", "", ""]);
      setDetailsLines([""]);
      setSizeButtonsMode("standard");
      setVariants([]);
      setProductModalTab("regular");
    }
  }, [isModalOpen, editingProduct]);

  const sizesForEditor = useMemo(() => {
    const base = sizeButtonsMode === "uk" ? UK_SIZES : DEFAULT_SIZES;
    const existing = editingProduct?.sizes ?? [];
    const map = new Map(existing.map((s) => [s.name, Boolean(s.available)]));
    return base.map((s) => ({
      ...s,
      available: map.has(s.name) ? Boolean(map.get(s.name)) : Boolean(s.available),
    }));
  }, [editingProduct, sizeButtonsMode]);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getProducts();
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
    try {
      const cols = await dataStore.getCollections();
      setCollections(cols);
      setCollectionsLoadError("");
    } catch (e) {
      setCollections([]);
      setCollectionsLoadError(
        e instanceof Error
          ? e.message
          : "Could not load collections. Run supabase_collections.sql in the Supabase SQL editor.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCollectionsOnly = useCallback(async () => {
    try {
      const cols = await dataStore.getCollections();
      setCollections(cols);
      setCollectionsLoadError("");
    } catch (e) {
      setCollections([]);
      setCollectionsLoadError(
        e instanceof Error ? e.message : "Could not load collections. Run supabase_collections.sql in the SQL editor.",
      );
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = dataStore.subscribe(load);
    return unsubscribe;
  }, [load]);

  // Auto-open product editor when ?edit=<productId> is in the URL
  const editParam = searchParams.get("edit");
  const autoOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editParam || products.length === 0) return;
    // Prevent re-opening if we already handled this param
    if (autoOpenedRef.current === editParam) return;
    const match = products.find((p) => p.id === editParam);
    if (match) {
      autoOpenedRef.current = editParam;
      setTab("products");
      setEditingProduct(match);
      setError("");
      setNewProductUploadKey("");
      setIsModalOpen(true);
      // Clean the URL param so closing the modal doesn't re-trigger
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [editParam, products, router]);

  useEffect(() => {
    if (tab === "collections") loadCollectionsOnly();
  }, [tab, loadCollectionsOnly]);

  const collectionOptions = useMemo(() => {
    const base = collections;
    
    // Add "None" option
    const optionsWithNone = [
      {
        id: "none",
        slug: "none",
        name: "None (Standalone Product)",
        briefDescription: "",
        description: "",
        sortOrder: -1,
        createdAt: "",
      },
      ...base
    ];

    if (editingProduct && editingProduct.category && !optionsWithNone.some((c) => c.slug === editingProduct.category)) {
      return [
        ...optionsWithNone,
        {
          id: "orphan",
          slug: editingProduct.category,
          name: `${editingProduct.categoryName} (current)`,
          briefDescription: "",
          description: "",
          sortOrder: 999,
          createdAt: "",
        },
      ];
    }
    return optionsWithNone;
  }, [collections, editingProduct]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setError("");
    setNewProductUploadKey("");
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setError("");
    setNewProductUploadKey(`draft-${Date.now()}`);
    setIsModalOpen(true);
  };

  const handleRequestDeleteProduct = (product: Product) => {
    setProductPendingDelete(product);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    let slug = (formData.get("slug") as string)?.trim().toLowerCase();
    if (!slug) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    const category = formData.get("category") as string;
    const price = Number(formData.get("price"));
    const primary = mainImageUrl.trim();
    if (!primary) {
      setError("Add a main product image URL.");
      setIsSaving(false);
      return;
    }
    const extras = extraImageUrls.map((s) => s.trim()).filter((u) => u && u !== primary);
    const images = [primary, ...extras];
    const description = formData.get("description") as string;
    const detailsRaw = (formData.get("details") as string) || "";
    const details = detailsRaw
      .split(/\n/)
      .map((s) => s.replace(/^[•\-\u2022]\s*/, "").trim())
      .filter(Boolean);
    const isOutOfStock = formData.get("isOutOfStock") === "on";
    const isLimited = formData.get("isLimited") === "on";
    const isBestSeller = formData.get("isBestSeller") === "on";
    const featured = formData.get("featured") === "on";
    const wearRaw = (formData.get("wearTag") as string) || "unisex";
    const wearTag: WearTag =
      wearRaw === "mens" || wearRaw === "womens" || wearRaw === "unisex" ? wearRaw : "unisex";
    const quantity = Number(formData.get("quantity")) || 0;

    const col = collectionOptions.find((c) => c.slug === category);
    const categoryName =
      category === "none"
        ? ""
        : col?.name || editingProduct?.categoryName || category;

    const newSizes: ProductSize[] = sizesForEditor.map((s) => ({
      ...s,
      available: formData.get(`size-${s.name}`) === "on",
    }));

    try {
      if (editingProduct) {
        await dataStore.updateProduct(editingProduct.id, {
          slug,
          name,
          categoryName,
          category,
          price,
          image: primary,
          hoverImage: hoverImageUrl.trim(),
          images,
          description,
          details,
          isOutOfStock,
          isLimited,
          isBestSeller,
          featured,
          sizes: newSizes,
          wearTag,
          quantity,
          variants: productModalTab === "variant" ? variants : [],
        });
      } else {
        await dataStore.addProduct({
          slug,
          name,
          categoryName,
          category,
          price,
          image: primary,
          hoverImage: hoverImageUrl.trim(),
          images,
          description,
          details,
          sizes: newSizes,
          isOutOfStock,
          isLimited,
          isBestSeller,
          featured,
          wearTag,
          quantity,
          variants: productModalTab === "variant" ? variants : [],
        });
      }
      toast.success(editingProduct ? "Product updated." : "Product created.");
      setIsModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save product.";
      setError(msg);
      toast.error(msg);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const openAddCollection = () => {
    setEditingCollection(null);
    setCollectionFormError("");
    setColMainImageUrl("");
    setColHoverImageUrl("");
    setColGalleryUrls([]);
    setColDetailWriteup("");
    setColDetailVideoUrl("");
    setColDetailVideoPosterUrl("");
    setColDetailGalleryUrls([]);
    setPendingColSlug("");
    setCollectionModalOpen(true);
  };

  const openEditCollection = (c: Collection) => {
    setEditingCollection(c);
    setCollectionFormError("");
    setColMainImageUrl(c.image?.trim() || "");
    setColHoverImageUrl(c.hoverImage || "");
    setColGalleryUrls(c.galleryUrls ?? []);
    setColDetailWriteup(String(c.detailWriteup ?? c.description ?? ""));
    setColDetailVideoUrl(String(c.detailVideoUrl ?? ""));
    setColDetailVideoPosterUrl(String(c.detailVideoPosterUrl ?? ""));
    setColDetailGalleryUrls((c.detailGalleryUrls ?? []).map((u) => String(u || "").trim()).filter(Boolean));
    setPendingColSlug("");
    setCollectionModalOpen(true);
  };

  const collectionGalleryFolder = useMemo(() => {
    const slug =
      (editingCollection?.slug && editingCollection.slug.trim()) ||
      sanitizeCollectionSlug(pendingColSlug) ||
      "draft";
    return `collections/${slug}/gallery`;
  }, [editingCollection?.slug, pendingColSlug]);

  const handleSaveCollection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCollectionSaving(true);
    setCollectionFormError("");
    const form = e.currentTarget;
    const name = (form.querySelector('[name="col-name"]') as HTMLInputElement).value.trim();
    const briefDescription = (form.querySelector('[name="col-brief-description"]') as HTMLTextAreaElement).value.trim();
    const description = (form.querySelector('[name="col-detailed-description"]') as HTMLTextAreaElement).value.trim();
    const detailWriteup = colDetailWriteup.trim();
    const detailVideoUrl = colDetailVideoUrl.trim();
    const detailVideoPosterUrl = colDetailVideoPosterUrl.trim();
    const sortOrder = Number((form.querySelector('[name="col-sort"]') as HTMLInputElement).value) || 0;

    try {
      const galleryUrls = colGalleryUrls.map((u) => String(u || "").trim()).filter(Boolean);
      const detailGalleryUrls = colDetailGalleryUrls.map((u) => String(u || "").trim()).filter(Boolean);
      if (editingCollection) {
        await dataStore.updateCollection(editingCollection.id, {
          name,
          briefDescription,
          description,
          sortOrder,
          image: colMainImageUrl,
          hoverImage: colHoverImageUrl,
          galleryUrls,
          detailWriteup,
          detailVideoUrl,
          detailVideoPosterUrl,
          detailGalleryUrls,
        });
      } else {
        let slug = (form.querySelector('[name="col-slug"]') as HTMLInputElement).value.trim().toLowerCase();
        if (!slug) {
          slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        }
        if (!SLUG_PATTERN.test(slug)) {
          const msg =
            "Slug: lowercase letters, numbers, and hyphens only (e.g. spring-drop).";
          setCollectionFormError(msg);
          toast.error(msg);
          setCollectionSaving(false);
          return;
        }
        await dataStore.addCollection({
          slug,
          name,
          briefDescription,
          description,
          sortOrder,
          image: colMainImageUrl,
          hoverImage: colHoverImageUrl,
          galleryUrls,
          detailWriteup,
          detailVideoUrl,
          detailVideoPosterUrl,
          detailGalleryUrls,
        });
      }
      toast.success(editingCollection ? "Collection updated." : "Collection created.");
      setCollectionModalOpen(false);
      await loadCollectionsOnly();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save collection.";
      setCollectionFormError(msg);
      toast.error(msg);
    } finally {
      setCollectionSaving(false);
    }
  };

  const handleRequestDeleteCollection = (c: Collection) => {
    setCollectionPendingDelete(c);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-zinc-900">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Products</h1>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-1">
          <button
            type="button"
            onClick={() => setTab("collections")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "collections"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Layers className="h-4 w-4" aria-hidden />
            Create collections
          </button>
          <button
            type="button"
            onClick={() => setTab("products")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "products"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Package className="h-4 w-4" aria-hidden />
            Create products
          </button>
        </div>
      </div>

      {tab === "collections" && (
        <div className="space-y-4">
          {collectionsLoadError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {collectionsLoadError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              Collections define shop category slugs. Each product must use one slug; display names can differ per product if needed.
            </p>
            <button
              type="button"
              onClick={openAddCollection}
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden />
              Add collection
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Slug
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Sort
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Brief
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {collections.length > 0 ? (
                    collections.map((c) => (
                      <tr key={c.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">{c.name}</td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-zinc-700">{c.slug}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">{c.sortOrder}</td>
                        <td className="max-w-xs truncate px-6 py-4 text-sm text-zinc-700">{c.briefDescription || "—"}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => openEditCollection(c)}
                            className="mr-4 text-zinc-600 hover:text-zinc-900"
                          >
                            <Edit2 className="inline h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteCollection(c)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="inline h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : collectionsLoadError ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-red-500">
                        Error loading collections: {collectionsLoadError}
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500">
                        No collections found. Create your first collection above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden />
              Add product
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Price
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {product.image?.trim() ? (
                              product.image.trim().match(/\.(mp4|webm)$/i) ? (
                                <video
                                  className="h-10 w-10 rounded-md object-cover"
                                  src={product.image.trim()}
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                />
                              ) : (
                                <img
                                  className="h-10 w-10 rounded-md object-cover"
                                  src={product.image.trim()}
                                  alt=""
                                />
                              )
                            ) : (
                              <div
                                className="h-10 w-10 rounded-md bg-zinc-200"
                                aria-hidden
                              />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-zinc-900">{product.name}</div>
                            <div className="text-xs text-zinc-600">{product.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                        {product.category === "none"
                          ? "—"
                          : collections.find((c) => c.slug === product.category)?.name || product.categoryName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {product.isOutOfStock ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                            In Stock
                          </span>
                        )}
                        {product.isLimited && (
                          <span className="ml-2 inline-flex rounded-full bg-orange-100 px-2 text-xs font-semibold leading-5 text-orange-800">
                            Limited
                          </span>
                        )}
                        {product.isBestSeller && (
                          <span className="ml-2 inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">
                            Best Seller
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                        {product.quantity}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-zinc-900">
                        GHC {product.price.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="mr-4 text-zinc-600 hover:text-zinc-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteProduct(product)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-4">
              <h2 className="text-xl font-bold">{editingProduct ? "Edit product" : "Add product"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-600 hover:text-zinc-900">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="border-b border-zinc-200 px-6 py-4 flex justify-center">
              <div className="inline-flex rounded-lg bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => setProductModalTab("regular")}
                  className={`rounded-md px-6 py-2 text-sm font-medium transition-all ${
                    productModalTab === "regular"
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Regular Product
                </button>
                <button
                  type="button"
                  onClick={() => setProductModalTab("variant")}
                  className={`rounded-md px-6 py-2 text-sm font-medium transition-all ${
                    productModalTab === "variant"
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Product with Variants
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex-1 space-y-6 overflow-y-auto p-6">
              {productModalTab === "variant" && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-sm mb-6">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-zinc-900">Variants</h3>
                    <p className="mt-1 text-sm text-zinc-600">Select the variant types for the product</p>
                  </div>
                  
                  <div className="flex gap-6 mb-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-zinc-300"
                        checked={variants.some(v => v.id === "main-color")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVariants([{ id: "main-color", type: "color", images: [] }, ...variants]);
                          } else {
                            setVariants(variants.filter(v => v.id !== "main-color"));
                          }
                        }}
                      />
                      <span className="text-sm font-medium">Color</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-zinc-300"
                        checked={variants.some(v => v.id === "fit-combo")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVariants([...variants, { id: "fit-combo", type: "fit_combo", images: [] }]);
                          } else {
                            setVariants(variants.filter(v => v.id !== "fit-combo"));
                          }
                        }}
                      />
                      <span className="text-sm font-medium">Fit Combo</span>
                    </label>
                  </div>

                  {variants.some(v => v.id === "main-color") && (
                    <div className="space-y-6">
                      <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center justify-between">
                          <span className="text-sm font-semibold text-zinc-900">Main Color</span>
                          <button
                            type="button"
                            onClick={() => setVariants(variants.filter(v => v.id !== "main-color"))}
                            className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label="Remove color"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-zinc-700">Color Hex</label>
                            <div className="mt-2 flex items-center gap-3">
                              <input
                                type="color"
                                value={variants.find(v => v.id === "main-color")?.colorHex || "#000000"}
                                onChange={(e) => {
                                  const next = [...variants];
                                  const vIdx = next.findIndex(v => v.id === "main-color");
                                  if (vIdx !== -1) {
                                    next[vIdx] = { ...next[vIdx], colorHex: e.target.value };
                                    setVariants(next);
                                  }
                                }}
                                className="h-10 w-10 cursor-pointer rounded-md border border-zinc-200 p-0 shadow-sm"
                              />
                              <input
                                type="text"
                                value={variants.find(v => v.id === "main-color")?.colorHex || ""}
                                placeholder="#000000"
                                onChange={(e) => {
                                  const next = [...variants];
                                  const vIdx = next.findIndex(v => v.id === "main-color");
                                  if (vIdx !== -1) {
                                    next[vIdx] = { ...next[vIdx], colorHex: e.target.value };
                                    setVariants(next);
                                  }
                                }}
                                className="block w-32 rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm shadow-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <CombosEditor
                          variantId="main-color"
                          variants={variants}
                          setVariants={setVariants}
                          productUploadFolder={productUploadFolder}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingProduct?.name}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700">URL Slug (leave empty to auto-generate)</label>
                  <input
                    type="text"
                    name="slug"
                    defaultValue={editingProduct?.slug}
                    placeholder="e.g. summer-crochet"
                    className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm font-mono placeholder:text-zinc-400"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700" id="product-field-collection">
                    Collection (slug)
                  </label>
                  <AdminStyledSelect
                    name="category"
                    labelledBy="product-field-collection"
                    defaultValue={editingProduct?.category || collectionOptions[0]?.slug || "always-lit"}
                    wrapperClassName="mt-1"
                    options={collectionOptions.map((col) => ({
                      value: col.slug,
                      label: `${col.name} (${col.slug})`,
                    }))}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700">Price (GHC)</label>
                  <input
                    type="number"
                    name="price"
                    defaultValue={editingProduct?.price}
                    required
                    min={0}
                    step="0.01"
                    className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700">Quantity in Stock</label>
                  <input
                    type="number"
                    name="quantity"
                    defaultValue={editingProduct?.quantity ?? 0}
                    required
                    min={0}
                    className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700" id="product-field-wear">
                    Shop wear filter
                  </label>
                  <AdminStyledSelect
                    name="wearTag"
                    labelledBy="product-field-wear"
                    defaultValue={editingProduct?.wearTag ?? "unisex"}
                    wrapperClassName="mt-1"
                    options={[
                      { value: "unisex", label: "Unisex (shows in Men's and Women's)" },
                      { value: "mens", label: "Men's wear" },
                      { value: "womens", label: "Women's wear" },
                    ]}
                  />
                </div>

                <div className="col-span-2">
                  <AssetUrlField
                    id="product-main-image"
                    label="Primary image"
                    value={mainImageUrl}
                    onChange={setMainImageUrl}
                    uploadFolder={productUploadFolder}
                    accept="image/*,video/mp4,video/webm"
                    placeholder="https://… or upload"
                  />
                  <p className="mt-1 text-xs text-zinc-700">
                    Used as the main photo on the shop and in lists. Upload or paste a URL.
                  </p>
                </div>

                <div className="col-span-2">
                  <AssetUrlField
                    id="product-hover-image"
                    label="Hover image (shop grid)"
                    value={hoverImageUrl}
                    onChange={setHoverImageUrl}
                    uploadFolder={productUploadFolder}
                    accept="image/*,video/mp4,video/webm"
                    placeholder="Optional — shown when customers hover the product card"
                  />
                  <p className="mt-1 text-xs text-zinc-700">
                    Optional second shot for the shop and wishlist cards. Leave empty to only zoom the main image on hover.
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm font-medium text-zinc-700">Gallery images</p>
                  <p className="mt-0.5 text-xs text-zinc-700">
                    Up to three extra photos for the product detail page (thumbnails / gallery).
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {[0, 1, 2].map((i) => (
                      <AssetUrlField
                        key={i}
                        id={`product-gallery-${i}`}
                        label={`Additional image ${i + 1}`}
                        value={extraImageUrls[i] ?? ""}
                        onChange={(url) => {
                          setExtraImageUrls((prev) => {
                            const next = [...prev];
                            next[i] = url;
                            return next;
                          });
                        }}
                        uploadFolder={productUploadFolder}
                        accept="image/*,video/mp4,video/webm"
                        placeholder="Optional — URL or upload"
                      />
                    ))}
                  </div>
                </div>

                {variants.some(v => v.id === "fit-combo") && (
                  <div className="col-span-2 mt-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-zinc-900 mb-4">Fit Combo Details</h3>
                    <div className="grid gap-6">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700">Combo Name</label>
                        <input
                          type="text"
                          value={variants.find(v => v.id === "fit-combo")?.name || ""}
                          placeholder="e.g., Two-Piece Set"
                          onChange={(e) => {
                            const next = [...variants];
                            const idx = next.findIndex(v => v.id === "fit-combo");
                            if (idx !== -1) {
                              next[idx] = { ...next[idx], name: e.target.value };
                              setVariants(next);
                            }
                          }}
                          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700">Display Format</label>
                        <AdminStyledSelect
                          name="fit-combo-format"
                          defaultValue={variants.find(v => v.id === "fit-combo")?.nameFormat || "plus"}
                          options={[
                            { value: "plus", label: "Base + Combo" },
                            { value: "brackets", label: "Base (Combo)" },
                          ]}
                          onValueChange={(val) => {
                            const next = [...variants];
                            const idx = next.findIndex(v => v.id === "fit-combo");
                            if (idx !== -1) {
                              next[idx] = { ...next[idx], nameFormat: val as "plus" | "brackets" };
                              setVariants(next);
                            }
                          }}
                          wrapperClassName="mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700">Combo Price Override (GHC)</label>
                        <input
                          type="number"
                          value={variants.find(v => v.id === "fit-combo")?.price || ""}
                          placeholder="0.00"
                          onChange={(e) => {
                            const next = [...variants];
                            const idx = next.findIndex(v => v.id === "fit-combo");
                            if (idx !== -1) {
                              next[idx] = { ...next[idx], price: parseFloat(e.target.value) || 0 };
                              setVariants(next);
                            }
                          }}
                          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm bg-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Combo Thumbnail Image</label>
                        <AssetUrlField
                          id="fit-combo-thumb"
                          label="Thumbnail Image URL"
                          value={variants.find(v => v.id === "fit-combo")?.thumbnailUrl || ""}
                          onChange={(url) => {
                            const next = [...variants];
                            const idx = next.findIndex(v => v.id === "fit-combo");
                            if (idx !== -1) {
                              next[idx] = { ...next[idx], thumbnailUrl: url };
                              setVariants(next);
                            }
                          }}
                          uploadFolder={`${productUploadFolder}/variants/fit-combo`}
                          accept="image/*"
                          placeholder="Thumbnail URL or upload"
                        />
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-zinc-700">Variant images</p>
                        <p className="mt-0.5 text-xs text-zinc-700">
                          Three photos specific to this fit combo variant.
                        </p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          {[0, 1, 2].map((i) => (
                            <AssetUrlField
                              key={i}
                              id={`fit-combo-img-${i}`}
                              label={`Variant image ${i + 1}`}
                              value={(variants.find(v => v.id === "fit-combo")?.images || [])[i] || ""}
                              onChange={(url) => {
                                const next = [...variants];
                                const idx = next.findIndex(v => v.id === "fit-combo");
                                if (idx !== -1) {
                                  const images = [...(next[idx].images || [])];
                                  images[i] = url;
                                  next[idx] = { ...next[idx], images };
                                  setVariants(next);
                                }
                              }}
                              uploadFolder={productUploadFolder}
                              accept="image/*,video/mp4,video/webm"
                              placeholder="Optional — URL or upload"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingProduct?.description}
                    className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    Care Guide <span className="font-normal text-zinc-700">(product page)</span>
                  </label>
                  <div className="mt-2 space-y-2">
                    {detailsLines.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="select-none text-zinc-400">•</span>
                        <input
                          ref={(el) => {
                            detailInputRefs.current[idx] = el;
                          }}
                          type="text"
                          value={v}
                          placeholder={idx === 0 ? "Type a detail and press Enter…" : "Next detail…"}
                          onChange={(e) => {
                            const next = [...detailsLines];
                            next[idx] = e.target.value;
                            setDetailsLines(next);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const next = [...detailsLines];
                            next.splice(idx + 1, 0, "");
                            setDetailsLines(next);
                            requestAnimationFrame(() => {
                              detailInputRefs.current[idx + 1]?.focus();
                            });
                          }}
                          className="block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                        />
                        {detailsLines.length > 1 ? (
                          <button
                            type="button"
                            className="rounded-md border border-zinc-200 px-2 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            onClick={() => {
                              const next = detailsLines.filter((_, i) => i !== idx);
                              setDetailsLines(next.length ? next : [""]);
                              requestAnimationFrame(() => {
                                detailInputRefs.current[Math.max(0, idx - 1)]?.focus();
                              });
                            }}
                            aria-label="Remove detail"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                    <div>
                      <button
                        type="button"
                        className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        onClick={() => {
                          setDetailsLines((prev) => [...prev, ""]);
                          requestAnimationFrame(() => {
                            detailInputRefs.current[detailsLines.length]?.focus();
                          });
                        }}
                      >
                        + Add another line
                      </button>
                    </div>
                    <textarea
                      name="details"
                      value={detailsLines.join("\n")}
                      readOnly
                      className="hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-700">
                    Shown in the &quot;Care Guide&quot; list on the product page (above Shipping &amp; Returns). Leave
                    empty to hide that block.
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Inventory &amp; tags</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="isOutOfStock"
                        defaultChecked={editingProduct?.isOutOfStock}
                        className="rounded border-zinc-300 text-zinc-900"
                      />
                      <span className="text-sm font-medium text-zinc-900">Out of stock</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="isLimited"
                        defaultChecked={editingProduct?.isLimited}
                        className="rounded border-zinc-300 text-zinc-900"
                      />
                      <span className="text-sm font-medium text-zinc-900">Limited edition / archive</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="isBestSeller"
                        defaultChecked={editingProduct?.isBestSeller}
                        className="rounded border-zinc-300 text-zinc-900"
                      />
                      <span className="text-sm font-medium text-zinc-900">Best seller</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="featured"
                        defaultChecked={editingProduct?.featured}
                        className="rounded border-zinc-300 text-zinc-900"
                      />
                      <span className="text-sm font-medium text-zinc-900">Featured on homepage</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Sizes</label>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium text-zinc-600">Size buttons</span>
                    <AdminStyledSelect
                      name="sizeButtonsMode"
                      defaultValue={sizeButtonsMode}
                      onValueChange={(v) => setSizeButtonsMode(v === "uk" ? "uk" : "standard")}
                      options={[
                        { value: "standard", label: "Standard (XS–Custom)" },
                        { value: "uk", label: "UK (UK 6–UK 22)" },
                      ]}
                      wrapperClassName="min-w-[280px]"
                    />
                    <span className="text-xs text-zinc-600">
                      Choose which size buttons shoppers will see.
                    </span>
                  </div>

                  <div key={sizeButtonsMode} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {sizesForEditor.map((size) => (
                      <label
                        key={size.name}
                        className="flex cursor-pointer items-center space-x-2 rounded border bg-white p-2 hover:bg-zinc-100"
                      >
                        <input
                          type="checkbox"
                          name={`size-${size.name}`}
                          defaultChecked={size.available}
                          className="rounded border-zinc-300 text-zinc-900"
                        />
                        <span className="whitespace-nowrap text-sm font-medium">{size.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-zinc-700">Uncheck a size to mark it unavailable.</p>
                </div>

                {productModalTab === "variant" && (
                  <div className="col-span-2 border-t border-zinc-200 pt-6 mt-2">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700">Additional Variants</label>
                        <p className="mt-1 text-xs text-zinc-700">Add other color or fit options for this product.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVariants([...variants, { id: `var-${Date.now()}`, type: "color", images: [] }])}
                        className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        <Plus className="-ml-1 mr-1 h-3 w-3" />
                        Add variant
                      </button>
                    </div>

                    <div className="space-y-4">
                      {variants.filter(v => v.id !== "main-color" && v.id !== "fit-combo").map((variant, idx) => (
                        <div key={variant.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-zinc-900">Variant {idx + 1}</span>
                              <AdminStyledSelect
                                name={`variant-type-${variant.id}`}
                                defaultValue={variant.type}
                                options={[
                                  { value: "color", label: "Color" }
                                ]}
                                onValueChange={(val) => {
                                  const next = [...variants];
                                  const vIdx = next.findIndex(v => v.id === variant.id);
                                  next[vIdx] = { ...next[vIdx], type: val as any };
                                  setVariants(next);
                                }}
                                wrapperClassName="min-w-[180px]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setVariants(variants.filter(v => v.id !== variant.id))}
                              className="text-red-500 hover:text-red-700"
                              aria-label="Remove variant"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {variant.type === "color" && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-medium text-zinc-700">Color Hex</label>
                                <div className="mt-1 flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={variant.colorHex || "#000000"}
                                    onChange={(e) => {
                                      const next = [...variants];
                                      const vIdx = next.findIndex(v => v.id === variant.id);
                                      next[vIdx] = { ...next[vIdx], colorHex: e.target.value };
                                      setVariants(next);
                                    }}
                                    className="h-8 w-8 cursor-pointer rounded border border-zinc-300 p-0"
                                  />
                                  <input
                                    type="text"
                                    value={variant.colorHex || ""}
                                    placeholder="#000000"
                                    onChange={(e) => {
                                      const next = [...variants];
                                      const vIdx = next.findIndex(v => v.id === variant.id);
                                      next[vIdx] = { ...next[vIdx], colorHex: e.target.value };
                                      setVariants(next);
                                    }}
                                    className="block w-32 rounded-md border border-zinc-300 p-1.5 font-mono text-sm shadow-sm"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="mb-2 block text-xs font-medium text-zinc-700">Variant Images (Max 3)</label>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                  {[0, 1, 2].map((imgIdx) => (
                                    <AssetUrlField
                                      key={imgIdx}
                                      id={`variant-${variant.id}-img-${imgIdx}`}
                                      label={`Image ${imgIdx + 1}`}
                                      value={(variant.images || [])[imgIdx] || ""}
                                      onChange={(url) => {
                                        const next = [...variants];
                                        const vIdx = next.findIndex(v => v.id === variant.id);
                                        const newImages = [...(next[vIdx].images || [])];
                                        newImages[imgIdx] = url;
                                        next[vIdx] = { ...next[vIdx], images: newImages };
                                        setVariants(next);
                                      }}
                                      uploadFolder={`${productUploadFolder}/variants/${variant.id}`}
                                      accept="image/*,video/mp4,video/webm"
                                      placeholder="URL or upload"
                                    />
                                  ))}
                                </div>
                              </div>

                              <CombosEditor
                                variantId={variant.id}
                                variants={variants}
                                setVariants={setVariants}
                                productUploadFolder={productUploadFolder}
                              />
                            </div>
                          )}

                          {variant.type === "fit_combo" && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-medium text-zinc-700">Variant Name</label>
                                <input
                                  type="text"
                                  value={variant.name || ""}
                                  placeholder="e.g. Two-Piece Set"
                                  onChange={(e) => {
                                    const next = [...variants];
                                    const vIdx = next.findIndex(v => v.id === variant.id);
                                    if (vIdx !== -1) {
                                      next[vIdx] = { ...next[vIdx], name: e.target.value };
                                      setVariants(next);
                                    }
                                  }}
                                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-zinc-700">Display Format</label>
                                <AdminStyledSelect
                                  name={`variant-format-${variant.id}`}
                                  defaultValue={variant.nameFormat || "plus"}
                                  options={[
                                    { value: "plus", label: "Base + Combo" },
                                    { value: "brackets", label: "Base (Combo)" },
                                  ]}
                                  onValueChange={(val) => {
                                    const next = [...variants];
                                    const vIdx = next.findIndex(v => v.id === variant.id);
                                    if (vIdx !== -1) {
                                      next[vIdx] = { ...next[vIdx], nameFormat: val as "plus" | "brackets" };
                                      setVariants(next);
                                    }
                                  }}
                                  wrapperClassName="mt-1"
                                />
                              </div>
                              
                              <div>
                                <label className="mb-2 block text-xs font-medium text-zinc-700">Combo Thumbnail Image</label>
                                <AssetUrlField
                                  id={`variant-${variant.id}-thumb`}
                                  label="Thumbnail Image URL"
                                  value={variant.thumbnailUrl || ""}
                                  onChange={(url) => {
                                    const next = [...variants];
                                    const vIdx = next.findIndex(v => v.id === variant.id);
                                    if (vIdx !== -1) {
                                      next[vIdx] = { ...next[vIdx], thumbnailUrl: url };
                                      setVariants(next);
                                    }
                                  }}
                                  uploadFolder={`${productUploadFolder}/variants/${variant.id}`}
                                  accept="image/*"
                                  placeholder="Thumbnail URL or upload"
                                />
                              </div>
                              
                              <div>
                                <label className="mb-2 block text-xs font-medium text-zinc-700">Variant Images (Max 3)</label>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                  {[0, 1, 2].map((imgIdx) => (
                                    <AssetUrlField
                                      key={imgIdx}
                                      id={`variant-${variant.id}-img-${imgIdx}`}
                                      label={`Image ${imgIdx + 1}`}
                                      value={(variant.images || [])[imgIdx] || ""}
                                      onChange={(url) => {
                                        const next = [...variants];
                                        const vIdx = next.findIndex(v => v.id === variant.id);
                                        const newImages = [...(next[vIdx].images || [])];
                                        newImages[imgIdx] = url;
                                        next[vIdx] = { ...next[vIdx], images: newImages };
                                        setVariants(next);
                                      }}
                                      uploadFolder={`${productUploadFolder}/variants/${variant.id}`}
                                      accept="image/*,video/mp4,video/webm"
                                      placeholder="URL or upload"
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {variants.filter(v => v.id !== "main-color" && v.id !== "fit-combo").length === 0 && (
                        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
                          <p className="text-sm text-zinc-500">No additional variants added.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>
              )}

              <div className="mt-8 flex justify-end space-x-3 border-t border-zinc-200 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : editingProduct ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {collectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[min(90vh,860px)] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingCollection ? "Edit collection" : "Add collection"}</h2>
              <button
                type="button"
                onClick={() => setCollectionModalOpen(false)}
                className="text-zinc-600 hover:text-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCollection} className="space-y-4">
              {!editingCollection && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Slug (leave empty to auto-generate)</label>
                  <input
                    name="col-slug"
                    value={pendingColSlug}
                    onChange={(e) => setPendingColSlug(e.target.value)}
                    placeholder="e.g. spring-drop"
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm font-mono shadow-sm"
                  />
                  <p className="mt-1 text-xs text-zinc-700">Lowercase, hyphens only. Cannot be changed later.</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-700">Display name</label>
                <input
                  name="col-name"
                  required
                  defaultValue={editingCollection?.name}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Brief description</label>
                <p className="mt-0.5 text-xs text-zinc-700">
                  Home page, shop collection cards, and the hero line on the collection page.
                </p>
                <textarea
                  name="col-brief-description"
                  rows={2}
                  placeholder="One or two short lines"
                  defaultValue={editingCollection?.briefDescription}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Detailed description</label>
                <p className="mt-0.5 text-xs text-zinc-700">
                  Full story on the collection detail page (below the hero).
                </p>
                <textarea
                  name="col-detailed-description"
                  rows={5}
                  placeholder="Longer copy for /collection/your-slug"
                  defaultValue={editingCollection?.description}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Sort order</label>
                <input
                  name="col-sort"
                  type="number"
                  defaultValue={editingCollection?.sortOrder ?? 0}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                />
              </div>

              <div className="pt-2">
                <AssetUrlField
                  id="col-image"
                  label="Main Image"
                  value={colMainImageUrl}
                  onChange={setColMainImageUrl}
                  uploadFolder="collections"
                  accept="image/*"
                  placeholder="Main collection showcase image"
                />
              </div>

              <div>
                <AssetUrlField
                  id="col-hover-image"
                  label="Hover Image"
                  value={colHoverImageUrl}
                  onChange={setColHoverImageUrl}
                  uploadFolder="collections"
                  accept="image/*"
                  placeholder="Optional hover effect image"
                />
              </div>

              <AssetGalleryField
                label="Collection page gallery"
                value={colGalleryUrls}
                onChange={setColGalleryUrls}
                uploadFolder={collectionGalleryFolder}
                accept="image/*"
              />
              <p className="-mt-1 text-xs text-zinc-700">
                Shown on the collection page above the shop filter (same grid as event galleries).
              </p>

              <div className="pt-2">
                <label className="block text-sm font-medium text-zinc-700">Detail write-up (optional)</label>
                <p className="mt-0.5 text-xs text-zinc-700">
                  Shown below the first gallery on <code>/collection/[slug]</code>. Leave empty to reuse the detailed description above.
                </p>
                <textarea
                  rows={6}
                  value={colDetailWriteup}
                  onChange={(e) => setColDetailWriteup(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                  placeholder="Write-up shown below the gallery…"
                />
              </div>

              <div className="pt-2">
                <AssetUrlField
                  id="col-detail-video"
                  label="Detail video (optional)"
                  value={colDetailVideoUrl}
                  onChange={setColDetailVideoUrl}
                  uploadFolder="collections"
                  accept="video/*"
                  placeholder="https://… or upload"
                />
              </div>

              <div>
                <AssetUrlField
                  id="col-detail-video-poster"
                  label="Detail video poster (optional)"
                  value={colDetailVideoPosterUrl}
                  onChange={setColDetailVideoPosterUrl}
                  uploadFolder="collections"
                  accept="image/*"
                  placeholder="Still image shown until video plays"
                />
              </div>

              <AssetGalleryField
                label="More images (after video)"
                value={colDetailGalleryUrls}
                onChange={setColDetailGalleryUrls}
                uploadFolder={`collections/${sanitizeCollectionSlug(pendingColSlug || editingCollection?.slug || "draft")}/detail-gallery`}
                accept="image/*"
              />
              <p className="-mt-1 text-xs text-zinc-700">
                Optional second gallery shown after the video on the collection detail page.
              </p>
              {collectionFormError && (
                <p className="text-sm text-red-600">{collectionFormError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCollectionModalOpen(false)}
                  className="rounded-md border px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collectionSaving}
                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {collectionSaving ? "Saving…" : editingCollection ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={productPendingDelete !== null}
        title="Delete this product?"
        description={
          productPendingDelete ? (
            <>
              <span className="font-medium text-zinc-900">{productPendingDelete.name}</span> will be removed
              permanently. This cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete product"
        variant="danger"
        onCancel={() => setProductPendingDelete(null)}
        onConfirm={async () => {
          if (!productPendingDelete) return;
          try {
            await dataStore.deleteProduct(productPendingDelete.id);
            setProductPendingDelete(null);
            toast.success("Product deleted.");
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not delete product.";
            toast.error(msg);
            throw e;
          }
        }}
      />

      <ConfirmDialog
        open={collectionPendingDelete !== null}
        title="Delete this collection?"
        description={
          collectionPendingDelete ? (
            <>
              Remove <span className="font-medium text-zinc-900">“{collectionPendingDelete.name}”</span>? This only
              works if no products use slug{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs">{collectionPendingDelete.slug}</code>.
            </>
          ) : undefined
        }
        confirmLabel="Delete collection"
        variant="danger"
        onCancel={() => setCollectionPendingDelete(null)}
        onConfirm={async () => {
          if (!collectionPendingDelete) return;
          try {
            await dataStore.deleteCollection(collectionPendingDelete.id, collectionPendingDelete.slug);
            await loadCollectionsOnly();
            setCollectionPendingDelete(null);
            toast.success("Collection deleted.");
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not delete collection.";
            toast.error(msg);
            throw e;
          }
        }}
      />
    </div>
  );
}
