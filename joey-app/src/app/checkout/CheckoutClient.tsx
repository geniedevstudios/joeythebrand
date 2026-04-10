"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import styles from "./CheckoutClient.module.css";
import { cartStore } from "@/store/cartStore";
import { dataStore } from "@/lib/dataStore";
import CustomSelect from "@/components/CustomSelect";
import type { Order } from "@/lib/types";

const EMPTY_ARRAY: any[] = [];

const regionOptions = [
  { value: "greater-accra", label: "Greater Accra" },
  { value: "ashanti", label: "Ashanti" },
  { value: "brong-ahafo", label: "Brong Ahafo" },
  { value: "central", label: "Central" },
  { value: "eastern", label: "Eastern" },
  { value: "northern", label: "Northern" },
  { value: "upper-east", label: "Upper East" },
  { value: "upper-west", label: "Upper West" },
  { value: "volta", label: "Volta" },
  { value: "western", label: "Western" },
];

export default function CheckoutClient() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const appliedPromo = useSyncExternalStore(cartStore.subscribe, cartStore.getAppliedPromo, () => null);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    region: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotalRaw = items.reduce((acc, current) => acc + (current.price * current.quantity), 0);
  const discount = appliedPromo?.discount || 0;
  const total = subtotalRaw - discount;
  const formattedSubtotal = `GHC ${subtotalRaw.toLocaleString()}`;
  const formattedTotal = `GHC ${total.toLocaleString()}`;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className="container">
            <span className="section-label">Checkout</span>
            <h1 className={styles.pageTitle}>Your Order</h1>
          </div>
        </div>
        <div className="container section">
          <div className={styles.emptyCart}>
            <p>Your cart is empty.</p>
            <Link href="/shop" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const order: Omit<Order, "id" | "createdAt" | "updatedAt"> = {
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        shippingAddress: `${formData.address}, ${formData.city}, ${formData.region}`,
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          size: item.size,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        total,
        discount,
        promotionCode: appliedPromo?.code,
        status: "pending",
      };

      dataStore.addOrder(order);
      
      cartStore.clearCart();
      
      toast.success("Order placed successfully!");
      
      window.location.href = "/account";
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-label">Checkout</span>
          <h1 className={styles.pageTitle}>Complete Your Order</h1>
        </div>
      </div>

      <div className={`container ${styles.checkoutLayout}`}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Contact Information</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="form-input"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="form-input"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-input"
                placeholder="+233 XX XXX XXXX"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <h2 className={styles.sectionTitle}>Shipping Address</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="address">Street Address</label>
              <input
                id="address"
                name="address"
                type="text"
                className="form-input"
                placeholder="House number, street name"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className="form-group">
                <label className="form-label" htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  className="form-input"
                  placeholder="Accra"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" id="region-label">Region</label>
                <CustomSelect
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  options={regionOptions}
                  placeholder="Select region"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="notes">Order Notes <span style={{fontWeight: 300, color: "var(--cinereous)"}}>(optional)</span></label>
              <textarea
                id="notes"
                name="notes"
                className="form-input"
                rows={3}
                placeholder="Any special instructions for your order"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className={`btn btn-primary btn-lg ${styles.submitBtn}`} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : `Place Order — ${formattedTotal}`}
            </button>
          </form>
        </div>

        <div className={styles.summarySection}>
          <h2 className={styles.sectionTitle}>Order Summary</h2>
          <div className={styles.itemsList}>
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className={styles.summaryItem}>
                <div className={styles.itemImgWrap}>
                  <img src={item.image} alt={item.name} className={styles.itemImg} />
                  <span className={styles.itemQty}>{item.quantity}</span>
                </div>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemSize}>{item.size}</span>
                </div>
                <span className={styles.itemPrice}>GHC {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{formattedSubtotal}</span>
            </div>
            {discount > 0 && (
              <div className={styles.totalRow} style={{ color: "#22aa22" }}>
                <span>Discount ({appliedPromo?.code})</span>
                <span>-GHC {discount.toLocaleString()}</span>
              </div>
            )}
            <div className={styles.totalRow}>
              <span>Shipping</span>
              <span>Calculated at next step</span>
            </div>
            <div className={`${styles.totalRow} ${styles.totalFinal}`}>
              <span>Total</span>
              <span>{formattedTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
