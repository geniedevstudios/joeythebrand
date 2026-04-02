"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import { dataStore } from "@/lib/dataStore";
import type { PromotionCode } from "@/lib/types";
import styles from "../admin.module.css";

const EMPTY_ARRAY: any[] = [];

export default function AdminPromotions() {
  const [mounted, setMounted] = useState(false);
  const promotions = useSyncExternalStore(dataStore.subscribe, dataStore.getPromotions, () => EMPTY_ARRAY);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionCode | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleToggleActive = (promo: PromotionCode) => {
    dataStore.updatePromotion(promo.id, { active: !promo.active });
  };

  const handleDeletePromo = (id: string) => {
    if (confirm("Are you sure you want to delete this promotion code?")) {
      dataStore.deletePromotion(id);
    }
  };

  const openEditModal = (promo: PromotionCode) => {
    setEditingPromo(promo);
    setShowModal(true);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Promotions</h1>
        <button className={styles.addBtn} onClick={() => { setEditingPromo(null); setShowModal(true); }}>
          + Create Promo Code
        </button>
      </div>

      <div className={styles.searchBar} style={{ maxWidth: "400px" }}>
        <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
          Create discount codes that customers can apply at checkout.
        </p>
      </div>

      {promotions.length === 0 ? (
        <div className={styles.empty}>
          <p>No promotion codes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className={styles.productsGrid}>
          {promotions.map((promo) => (
            <div key={promo.id} className={styles.productCard}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a" }}>{promo.code}</div>
              <div className={styles.productInfo}>
                <h3>{promo.percentage}% Off</h3>
                <div className={styles.productMeta}>
                  <span className={`${styles.metaTag} ${promo.active ? styles.metaTagActive : ""}`}>
                    {promo.active ? "Active" : "Inactive"}
                  </span>
                  {promo.expiresAt && (
                    <span className={styles.metaTag}>Expires: {new Date(promo.expiresAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className={styles.actions}>
                <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => openEditModal(promo)}>
                  Edit
                </button>
                <button className={styles.actionBtn} onClick={() => handleToggleActive(promo)}>
                  {promo.active ? "Deactivate" : "Activate"}
                </button>
                <button className={styles.actionBtn} onClick={() => handleDeletePromo(promo.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PromoModal
          promo={editingPromo}
          onClose={() => { setShowModal(false); setEditingPromo(null); }}
        />
      )}
    </div>
  );
}

function PromoModal({ promo, onClose }: { promo: PromotionCode | null; onClose: () => void }) {
  const [code, setCode] = useState(promo?.code || "");
  const [percentage, setPercentage] = useState(promo?.percentage || 10);
  const [active, setActive] = useState(promo?.active ?? true);
  const [expiresAt, setExpiresAt] = useState(promo?.expiresAt || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const promoData = {
      code: code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      percentage,
      active,
      expiresAt: expiresAt || undefined,
    };

    if (promo) {
      dataStore.updatePromotion(promo.id, promoData);
    } else {
      dataStore.addPromotion(promoData);
    }
    onClose();
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{promo ? "Edit Promo Code" : "Create Promo Code"}</h2>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Promo Code</label>
            <input
              type="text"
              className={styles.formInput}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER20"
              required
              style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "2px" }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Discount Percentage (%)</label>
            <input
              type="number"
              className={styles.formInput}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              min={1}
              max={100}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Expiration Date (optional)</label>
            <input
              type="date"
              className={styles.formInput}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
              {promo ? "Save Changes" : "Create Code"}
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
