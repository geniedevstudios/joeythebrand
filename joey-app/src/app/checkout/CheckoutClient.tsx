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
    country: string;
  },
  selectedShippingOption: "dhl" | "sales" | null
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
  
  if (selectedShippingOption === "dhl") {
    return `${parts.join(", ")} | DHL[${d.city.trim()}|${d.postalCode.trim()}|${d.country}] (international)`;
  } else {
    return `${parts.join(", ")} | Custom (international)`;
  }
}

export default function CheckoutClient({ dhlEnabled = false }: { dhlEnabled?: boolean }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const appliedPromo = useSyncExternalStore(cartStore.subscribe, cartStore.getAppliedPromo, () => null);

  const [shippingDestination, setShippingDestination] = useState<ShippingDestination>("ghana");
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState<boolean>(false);
  const [calculatedDhlPrice, setCalculatedDhlPrice] = useState<number | null>(null);
  const [dhlQuoteError, setDhlQuoteError] = useState<string | null>(null);
  const [selectedShippingOption, setSelectedShippingOption] = useState<"dhl" | "sales" | null>(null);
  const [lastCalculatedLocation, setLastCalculatedLocation] = useState<string>("");
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
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [partialStockConflict, setPartialStockConflict] = useState<{
    productId: string;
    skuKey: string;
    itemName: string;
    requestedQty: number;
    availableStock: number;
    mtoMaxQtyPerOrder: number;
    leadDays: number;
  } | null>(null);
  const {
    empty: checkoutHeroEmpty,
    shellSpinner: checkoutHeroSpinner,
    style: checkoutHeroStyle,
    showImageLoader: checkoutHeroImageLoader,
    imageReady: checkoutHeroImageReady,
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
  const formattedShipping =
    shippingDestination === "ghana" || selectedShippingOption !== "dhl"
      ? "TBD"
      : calculatedDhlPrice != null
        ? `GHC ${shippingCost.toLocaleString()}`
        : isCalculatingShipping
          ? "Calculating…"
          : "TBD";
  const formattedTotal = `GHC ${total.toLocaleString()}`;



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDestinationChange = (dest: ShippingDestination) => {
    setShippingDestination(dest);
    setShippingCost(0);
    setCalculatedDhlPrice(null);
    setDhlQuoteError(null);
    setLastCalculatedLocation("");
    setSelectedShippingOption(dest === "international" ? "sales" : null);
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
      return;
    }
    const currentLocationStr = `${formData.country}|${formData.city}|${formData.address}|${formData.postalCode}`;
    if (lastCalculatedLocation === currentLocationStr) return;

    setIsCalculatingShipping(true);
    setDhlQuoteError(null);
    setCalculatedDhlPrice(null);
    if (selectedShippingOption === "dhl") {
      setSelectedShippingOption("sales");
      setShippingCost(0);
    }

    try {
      const valRes = await fetch(`/api/shipping/validate?city=${encodeURIComponent(formData.city)}&postalCode=${encodeURIComponent(formData.postalCode)}&countryCode=${encodeURIComponent(formData.country)}`);
      if (!valRes.ok) {
        const valData = await valRes.json();
        throw new Error(valData.details || valData.error || "DHL could not verify this address.");
      }

      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: {
            countryCode: formData.country.trim().toUpperCase(),
            city: formData.city,
            postalCode: formData.postalCode,
            addressLine1: formData.address,
          },
          items: items.map(i => ({ weightKg: i.weightKg || 0.5, quantity: i.quantity }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ? `${data.error}: ${data.details}` : "Failed to calculate shipping rates");
      }

      setCalculatedDhlPrice(data.price);
      setLastCalculatedLocation(currentLocationStr);
      toast.success("DHL rate ready. Choose DHL Express or Custom Shipping.");
    } catch (err: any) {
      const message = err.message || "Failed to calculate shipping.";
      setDhlQuoteError(message);
      setLastCalculatedLocation(currentLocationStr);
      setSelectedShippingOption("sales");
      setShippingCost(0);
      toast.error("DHL is unavailable. You can still check out with custom shipping.");
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  useEffect(() => {
    if (shippingDestination !== "international" || !dhlEnabled) return;
    if (formData.country.trim() && formData.city.trim() && formData.address.trim()) {
      const handler = setTimeout(() => {
        void handleCalculateShipping();
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [formData.country, formData.city, formData.address, formData.postalCode, shippingDestination, dhlEnabled]);

  const handleShippingOptionSelect = (option: "dhl" | "sales") => {
    setSelectedShippingOption(option);
    if (option === "dhl" && calculatedDhlPrice !== null) {
      setShippingCost(calculatedDhlPrice);
    } else {
      setShippingCost(0);
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
      if (!selectedShippingOption) {
        toast.error("Please choose a shipping method.");
        return;
      }
      if (selectedShippingOption === "dhl" && calculatedDhlPrice == null) {
        toast.error("DHL is not available for this address. Choose Custom Shipping.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const shippingAddress = buildShippingAddress(
        shippingDestination,
        formData,
        selectedShippingOption,
      );
      const notes =
        (formData.notes ? formData.notes + "\n\n" : "") +
          (shippingDestination === "international"
            ? `Selected Shipping: ${selectedShippingOption === "dhl" ? "DHL Express" : "Custom Sales Contact"}`
            : "") || undefined;

      // 1. Server-Authoritative Order Creation + Atomic SKU Reservation
      const { order: placed, paystackReference, amountPesewas } =
        await dataStore.placeOrder({
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim(),
          shippingDestination,
          shippingOption: selectedShippingOption,
          shippingAddress,
          destinationDetails:
            shippingDestination === "international"
              ? {
                  city: formData.city.trim(),
                  postalCode: formData.postalCode.trim(),
                  countryCode: formData.country.trim(),
                }
              : undefined,
          promotionCode: appliedPromo?.code,
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            comboId: item.comboId,
            size: item.size,
            fit: item.fit,
            quantity: item.quantity,
            fulfillmentChoice:
              item.fulfillmentChoice ||
              (item.isMadeToOrder || item.isBespoke ? "made_to_order" : undefined),
          })),
        });

      // 2. Trigger Paystack using Server-Authoritative Amount & Reference
      const handler = paystack.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: formData.email.trim(),
        amount: amountPesewas,
        currency: "GHS",
        channels: [paymentMethod],
        ref: paystackReference,
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
          // 3. Verify on backend (shared atomic reconciliation + durable outbox)
          (async () => {
            try {
              const verifyRes = await fetch("/api/paystack/verify-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reference: paystackRes.reference || paystackReference,
                  orderId: placed.id,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Verification failed");
              }

              cartStore.clearCart();
              setPlacedOrder(placed);
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Payment verification failed. Please contact support.",
              );
              setIsSubmitting(false);
            }
          })();
        },
        onClose: function () {
          // Requirement 1: Do NOT release active reservations merely because the Paystack modal closes.
          // Payment may still complete asynchronously via mobile money or bank webhook.
          setIsSubmitting(false);
          toast.info(
            "Payment window closed. Your item reservation remains active briefly if you are completing payment on your device.",
          );
        },
      });

      handler.openIframe();
    } catch (error: any) {
      if (
        error?.code === "PARTIAL_STOCK_CHOICE_REQUIRED" &&
        Array.isArray(error?.partialStockConflicts) &&
        error.partialStockConflicts.length > 0
      ) {
        setPartialStockConflict(error.partialStockConflicts[0]);
      } else {
        toast.error(
          error instanceof Error ? error.message : "Failed to initiate order. Please try again.",
        );
      }
      setIsSubmitting(false);
    }
  };
  if (placedOrder) {
    return (
      <div className={styles.page}>
        <div
          className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
          data-page-hero-empty="false"
          data-page-hero-loading="false"
          data-page-hero-ready="true"
          style={checkoutHeroStyle}
        >
          {checkoutHeroImageLoader ? <PageHeroShellImageLoader /> : null}
          <div className="container">
            <span className="section-label">Order Confirmed</span>
            <h1 className={styles.pageTitle}>Thank You!</h1>
          </div>
        </div>
        <div className="container section">
          <div className={styles.successScreen}>
            <div className={styles.successIconWrap}>
              <svg className={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className={styles.successTitle}>Your order is complete</h2>
            <p className={styles.successText}>
              Order number <strong>{formatOrderNumber(placedOrder)}</strong> has been successfully placed. We've sent a confirmation email with your order details.
            </p>
            <div className={styles.successActions}>
              <Link href="/account" className={`btn ${styles.submitBtnPrimary} ${styles.actionBtn}`}>View My Account</Link>
              <Link href="/shop" className={`btn ${styles.submitBtnSecondary} ${styles.actionBtn}`}>Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div
          className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
          data-page-hero-empty={checkoutHeroEmpty ? "true" : "false"}
          data-page-hero-loading={checkoutHeroSpinner ? "true" : "false"}
          data-page-hero-ready={checkoutHeroImageReady ? "true" : "false"}
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

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={checkoutHeroEmpty ? "true" : "false"}
        data-page-hero-loading={checkoutHeroSpinner ? "true" : "false"}
        data-page-hero-ready={checkoutHeroImageReady ? "true" : "false"}
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
          <form onSubmit={handleSubmit} className={styles.form}>
            <h2 className={styles.sectionTitle}>Delivery</h2>
            <fieldset className={styles.destinationFieldset}>
              <legend className={`form-label ${styles.destinationLegend}`}>
                Where should we send your order?
              </legend>
              <div className={styles.choiceRow}>
                <label
                  className={`${styles.choiceChip} ${shippingDestination === "ghana" ? styles.choiceChipActive : ""}`}
                >
                  <input
                    type="radio"
                    name="shippingDestination"
                    value="ghana"
                    checked={shippingDestination === "ghana"}
                    onChange={() => handleDestinationChange("ghana")}
                  />
                  <span className={styles.choiceChipTitle}>Within Ghana</span>
                  <span className={styles.choiceChipMeta}>City &amp; region</span>
                </label>
                <label
                  className={`${styles.choiceChip} ${shippingDestination === "international" ? styles.choiceChipActive : ""}`}
                >
                  <input
                    type="radio"
                    name="shippingDestination"
                    value="international"
                    checked={shippingDestination === "international"}
                    onChange={() => handleDestinationChange("international")}
                  />
                  <span className={styles.choiceChipTitle}>Outside Ghana</span>
                  <span className={styles.choiceChipMeta}>International</span>
                </label>
              </div>
            </fieldset>

            <h2 className={styles.sectionTitle}>Contact Information</h2>
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
                      Delivering within Ghana? Choose <strong>Within Ghana</strong> at the top.
                    </p>
                  </div>
                </div>
              </>
            )}

            {shippingDestination === "international" && (
              <div className={styles.shippingOptionsSection}>
                <h2 className={styles.sectionTitle}>Shipping Method</h2>
                <div className={styles.choiceRow}>
                  {dhlEnabled ? (
                    <label
                      className={`${styles.choiceChip} ${selectedShippingOption === "dhl" ? styles.choiceChipActive : ""} ${calculatedDhlPrice == null ? styles.choiceChipDisabled : ""}`}
                    >
                      <input
                        type="radio"
                        name="shippingOption"
                        value="dhl"
                        checked={selectedShippingOption === "dhl"}
                        disabled={calculatedDhlPrice == null}
                        onChange={() => handleShippingOptionSelect("dhl")}
                      />
                      <span className={styles.choiceChipTitle}>
                        <img src="/dhl-logo.svg" alt="" className={styles.dhlLogoImg} /> DHL
                      </span>
                      <span className={styles.choiceChipMeta}>
                        {isCalculatingShipping
                          ? "Getting rate…"
                          : calculatedDhlPrice != null
                            ? `GHC ${calculatedDhlPrice.toLocaleString()}`
                            : "Unavailable"}
                      </span>
                    </label>
                  ) : null}
                  <label
                    className={`${styles.choiceChip} ${selectedShippingOption === "sales" ? styles.choiceChipActive : ""}`}
                  >
                    <input
                      type="radio"
                      name="shippingOption"
                      value="sales"
                      checked={selectedShippingOption === "sales"}
                      onChange={() => handleShippingOptionSelect("sales")}
                    />
                    <span className={styles.choiceChipTitle}>Custom Shipping</span>
                    <span className={styles.choiceChipMeta}>Sales will arrange · TBD</span>
                  </label>
                </div>
                {isCalculatingShipping ? (
                  <p className={styles.choiceHint}>Getting a DHL rate for this address…</p>
                ) : dhlQuoteError || !dhlEnabled ? (
                  <p className={styles.choiceHint}>
                    {dhlEnabled
                      ? "DHL could not quote this address. Custom Shipping still works — we will contact you to arrange delivery."
                      : "DHL Express is not live yet. Choose Custom Shipping and we will arrange delivery with you."}
                  </p>
                ) : selectedShippingOption === "sales" ? (
                  <p className={styles.choiceHint}>Our salesperson will contact you to arrange delivery.</p>
                ) : null}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="notes">
                Order Notes <span style={{ fontWeight: 300, color: "var(--cinereous)" }}>(optional)</span>
              </label>
              <textarea id="notes" name="notes" className="form-input" rows={3}
                placeholder="Any special instructions for your order"
                value={formData.notes} onChange={handleChange} />
            </div>

            {(shippingDestination === "ghana" || selectedShippingOption !== null) && (
              <>
                <h2 className={styles.sectionTitle}>Payment Method</h2>
                <div className={styles.choiceRow}>
                  <label className={`${styles.choiceChip} ${paymentMethod === "card" ? styles.choiceChipActive : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                    />
                    <span className={styles.choiceChipTitle}>Card</span>
                    <span className={styles.choiceChipMeta}>Visa, Mastercard</span>
                  </label>
                  <label className={`${styles.choiceChip} ${paymentMethod === "mobile_money" ? styles.choiceChipActive : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile_money"
                      checked={paymentMethod === "mobile_money"}
                      onChange={() => setPaymentMethod("mobile_money")}
                    />
                    <span className={styles.choiceChipTitle}>Mobile Money</span>
                    <span className={styles.choiceChipMeta}>MTN, Telecel, AirtelTigo</span>
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
                  {(item.isMadeToOrder || item.isBespoke || item.fulfillmentChoice === "made_to_order") && (
                    <span style={{ fontSize: "11px", color: "#3f3f46", background: "#f4f4f5", border: "1px solid #e4e4e7", padding: "2px 7px", borderRadius: "4px", marginTop: "3px", display: "inline-block", fontWeight: 600 }}>
                      Made to Order · {item.leadDays || item.bespokeLeadDays || 14} days
                    </span>
                  )}
                </div>
                <span className={styles.itemPrice}>GHC {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {(() => {
            const hasMto = items.some(
              (i) => i.isMadeToOrder || i.isBespoke || i.fulfillmentChoice === "made_to_order",
            );
            const hasRtw = items.some(
              (i) => !(i.isMadeToOrder || i.isBespoke || i.fulfillmentChoice === "made_to_order"),
            );
            const maxLead = items.reduce(
              (m, i) =>
                i.isMadeToOrder || i.isBespoke || i.fulfillmentChoice === "made_to_order"
                  ? Math.max(m, i.leadDays || i.bespokeLeadDays || 14)
                  : m,
              0,
            );
            if (!hasMto) return null;
            return (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "#f4f4f5",
                  border: "1px solid #d4d4d8",
                  color: "#3f3f46",
                  fontSize: "12.5px",
                  lineHeight: 1.5,
                }}
              >
                {hasRtw ? (
                  <>
                    <strong>Combined Shipment:</strong> Your cart includes both Ready to Wear and Made to Order pieces. By default, your order will ship together once Made to Order production is complete ({maxLead || 14} days from verified payment).
                  </>
                ) : (
                  <>
                    <strong>Made to Order Production:</strong> Production lead time ({maxLead || 14} days) begins once payment is verified, prior to shipping.
                  </>
                )}
              </div>
            );
          })()}

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
            {shippingDestination === "ghana" || selectedShippingOption === "sales" ? (
              <div style={{ padding: "16px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span>{shippingDestination === "ghana" ? "Delivery" : "Shipping"}</span>
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

      {partialStockConflict ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="partial-stock-modal-title"
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              maxWidth: "480px",
              width: "100%",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <h3
              id="partial-stock-modal-title"
              style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "10px", color: "#111" }}
            >
              Choose Your Fulfilment Option
            </h3>
            <p style={{ fontSize: "0.92rem", color: "#444", lineHeight: 1.55, marginBottom: "20px" }}>
              You requested <strong>{partialStockConflict.requestedQty}</strong> of{" "}
              <strong>{partialStockConflict.itemName}</strong>, but only{" "}
              <strong>{partialStockConflict.availableStock}</strong> unit(s) are currently in Ready to Wear stock. How would you like to proceed?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const target = items.find((i) => i.productId === partialStockConflict.productId);
                  if (target) {
                    cartStore.setItemQuantityAndFulfillment(
                      target.id,
                      partialStockConflict.availableStock,
                      "ready_to_wear",
                      partialStockConflict.leadDays,
                      partialStockConflict.availableStock,
                    );
                  }
                  setPartialStockConflict(null);
                  toast.success(
                    `Updated to ${partialStockConflict.availableStock} Ready to Wear unit(s). Click Place Order to continue.`,
                  );
                }}
              >
                Buy Remaining {partialStockConflict.availableStock} Ready to Wear
              </button>
              {partialStockConflict.requestedQty <= partialStockConflict.mtoMaxQtyPerOrder ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    const target = items.find((i) => i.productId === partialStockConflict.productId);
                    if (target) {
                      cartStore.setItemQuantityAndFulfillment(
                        target.id,
                        partialStockConflict.requestedQty,
                        "made_to_order",
                        partialStockConflict.leadDays,
                        partialStockConflict.mtoMaxQtyPerOrder,
                      );
                    }
                    setPartialStockConflict(null);
                    toast.success(
                      `Switched all ${partialStockConflict.requestedQty} unit(s) to Made to Order (${partialStockConflict.leadDays} days). Click Place Order to continue.`,
                    );
                  }}
                >
                  Order All {partialStockConflict.requestedQty} as Made to Order ({partialStockConflict.leadDays} days)
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPartialStockConflict(null)}
                style={{
                  marginTop: "6px",
                  background: "none",
                  border: "none",
                  color: "#666",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
