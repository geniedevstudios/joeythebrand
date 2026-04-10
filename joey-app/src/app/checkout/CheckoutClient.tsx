"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import styles from "./CheckoutClient.module.css";
import { cartStore } from "@/store/cartStore";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import { usePageHeroBackgroundStyle } from "@/hooks/usePageHero";
import CustomSelect from "@/components/CustomSelect";
import { INTERNATIONAL_CHECKOUT_COUNTRY_OPTIONS, countryNameFromIso2 } from "@/lib/countrySelectOptions";
import type { Order } from "@/lib/types";
import { formatOrderNumber } from "@/lib/formatOrderNumber";

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

type ShippingDestination = "ghana" | "international";

function regionLabel(value: string): string {
  return regionOptions.find((o) => o.value === value)?.label ?? value;
}

function buildShippingAddress(
  destination: ShippingDestination,
  d: {
    address: string;
    city: string;
    region: string;
    stateOrProvince: string;
    postalCode: string;
    /** ISO 3166-1 alpha-2 when international */
    country: string;
  },
): string {
  if (destination === "ghana") {
    return `${d.address.trim()}, ${d.city.trim()}, ${regionLabel(d.region)}, Ghana`;
  }
  const countryLine = countryNameFromIso2(d.country) || d.country.trim();
  const parts = [
    d.address.trim(),
    d.city.trim(),
    d.stateOrProvince.trim(),
    d.postalCode.trim(),
    countryLine,
  ].filter(Boolean);
  return `${parts.join(", ")} (international)`;
}

export default function CheckoutClient() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const appliedPromo = useSyncExternalStore(cartStore.subscribe, cartStore.getAppliedPromo, () => null);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const [shippingDestination, setShippingDestination] = useState<ShippingDestination>("ghana");
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    region: "",
    stateOrProvince: "",
    postalCode: "",
    country: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutHeroStyle = usePageHeroBackgroundStyle("checkout");

  useEffect(() => {
    const scriptId = "paystack-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const subtotalRaw = items.reduce((acc, current) => acc + (current.price * current.quantity), 0);
  const discount = appliedPromo?.discount || 0;
  const total = subtotalRaw - discount;
  const formattedSubtotal = `GHC ${subtotalRaw.toLocaleString()}`;
  const formattedTotal = `GHC ${total.toLocaleString()}`;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader} style={checkoutHeroStyle}>
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

  const handleDestinationChange = (dest: ShippingDestination) => {
    setShippingDestination(dest);
    if (dest === "ghana") {
      setFormData((prev) => ({
        ...prev,
        stateOrProvince: "",
        postalCode: "",
        country: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, region: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (shippingDestination === "ghana" && !formData.region) {
      toast.error("Please select your region.");
      return;
    }
    // @ts-ignore
    if (!window.PaystackPop) {
      toast.error("Payment gateway is still loading. Please wait a moment.");
      return;
    }
    
    if (shippingDestination === "international") {
      if (!formData.country.trim()) {
        toast.error("Please select a country.");
        return;
      }
      if (formData.country.toUpperCase() === "GH") {
        toast.error('For delivery in Ghana, choose "Within Ghana" above and pick your region.');
        return;
      }
      if (!formData.stateOrProvince.trim()) {
        toast.error('Please enter your state or province (use "N/A" if it does not apply).');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const order: Omit<Order, "id" | "createdAt" | "updatedAt" | "orderNumber" | "paymentStatus" | "paymentRef"> = {
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        shippingAddress: buildShippingAddress(shippingDestination, formData),
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
        userId: session?.user?.id,
        notes: formData.notes || undefined,
      };

      // 1. Initial Order Creation (Unpaid)
      const placed = await dataStore.placeOrder(order);

      // 2. Trigger Paystack
      // @ts-ignore
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: formData.email,
        amount: Math.round(total * 100), // Ensure integer Kobo
        currency: "GHS",
        ref: "ORDER-" + Date.now() + "-" + placed.id.slice(0, 8),
        metadata: {
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: placed.id,
            },
          ],
        },
        callback: function (paystackRes: any) {
          // 3. Verify on backend
          // We wrap the async logic to keep the callback signature simple for Paystack's validator
          (async () => {
             try {
                const verifyRes = await fetch("/api/paystack/verify-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reference: paystackRes.reference,
                    orderId: placed.id,
                  }),
                });

                const verifyData = await verifyRes.json();
                if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

                cartStore.clearCart();
                toast.success(`Order ${formatOrderNumber(placed)} placed successfully.`);
                window.location.href = "/account";
             } catch (err) {
                toast.error(err instanceof Error ? err.message : "Payment verification failed. Please contact support.");
                setIsSubmitting(false);
             }
          })();
        },
        onClose: function () {
          setIsSubmitting(false);
          toast.info("Payment cancelled. You can try again from your account page if the order was saved.");
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Failed to initiate order. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader} style={checkoutHeroStyle}>
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
                id="email" name="email" type="email" className="form-input"
                placeholder="your@email.com" value={formData.email}
                onChange={handleChange} required
              />
            </div>

            <div className={styles.formRow}>
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">First Name</label>
                <input id="firstName" name="firstName" type="text" className="form-input"
                  placeholder="First name" value={formData.firstName}
                  onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Last Name</label>
                <input id="lastName" name="lastName" type="text" className="form-input"
                  placeholder="Last name" value={formData.lastName}
                  onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <input id="phone" name="phone" type="tel" className="form-input"
                placeholder={shippingDestination === "ghana" ? "+233 XX XXX XXXX" : "Include country code"}
                value={formData.phone}
                onChange={handleChange} required />
            </div>

            <h2 className={styles.sectionTitle}>Shipping Address</h2>

            <fieldset className={styles.destinationFieldset}>
              <legend className={`form-label ${styles.destinationLegend}`}>
                Where should we ship your order?
              </legend>
              <div className={styles.destinationOptions}>
                <label
                  className={`${styles.destinationOption} ${shippingDestination === "ghana" ? styles.destinationOptionActive : ""}`}
                >
                  <input
                    type="radio"
                    name="shippingDestination"
                    value="ghana"
                    checked={shippingDestination === "ghana"}
                    onChange={() => handleDestinationChange("ghana")}
                  />
                  <span>Within Ghana</span>
                </label>
                <label
                  className={`${styles.destinationOption} ${shippingDestination === "international" ? styles.destinationOptionActive : ""}`}
                >
                  <input
                    type="radio"
                    name="shippingDestination"
                    value="international"
                    checked={shippingDestination === "international"}
                    onChange={() => handleDestinationChange("international")}
                  />
                  <span>Outside Ghana</span>
                </label>
              </div>
            </fieldset>

            <div className="form-group">
              <label className="form-label" htmlFor="address">Street Address</label>
              <input id="address" name="address" type="text" className="form-input"
                placeholder="House number, street name" value={formData.address}
                onChange={handleChange} required />
            </div>

            {shippingDestination === "ghana" ? (
              <div className={styles.formRow}>
                <div className="form-group">
                  <label className="form-label" htmlFor="city">City</label>
                  <input id="city" name="city" type="text" className="form-input"
                    placeholder="Accra" value={formData.city}
                    onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label" id="region-label">Region</label>
                  <CustomSelect
                    id="region" name="region" value={formData.region}
                    onChange={handleChange} options={regionOptions}
                    placeholder="Select region"
                    required={shippingDestination === "ghana"}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className={styles.formRow}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="city">City</label>
                    <input id="city" name="city" type="text" className="form-input"
                      placeholder="City" value={formData.city}
                      onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="stateOrProvince">State / Province</label>
                    <input id="stateOrProvince" name="stateOrProvince" type="text" className="form-input"
                      placeholder="Region, state, or county" value={formData.stateOrProvince}
                      onChange={handleChange} required />
                  </div>
                </div>
                <p className={styles.fieldHint}>
                  Use &quot;N/A&quot; if your address does not include a state or province.
                </p>
                <div className={styles.formRow}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="postalCode">
                      Postal / ZIP code{" "}
                      <span style={{ fontWeight: 300, color: "var(--cinereous)" }}>(optional)</span>
                    </label>
                    <input id="postalCode" name="postalCode" type="text" className="form-input"
                      placeholder="Postal or ZIP code" value={formData.postalCode}
                      onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" id="country-label" htmlFor="country">Country</label>
                    <CustomSelect
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      options={INTERNATIONAL_CHECKOUT_COUNTRY_OPTIONS}
                      placeholder="Select country"
                      required
                      listMaxHeight={320}
                    />
                    <p className={styles.countryShippingHint}>
                      Delivering within Ghana? Choose <strong>Within Ghana</strong> above — you’ll use city and region instead.
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="notes">
                Order Notes <span style={{ fontWeight: 300, color: "var(--cinereous)" }}>(optional)</span>
              </label>
              <textarea id="notes" name="notes" className="form-input" rows={3}
                placeholder="Any special instructions for your order"
                value={formData.notes} onChange={handleChange} />
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-lg ${styles.submitBtn}`}
              disabled={isSubmitting}
            >
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
