"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { wishlistStore } from "@/store/wishlistStore";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { toast } from "sonner";
import styles from "./CheckoutClient.module.css";
import { cartStore } from "@/store/cartStore";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import CustomSelect from "@/components/CustomSelect";
import { INTERNATIONAL_CHECKOUT_COUNTRY_OPTIONS, countryNameFromIso2 } from "@/lib/countrySelectOptions";
import type { Order } from "@/lib/types";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import type { CartItem } from "@/store/cartStore";
import ProductMedia from "@/components/shop/ProductMedia";

const EMPTY_ARRAY: CartItem[] = [];

const regionOptions = [
  { value: "ahafo", label: "Ahafo" },
  { value: "ashanti", label: "Ashanti" },
  { value: "bono", label: "Bono" },
  { value: "bono-east", label: "Bono East" },
  { value: "central", label: "Central" },
  { value: "eastern", label: "Eastern" },
  { value: "greater-accra", label: "Greater Accra" },
  { value: "north-east", label: "North East" },
  { value: "northern", label: "Northern" },
  { value: "oti", label: "Oti" },
  { value: "savannah", label: "Savannah" },
  { value: "upper-east", label: "Upper East" },
  { value: "upper-west", label: "Upper West" },
  { value: "volta", label: "Volta" },
  { value: "western", label: "Western" },
  { value: "western-north", label: "Western North" },
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
  return `${parts.join(", ")} | DHL[${d.city.trim()}|${d.postalCode.trim()}|${d.country}] (international)`;
}

export default function CheckoutClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const appliedPromo = useSyncExternalStore(cartStore.subscribe, cartStore.getAppliedPromo, () => null);

  const [shippingDestination, setShippingDestination] = useState<ShippingDestination>("ghana");
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [shippingCalculated, setShippingCalculated] = useState<boolean>(true); // true for ghana by default
  const [isCalculatingShipping, setIsCalculatingShipping] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobile_money">("card");
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
  const {
    empty: checkoutHeroEmpty,
    shellSpinner: checkoutHeroSpinner,
    style: checkoutHeroStyle,
    showImageLoader: checkoutHeroImageLoader,
  } = usePageHeroShellRenderProps("checkout");

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
  const total = subtotalRaw - discount + shippingCost;
  const formattedSubtotal = `GHC ${subtotalRaw.toLocaleString()}`;
  const formattedShipping = shippingDestination === "ghana" ? "TBD" : (shippingCalculated ? `GHC ${shippingCost.toLocaleString()}` : "Requires calculation");
  const formattedTotal = `GHC ${total.toLocaleString()}`;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div
          className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
          data-page-hero-empty={checkoutHeroEmpty ? "true" : "false"}
          data-page-hero-loading={checkoutHeroSpinner ? "true" : "false"}
          style={checkoutHeroStyle}
        >
          {checkoutHeroImageLoader ? <PageHeroShellImageLoader /> : null}
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
    setShippingCost(0);
    setShippingCalculated(dest === "ghana");
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

  const handleCalculateShipping = async () => {
    if (!formData.country.trim() || !formData.city.trim() || !formData.address.trim()) {
      toast.error("Please provide your street address, city, and country first.");
      return;
    }
    setIsCalculatingShipping(true);
    try {
      // 1. Validate Address
      const valRes = await fetch(`/api/shipping/validate?city=${encodeURIComponent(formData.city)}&postalCode=${encodeURIComponent(formData.postalCode)}&countryCode=${encodeURIComponent(formData.country)}`);
      if (!valRes.ok) {
        const valData = await valRes.json();
        // The user wanted us to strictly block checkout if DHL doesn't recognize the address
        throw new Error(`Invalid Address: ${valData.details || valData.error || "Please check your city, postal code, and country."}`);
      }

      // 2. Fetch Rates
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: {
            countryCode: formData.country,
            city: formData.city,
            postalCode: formData.postalCode,
          },
          items: items.map(i => ({ weightKg: i.weightKg || 0.5, quantity: i.quantity }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ? `${data.error}: ${data.details}` : "Failed to calculate shipping rates");
      }
      setShippingCost(data.price);
      setShippingCalculated(true);
      toast.success("Shipping calculated via DHL Express!");
    } catch (err: any) {
      toast.error(err.message || "Failed to calculate shipping.");
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (shippingDestination === "ghana" && !formData.region) {
      toast.error("Please select your region.");
      return;
    }
    const paystack = (window as Window & { PaystackPop?: { setup: (opts: Record<string, unknown>) => { openIframe: () => void } } })
      .PaystackPop;
    if (!paystack) {
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
          color: item.color,
          colorHex: item.colorHex,
          combo: item.combo,
          size: item.size,
          fit: item.fit,
          wearTag: item.wearTag,
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
        // shippingCost, // save shipping cost locally if we had that field, but total is enough
      };

      // 1. Initial Order Creation (Unpaid)
      const placed = await dataStore.placeOrder(order);

      // 2. Trigger Paystack
      const handler = paystack.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: formData.email,
        amount: Math.round(total * 100), // Ensure integer Kobo
        currency: "GHS",
        channels: [paymentMethod],
        ref: `ORDER-${items[0]?.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-")}-${placed.id.slice(-8)}`,
        metadata: {
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: placed.id,
            },
          ],
        },
        callback: function (paystackRes: { reference?: string }) {
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
                router.push("/account");
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
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={checkoutHeroEmpty ? "true" : "false"}
        data-page-hero-loading={checkoutHeroSpinner ? "true" : "false"}
        style={checkoutHeroStyle}
      >
        {checkoutHeroImageLoader ? <PageHeroShellImageLoader /> : null}
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

            <h2 className={styles.sectionTitle}>
              {shippingDestination === "ghana" ? "Delivery Details" : "Shipping Address"}
            </h2>

            <fieldset className={styles.destinationFieldset}>
              <legend className={`form-label ${styles.destinationLegend}`}>
                Where should we {shippingDestination === "ghana" ? "deliver" : "ship"} your order?
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

            {shippingDestination === "international" && !shippingCalculated ? (
              <button
                type="button"
                className={`${styles.submitBtn} ${styles.submitBtnSecondary}`}
                onClick={handleCalculateShipping}
                disabled={isCalculatingShipping}
              >
                {isCalculatingShipping ? "Calculating..." : "Calculate Shipping"}
              </button>
            ) : (
              <>
                <h2 className={styles.sectionTitle} style={{ marginTop: "32px", borderTop: "1px solid var(--color-border)", paddingTop: "32px" }}>Payment Method</h2>
                <div className={styles.paymentMethods}>
                  <label className={`${styles.paymentOption} ${paymentMethod === "card" ? styles.paymentOptionActive : ""}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="card" 
                      checked={paymentMethod === "card"} 
                      onChange={() => setPaymentMethod("card")} 
                    />
                    <div className={styles.paymentOptionContent}>
                      <span className={styles.paymentOptionTitle}>Debit / Credit Card</span>
                      <span className={styles.paymentOptionDesc}>Visa, Mastercard, Verve</span>
                    </div>
                  </label>
                  <label className={`${styles.paymentOption} ${paymentMethod === "mobile_money" ? styles.paymentOptionActive : ""}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="mobile_money" 
                      checked={paymentMethod === "mobile_money"} 
                      onChange={() => setPaymentMethod("mobile_money")} 
                    />
                    <div className={styles.paymentOptionContent}>
                      <span className={styles.paymentOptionTitle}>Mobile Money</span>
                      <span className={styles.paymentOptionDesc}>MTN, Telecel, AirtelTigo</span>
                    </div>
                  </label>
                </div>
                
                <button
                  type="submit"
                  className={`${styles.submitBtn} ${styles.submitBtnPrimary}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : `Place Order — ${formattedTotal}`}
                </button>
              </>
            )}
          </form>
        </div>

        <div className={styles.summarySection}>
          <h2 className={styles.sectionTitle}>Order Summary</h2>
          <div className={styles.itemsList}>
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className={styles.summaryItem}>
                <div className={styles.itemImgWrap}>
                  <ProductMedia src={item.image} alt={item.name} className={styles.itemImg} />
                  <span className={styles.itemQty}>{item.quantity}</span>
                </div>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.name}</span>
                  {(item.color || item.colorHex) && (
                    <div className={styles.itemVariant} style={{ fontSize: "12px", color: "var(--cinereous)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px", textTransform: "capitalize" }}>
                      Color: {item.colorHex ? <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: item.colorHex || "#ccc", backgroundImage: item.image ? `url(${item.image})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid #ccc", display: "inline-block" }} title={item.color} /> : item.color}
                    </div>
                  )}
                  {item.combo && <span className={styles.itemVariant} style={{ fontSize: "12px", color: "var(--cinereous)", display: "block", marginTop: "2px", textTransform: "capitalize" }}>Combo: {item.combo}</span>}
                  <span className={styles.itemSize}>
                    {formatSizeLabel(item.size, item.fit, item.wearTag)}{item.fit ? ` — ${item.fit} Fit` : ""}
                  </span>
                  {item.isBespoke && (
                    <span style={{ fontSize: "11px", color: "#7c3aed", background: "#f5f3ff", padding: "2px 7px", borderRadius: "4px", marginTop: "3px", display: "inline-block", fontWeight: 600 }}>
                      Bespoke Order · ~{item.bespokeLeadDays || 14} days
                    </span>
                  )}
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
            {shippingDestination === "ghana" ? (
              <div style={{ padding: "16px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span>Delivery</span>
                  <span>{formattedShipping}</span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--cinereous)", background: "var(--color-bg-secondary)", padding: "12px", borderRadius: "6px", display: "flex", gap: "8px", alignItems: "flex-start", lineHeight: 1.4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <span>Our salesperson will liaise with you on the delivery process.</span>
                </div>
              </div>
            ) : (
              <div className={styles.totalRow}>
                <span>Shipping</span>
                <span>{formattedShipping}</span>
              </div>
            )}
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
