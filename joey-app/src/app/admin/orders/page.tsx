"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import { dataStore } from "@/lib/dataStore";
import type { Order, OrderStatus } from "@/lib/types";
import styles from "../admin.module.css";

const EMPTY_ARRAY: any[] = [];

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColors: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

export default function AdminOrders() {
  const [mounted, setMounted] = useState(false);
  const orders = useSyncExternalStore(dataStore.subscribe, dataStore.getOrders, () => EMPTY_ARRAY);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const filtered = orders.filter((o) => {
    const matchesSearch = 
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || o.status === filter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    dataStore.updateOrderStatus(orderId, status);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Orders</h1>
        <span style={{ color: "#666" }}>{orders.length} total orders</span>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search by order ID, name, or email..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.formSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value as OrderStatus | "all")}
          style={{ width: "180px" }}
        >
          <option value="all">All Status</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>No orders found.</p>
        </div>
      ) : (
        <div className={styles.productsGrid}>
          {filtered.map((order) => (
            <div key={order.id} className={styles.productCard}>
              <div>
                <div style={{ fontSize: "13px", color: "#888" }}>{order.id}</div>
                <div style={{ fontWeight: "600", marginTop: "4px" }}>{order.customerName}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>{order.customerEmail}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>{order.customerPhone}</div>
              </div>
              <div className={styles.productInfo}>
                <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                  {order.items.length} item(s) • GHC {order.total.toLocaleString()}
                </div>
                <div className={styles.productMeta}>
                  <span 
                    className={styles.metaTag} 
                    style={{ background: statusColors[order.status], color: "#fff" }}
                  >
                    {order.status.toUpperCase()}
                  </span>
                  <span className={styles.metaTag}>{formatDate(order.createdAt)}</span>
                  {order.promotionCode && (
                    <span className={styles.metaTag}>{order.promotionCode}</span>
                  )}
                </div>
              </div>
              <div className={styles.actions}>
                <button 
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} 
                  onClick={() => setSelectedOrder(order)}
                >
                  View
                </button>
                <select
                  className={styles.formSelect}
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                  style={{ width: "130px" }}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

function OrderDetailModal({ 
  order, 
  onClose, 
  onStatusChange 
}: { 
  order: Order; 
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Order Details</h2>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: "#888" }}>Order ID</div>
          <div style={{ fontFamily: "monospace" }}>{order.id}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>Customer</div>
            <div style={{ fontWeight: "600" }}>{order.customerName}</div>
            <div>{order.customerEmail}</div>
            <div>{order.customerPhone}</div>
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>Shipping Address</div>
            <div>{order.shippingAddress}</div>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>Items</div>
          {order.items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", background: "#f9f9f9", borderRadius: "8px", marginBottom: "8px" }}>
              <img src={item.image} alt={item.name} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "500" }}>{item.name}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Size: {item.size} • Qty: {item.quantity}</div>
              </div>
              <div style={{ fontWeight: "600" }}>GHC {item.price.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: "16px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Subtotal</span>
            <span>GHC {(order.total + order.discount).toLocaleString()}</span>
          </div>
          {order.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#22aa22" }}>
              <span>Discount ({order.promotionCode})</span>
              <span>-GHC {order.discount.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", fontSize: "18px" }}>
            <span>Total</span>
            <span>GHC {order.total.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>Update Status</div>
          <select
            className={styles.formSelect}
            value={order.status}
            onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
            style={{ width: "200px" }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.formActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
