"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { dataStore } from "@/lib/dataStore";
import type { Product, Collection } from "@/lib/types";
import { Edit2, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import ProductWizard from "./ProductWizard";
import CollectionEditor from "./CollectionEditor";
import { adminPillClass, adminPillTrackClass } from "@/lib/adminChrome";

type TabId = "rtw" | "mto" | "collections";

function isMadeToOrder(product: Product) {
  return product.fulfillmentMode === "made_to_order_only";
}

function colourwaysOf(product: Product) {
  const colors = (product.variants || []).filter(
    (v) => (v.type === "color" || !v.type) && v.id !== "fit-combo",
  );
  if (colors.length) return colors;
  return product.image ? [{ id: "main-color", type: "color" as const, name: "", colorHex: "", thumbnailUrl: product.image }] : [];
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("rtw");
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoadError, setCollectionsLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null,
  );

  const [productPendingDelete, setProductPendingDelete] =
    useState<Product | null>(null);
  const [collectionPendingDelete, setCollectionPendingDelete] =
    useState<Collection | null>(null);

  const rtwProducts = products.filter((p) => !isMadeToOrder(p));
  const mtoProducts = products.filter(isMadeToOrder);
  const visibleProducts = tab === "mto" ? mtoProducts : rtwProducts;

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
        e instanceof Error
          ? e.message
          : "Could not load collections. Run supabase_collections.sql in the SQL editor.",
      );
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = dataStore.subscribe(load);
    return unsubscribe;
  }, [load]);

  const editParam = searchParams.get("edit");
  const autoOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editParam || products.length === 0) return;
    if (autoOpenedRef.current === editParam) return;
    const match = products.find((p) => p.id === editParam);
    if (match) {
      autoOpenedRef.current = editParam;
      setTab(isMadeToOrder(match) ? "mto" : "rtw");
      setEditingProduct(match);
      setIsModalOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [editParam, products, router]);

  useEffect(() => {
    if (tab === "collections") loadCollectionsOnly();
  }, [tab, loadCollectionsOnly]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleRequestDeleteProduct = (product: Product) => {
    setProductPendingDelete(product);
  };

  const openAddCollection = () => {
    setEditingCollection(null);
    setCollectionModalOpen(true);
  };

  const openEditCollection = (c: Collection) => {
    setEditingCollection(c);
    setCollectionModalOpen(true);
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
      <div className="flex justify-center">
        <nav aria-label="Products" className={adminPillTrackClass}>
          <button
            type="button"
            onClick={() => setTab("rtw")}
            aria-current={tab === "rtw" ? "page" : undefined}
            className={adminPillClass(tab === "rtw", "sm")}
          >
            Ready to wear <span className="ml-1 opacity-70">{rtwProducts.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("mto")}
            aria-current={tab === "mto" ? "page" : undefined}
            className={adminPillClass(tab === "mto", "sm")}
          >
            Made to order <span className="ml-1 opacity-70">{mtoProducts.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("collections")}
            aria-current={tab === "collections" ? "page" : undefined}
            className={adminPillClass(tab === "collections", "sm")}
          >
            Collections <span className="ml-1 opacity-70">{collections.length}</span>
          </button>
        </nav>
      </div>

      {tab !== "collections" ? (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1c1e22]/45">
              The wardrobe
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1c1e22]">
              {tab === "mto" ? "Made to order." : "Ready to wear."}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center rounded-full bg-[#1c1e22] px-4 py-2 text-sm font-medium text-[#f5f1eb] shadow-sm hover:bg-[#2a2c30]"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden />
            Add {tab === "mto" ? "design" : "product"}
          </button>
        </div>
      ) : null}

      {tab === "collections" && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1c1e22]/45">
              The wardrobe
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1c1e22]">
              Collections.
            </h1>
          </div>
          {collectionsLoadError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {collectionsLoadError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#1c1e22]/55">
              Collections define shop category slugs. Each product must use one
              slug; display names can differ per product if needed.
            </p>
            <button
              type="button"
              onClick={openAddCollection}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1c1e22] px-4 py-2 text-sm font-medium text-[#f5f1eb] shadow-sm hover:bg-[#2a2c30]"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden />
              Add collection
            </button>
          </div>

          {collections.length === 0 ? (
            <div className="rounded-xl border border-[#b6b7ba]/70 bg-white px-4 py-10 text-center text-sm text-[#1c1e22]/55">
              No collections yet. Create your first collection above.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {[...collections]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((c) => {
                  const pieceCount = products.filter((p) => p.category === c.slug).length;
                  return (
                    <section
                      key={c.id}
                      className="flex gap-4 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        {c.image?.trim() ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.image.trim()}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-wide text-zinc-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          {c.slug}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-zinc-900">{c.name}</h2>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                          {c.briefDescription || "No brief yet."}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <span>{pieceCount} pieces</span>
                          <span>Sort {c.sortOrder}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditCollection(c)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit collection
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteCollection(c)}
                            className="text-xs font-medium text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </section>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {tab !== "collections" && (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Piece
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      {tab === "mto" ? "Lead time" : "Colour"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {visibleProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        {tab === "mto"
                          ? "No made-to-order designs yet."
                          : "No ready-to-wear pieces yet."}
                      </td>
                    </tr>
                  ) : null}
                  {visibleProducts.map((product) => (
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
                            <div className="font-medium text-zinc-900">
                              {product.name}
                            </div>
                            <div className="text-xs text-zinc-600">
                              {product.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                        {product.category === "none"
                          ? "—"
                          : collections.find((c) => c.slug === product.category)
                              ?.name || product.categoryName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-zinc-900">
                        GHC {product.price.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                        {tab === "mto" ? (
                          `${product.madeToOrderLeadDays ?? product.bespokeLeadDays ?? 14} days`
                        ) : (
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {colourwaysOf(product)
                              .filter((way) => way.name?.trim())
                              .map((way) => (
                                <span key={way.id} className="inline-flex items-center gap-1.5">
                                  {way.colorHex ? (
                                    <i
                                      className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-300"
                                      style={{ background: way.colorHex }}
                                    />
                                  ) : null}
                                  {way.name}
                                </span>
                              ))}
                            {!colourwaysOf(product).some((way) => way.name?.trim()) && (
                              <span className="text-zinc-400">No colour</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            product.isPublished === false
                              ? "bg-zinc-200 text-zinc-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {product.isPublished === false ? "Draft" : "Active"}
                        </span>
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
                        {product.featured && (
                          <span className="ml-2 inline-flex rounded-full bg-zinc-200 px-2 text-xs font-semibold leading-5 text-zinc-800">
                            Featured
                          </span>
                        )}
                        {tab === "rtw" &&
                          (product.fulfillmentMode === "stock_then_made_to_order" ||
                            product.bespokeAvailable) && (
                            <span className="ml-2 inline-flex rounded-full bg-zinc-200 px-2 text-xs font-semibold leading-5 text-zinc-800">
                              MTO fallback
                            </span>
                          )}
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

      <ProductWizard
        key={editingProduct?.id ?? "new"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingProduct={editingProduct}
        collections={collections}
        listKind={tab === "mto" ? "mto" : "rtw"}
        onSuccess={() => {
          setIsModalOpen(false);
          load();
        }}
      />

      <CollectionEditor
        open={collectionModalOpen}
        collection={editingCollection}
        products={products}
        collections={collections}
        onClose={() => setCollectionModalOpen(false)}
        onSaved={async () => {
          await load();
        }}
      />

      <ConfirmDialog
        open={productPendingDelete !== null}
        title="Delete this product?"
        description={
          productPendingDelete ? (
            <>
              <span className="font-medium text-zinc-900">
                {productPendingDelete.name}
              </span>{" "}
              will be removed permanently. This cannot be undone.
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
            const msg =
              e instanceof Error ? e.message : "Could not delete product.";
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
              Remove{" "}
              <span className="font-medium text-zinc-900">
                “{collectionPendingDelete.name}”
              </span>
              ? This only works if no products use slug{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                {collectionPendingDelete.slug}
              </code>
              .
            </>
          ) : undefined
        }
        confirmLabel="Delete collection"
        variant="danger"
        onCancel={() => setCollectionPendingDelete(null)}
        onConfirm={async () => {
          if (!collectionPendingDelete) return;
          try {
            await dataStore.deleteCollection(
              collectionPendingDelete.id,
              collectionPendingDelete.slug,
            );
            await loadCollectionsOnly();
            setCollectionPendingDelete(null);
            toast.success("Collection deleted.");
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : "Could not delete collection.";
            toast.error(msg);
            throw e;
          }
        }}
      />
    </div>
  );
}
