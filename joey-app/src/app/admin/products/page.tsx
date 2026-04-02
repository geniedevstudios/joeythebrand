"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import { dataStore } from "@/lib/dataStore";
import type { Product, ProductSize, Category } from "@/lib/types";
import styles from "../admin.module.css";

const EMPTY_ARRAY: any[] = [];

const categoryOptions: { value: Category; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "always-lit", label: "Always Lit" },
  { value: "limited-edition", label: "Limited Edition" },
  { value: "sample-sale", label: "Sample Sale" },
];

const allSizes = ["XS", "S", "M", "L", "XL", "Custom"];

export default function AdminProducts() {
  const [mounted, setMounted] = useState(false);
  const products = useSyncExternalStore(dataStore.subscribe, dataStore.getProducts, () => EMPTY_ARRAY);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Category>("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || p.category === filter;
    return matchesSearch && matchesFilter;
  });

  const handleToggleFlag = (product: Product, flag: "isOutOfStock" | "isLimited" | "isBestSeller" | "featured") => {
    dataStore.updateProduct(product.id, { [flag]: !product[flag] });
  };

  const handleSaveProduct = (updatedProduct: Product) => {
    dataStore.updateProduct(updatedProduct.id, updatedProduct);
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      dataStore.deleteProduct(id);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setShowModal(true);
  };

  const formatPrice = (price: number) => `GHC ${price.toLocaleString()}`;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Products</h1>
        <button className={styles.addBtn} onClick={() => { setEditingProduct(null); setShowModal(true); }}>
          + Add Product
        </button>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search products..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.formSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value as Category)}
          style={{ width: "200px" }}
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>No products found.</p>
        </div>
      ) : (
        <div className={styles.productsGrid}>
          {filtered.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <img src={product.image} alt={product.name} className={styles.productImage} />
              <div className={styles.productInfo}>
                <h3>{product.name}</h3>
                <div className={styles.productMeta}>
                  <span className={styles.metaTag}>{product.categoryName}</span>
                  {product.isBestSeller && <span className={`${styles.metaTag} ${styles.metaTagActive}`}>Best Seller</span>}
                  {product.isLimited && <span className={`${styles.metaTag} ${styles.metaTagActive}`}>Limited</span>}
                  {product.featured && <span className={`${styles.metaTag} ${styles.metaTagActive}`}>Featured</span>}
                  {product.isOutOfStock && <span className={`${styles.metaTag} ${styles.outOfStock}`}>Out of Stock</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className={styles.price}>{formatPrice(product.price)}</div>
                <div className={styles.actions} style={{ marginTop: "8px" }}>
                  <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => openEditModal(product)}>
                    Edit
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleDeleteProduct(product.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onSave, onClose }: { product: Product | null; onSave: (p: Product) => void; onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    category: "always-lit",
    categoryName: "Always Lit",
    price: 0,
    originalPrice: undefined,
    image: "/lookbook.png",
    images: ["/lookbook.png"],
    description: "",
    details: [],
    sizes: allSizes.map((s) => ({ name: s, available: true })),
    isOutOfStock: false,
    isLimited: false,
    isBestSeller: false,
    featured: false,
  });

  const [sizes, setSizes] = useState<ProductSize[]>(allSizes.map((s) => ({ name: s, available: true })));

  useEffect(() => {
    if (product) {
      setFormData({ ...product });
      setSizes(product.sizes);
    }
  }, [product]);

  const handleChange = (field: keyof Product, value: any) => {
    if (field === "category") {
      const cat = value as Category;
      const label = categoryOptions.find((c) => c.value === cat)?.label || cat;
      setFormData({ ...formData, category: cat, categoryName: label });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSizeToggle = (idx: number) => {
    const newSizes = [...sizes];
    newSizes[idx] = { ...newSizes[idx], available: !newSizes[idx].available };
    setSizes(newSizes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    
    const finalProduct: Product = {
      id: product?.id || `product-${Date.now()}`,
      name: formData.name || "",
      category: formData.category || "always-lit",
      categoryName: formData.categoryName || "Always Lit",
      price: formData.price || 0,
      originalPrice: formData.originalPrice,
      image: formData.image || "/lookbook.png",
      images: formData.images || ["/lookbook.png"],
      description: formData.description || "",
      details: formData.details || [],
      sizes,
      isOutOfStock: formData.isOutOfStock || false,
      isLimited: formData.isLimited || false,
      isBestSeller: formData.isBestSeller || false,
      featured: formData.featured || false,
    };
    
    if (product) {
      onSave(finalProduct);
    } else {
      dataStore.addProduct(finalProduct);
      onClose();
    }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{product ? "Edit Product" : "Add Product"}</h2>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Product Name</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Category</label>
              <select
                className={styles.formSelect}
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
              >
                {categoryOptions.filter((c) => c.value !== "all").map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Price (GHC)</label>
              <input
                type="number"
                className={styles.formInput}
                value={formData.price}
                onChange={(e) => handleChange("price", Number(e.target.value))}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Original Price (if on sale)</label>
              <input
                type="number"
                className={styles.formInput}
                value={formData.originalPrice || ""}
                onChange={(e) => handleChange("originalPrice", e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Main Image URL</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.image}
                onChange={(e) => handleChange("image", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Description</label>
            <textarea
              className={styles.formTextarea}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Status Flags</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isOutOfStock}
                  onChange={(e) => handleChange("isOutOfStock", e.target.checked)}
                />
                Out of Stock
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isLimited}
                  onChange={(e) => handleChange("isLimited", e.target.checked)}
                />
                Limited Edition
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isBestSeller}
                  onChange={(e) => handleChange("isBestSeller", e.target.checked)}
                />
                Best Seller
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => handleChange("featured", e.target.checked)}
                />
                Featured
              </label>
            </div>
          </div>

          <div className={styles.sizesSection}>
            <h4 className={styles.sizesTitle}>Available Sizes</h4>
            {sizes.map((size, idx) => (
              <div key={idx} className={styles.sizeRow}>
                <span className={styles.sizeName}>{size.name}</span>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={size.available}
                    onChange={() => handleSizeToggle(idx)}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
                <span style={{ fontSize: "12px", color: size.available ? "#22aa22" : "#cc0000" }}>
                  {size.available ? "Available" : "Unavailable"}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
              {product ? "Save Changes" : "Add Product"}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
