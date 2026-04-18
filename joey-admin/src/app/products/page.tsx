"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { dataStore } from "@/lib/dataStore";
import type { Product, ProductSize, Collection, WearTag } from "@/lib/types";
import { Edit2, Plus, X, Trash2, Layers, Package } from "lucide-react";
import AssetUrlField from "@/components/AssetUrlField";
import AssetGalleryField from "@/components/AssetGalleryField";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";

const DEFAULT_SIZES: ProductSize[] = [
  { name: "XS", available: true },
  { name: "S", available: true },
  { name: "M", available: true },
  { name: "L", available: true },
  { name: "XL", available: true },
  { name: "Custom", available: true },
];

const FALLBACK_COLLECTIONS: Collection[] = [
  {
    id: "fallback-1",
    slug: "always-lit",
    name: "Always Lit",
    briefDescription: "",
    description: "",
    galleryUrls: [],
    sortOrder: 1,
    createdAt: "",
  },
  {
    id: "fallback-2",
    slug: "limited-edition",
    name: "Limited Edition",
    briefDescription: "",
    description: "",
    galleryUrls: [],
    sortOrder: 2,
    createdAt: "",
  },
  {
    id: "fallback-3",
    slug: "sample-sale",
    name: "Sample Sale",
    briefDescription: "",
    description: "",
    galleryUrls: [],
    sortOrder: 3,
    createdAt: "",
  },
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sanitizeCollectionSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type TabId = "collections" | "products";

export default function ProductsPage() {
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

  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [collectionPendingDelete, setCollectionPendingDelete] = useState<Collection | null>(null);

  const [colMainImageUrl, setColMainImageUrl] = useState("");
  const [colHoverImageUrl, setColHoverImageUrl] = useState("");
  const [colGalleryUrls, setColGalleryUrls] = useState<string[]>([]);
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
    } else {
      setMainImageUrl("");
      setHoverImageUrl("");
      setExtraImageUrls(["", "", ""]);
    }
  }, [isModalOpen, editingProduct]);

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

  useEffect(() => {
    if (tab === "collections") loadCollectionsOnly();
  }, [tab, loadCollectionsOnly]);

  const collectionOptions = useMemo(() => {
    const base = collections.length > 0 ? collections : FALLBACK_COLLECTIONS;
    
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
    const slug = (formData.get("slug") as string)?.trim() || undefined;
    let categoryName = (formData.get("categoryName") as string)?.trim();
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
      .map((s) => s.trim())
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
    if (!categoryName && col) categoryName = col.name;

    const existingSizes = editingProduct?.sizes || DEFAULT_SIZES;
    const newSizes: ProductSize[] = existingSizes.map((s) => ({
      ...s,
      available: formData.get(`size-${s.name}`) === "on",
    }));

    try {
      if (editingProduct) {
        await dataStore.updateProduct(editingProduct.id, {
          slug,
          name,
          categoryName: categoryName || editingProduct.categoryName,
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
        });
      } else {
        await dataStore.addProduct({
          slug,
          name,
          categoryName: categoryName || col?.name || category,
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
    setPendingColSlug("");
    setCollectionModalOpen(true);
  };

  const openEditCollection = (c: Collection) => {
    setEditingCollection(c);
    setCollectionFormError("");
    setColMainImageUrl(c.image?.trim() || "");
    setColHoverImageUrl(c.hoverImage || "");
    setColGalleryUrls(c.galleryUrls ?? []);
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
    const sortOrder = Number((form.querySelector('[name="col-sort"]') as HTMLInputElement).value) || 0;

    try {
      const galleryUrls = colGalleryUrls.map((u) => String(u || "").trim()).filter(Boolean);
      if (editingCollection) {
        await dataStore.updateCollection(editingCollection.id, {
          name,
          briefDescription,
          description,
          sortOrder,
          image: colMainImageUrl,
          hoverImage: colHoverImageUrl,
          galleryUrls,
        });
      } else {
        const slug = (form.querySelector('[name="col-slug"]') as HTMLInputElement).value.trim().toLowerCase();
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
                    FALLBACK_COLLECTIONS.map((c) => (
                      <tr key={c.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">{c.name}</td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-zinc-700">{c.slug}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">{c.sortOrder}</td>
                        <td className="max-w-xs truncate px-6 py-4 text-sm text-zinc-700">{c.briefDescription || "—"}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-xs text-zinc-700">
                          Run SQL to edit
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-zinc-900">
                        No collections yet. Use <strong>Add collection</strong> or run the SQL seed file.
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
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">{product.categoryName}</td>
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
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-xl font-bold">{editingProduct ? "Edit product" : "Add product"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-600 hover:text-zinc-900">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 space-y-6 overflow-y-auto p-6">
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
                  <label className="block text-sm font-medium text-zinc-700">Category display name</label>
                  <input
                    type="text"
                    name="categoryName"
                    defaultValue={editingProduct?.categoryName}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
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
                    The Details <span className="font-normal text-zinc-700">(product page)</span>
                  </label>
                  <textarea
                    name="details"
                    rows={5}
                    defaultValue={editingProduct?.details?.length ? editingProduct.details.join("\n") : ""}
                    placeholder={"One bullet per line, e.g.\nHand-woven kente\nRelaxed fit\nDry clean only"}
                    className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                  />
                  <p className="mt-1 text-xs text-zinc-700">
                    Shown in the &quot;The Details&quot; list on the product page (above Shipping &amp; Returns). Leave
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
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {(editingProduct?.sizes || DEFAULT_SIZES).map((size) => (
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
                  <label className="block text-sm font-medium text-zinc-700">Slug</label>
                  <input
                    name="col-slug"
                    required
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
