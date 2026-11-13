"use client";
import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import styles from "./CheckoutClient.module.css";
import { cartStore } from "@/store/cartStore";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import CustomSelect from "@/components/CustomSelect";
import { INTERNATIONAL_CHECKOUT_COUNTRY_OPTIONS, countryNameFromIso2 } from "@/lib/countrySelectOptions";
import type { CartItem } from "@/store/cartStore";
import { ArrowLeft, CreditCard, Smartphone } from "lucide-react";
import CheckoutSummary from "./CheckoutSummary";
import { formatShippingAddress } from "@/lib/formatShippingAddress";
import { formatOrderAmount } from "@/lib/formatOrderAmount";
import CheckoutConfirmation, { type ConfirmedCheckout } from "./CheckoutConfirmation";

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
  selectedShippingOption: "dhl" | "sales"
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
  
  return selectedShippingOption === "dhl"
    ? parts.join(", ")
    : `${parts.join(", ")} | Custom (international)`;
}

export default function CheckoutClient({ dhlEnabled = false }: { dhlEnabled?: boolean }) {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const appliedPromo = useSyncExternalStore(cartStore.subscribe, cartStore.getAppliedPromo, () => null);

  const [shippingDestination, setShippingDestination] = useState<ShippingDestination>("ghana");
  const [dhlQuote, setDhlQuote] = useState<{ request: object; price: number | null; error?: string } | null>(null);
  const [selectedDhlQuote, setSelectedDhlQuote] = useState<typeof dhlQuote>(null);
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
  const [confirmation, setConfirmation] = useState<ConfirmedCheckout | null>(null);
  const [partialStockConflict, setPartialStockConflict] = useState<{
    productId: string;
    skuKey: string;
    itemName: string;
    requestedQty: number;
    availableStock: number;
    mtoMaxQtyPerOrder: number;
    leadDays: number;
  } | null>(null);
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

  useEffect(() => {
    if (items.length === 0) return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch("/api/checkout/watch", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    })();
  }, [items.length]);

  const isGhana = shippingDestination === "ghana";
  const countryCode = isGhana ? "GH" : formData.country.trim().toUpperCase();
  const city = formData.city.trim();
  const addressLine1 = formData.address.trim();
  const postalCode = isGhana ? "" : formData.postalCode.trim();
  const region = isGhana ? regionLabel(formData.region) : formData.stateOrProvince.trim();
  const addressReady = !!(countryCode && city && addressLine1 && (!isGhana || formData.region));
  const quoteRequest = useMemo(() => {
    if (!dhlEnabled || !addressReady || items.length === 0) return null;
    return {
      destination: { countryCode, city, addressLine1, postalCode, region },
      items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    };
  }, [dhlEnabled, addressReady, countryCode, city, addressLine1, postalCode, region, items]);

  const currentQuote = dhlQuote?.request === quoteRequest ? dhlQuote : null;
  const calculatedDhlPrice = currentQuote?.price ?? null;
  const isCalculatingShipping = !!quoteRequest && !currentQuote;
  const selectedShippingOption =
    currentQuote && currentQuote.price !== null && selectedDhlQuote === currentQuote ? "dhl" : "sales";
  const shippingCost = selectedShippingOption === "dhl" ? calculatedDhlPrice ?? 0 : 0;
  const subtotalRaw = items.reduce((acc, current) => acc + (current.price * current.quantity), 0);
  const discount = appliedPromo?.discount || 0;
  const total = subtotalRaw - discount + shippingCost;
  const dhlLabel = isGhana ? "DHL Express Domestic" : "DHL Express Worldwide";
  const arrangedLabel = isGhana ? "Local courier" : "Custom shipping";

  useEffect(() => {
    if (!quoteRequest) return;

    const controller = new AbortController();
    const { signal } = controller;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/shipping/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quoteRequest),
          signal,
        });
        const data = await response.json();
        if (response.status === 422 && data.code === "ADDRESS_REJECTED") {
          if (!signal.aborted) setDhlQuote({ request: quoteRequest, price: null, error: data.error });
          return;
        }
        if (!response.ok || typeof data.price !== "number" || !Number.isFinite(data.price) || data.price <= 0) {
          throw new Error("DHL could not quote this address");
        }
        if (!signal.aborted) setDhlQuote({ request: quoteRequest, price: data.price });
      } catch {
        if (!signal.aborted) setDhlQuote({ request: quoteRequest, price: null });
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quoteRequest]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleDestinationChange = (dest: ShippingDestination) => {
    setShippingDestination(dest);
    setSelectedDhlQuote(null);
    setFormData((previous) => dest === "ghana"
      ? { ...previous, stateOrProvince: "", postalCode: "", country: "" }
      : { ...previous, region: "" }
    );
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
      const shippingAddress = buildShippingAddress(
        shippingDestination,
        formData,
        selectedShippingOption,
      );
      // 1. Server-Authoritative Order Creation + Atomic SKU Reservation
      const { order: placed, paystackReference, amountPesewas } =
        await dataStore.placeOrder({
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim(),
          shippingDestination,
          shippingOption: selectedShippingOption,
          shippingAddress,
          destinationDetails: selectedShippingOption === "dhl"
            ? { city, postalCode, countryCode, addressLine1, region }
            : undefined,
          promotionCode: appliedPromo?.code,
          notes: formData.notes.trim() || undefined,
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

              setConfirmation({
                order: placed,
                amountPaid: amountPesewas / 100,
                deliveryMethod: selectedShippingOption === "dhl" ? dhlLabel : arrangedLabel,
                deliveryAddress: formatShippingAddress(shippingAddress),
                deliveryFeePending: selectedShippingOption === "sales",
                needsReview: verifyData.stockConflictFlagged === true || verifyData.orderStatus === "paid_requires_resolution",
              });
              cartStore.clearCart();
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
  if (confirmation) return <CheckoutConfirmation confirmation={confirmation} />;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <section className={`${styles.shell} ${styles.emptyCart}`}>
          <h1 className={styles.pageTitle}>Checkout</h1>
          <p>Your bag is empty.</p>
          <Link href="/shop" className={styles.primaryButton}>Explore the shop</Link>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <Link href="/cart" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" /> Back to bag</Link>
          <h1 className={styles.pageTitle}>Checkout</h1>
        </header>

        <div className={styles.checkoutLayout}>
          <form id="checkout-form" onSubmit={handleSubmit} className={styles.form}>
            <section className={styles.formCard} aria-labelledby="contact-title">
              <h2 id="contact-title" className={styles.sectionTitle}>Contact details</h2>
              <div className={styles.formRow}>
                <div className="form-group">
                  <label className="form-label" htmlFor="firstName">First name</label>
                  <input id="firstName" name="firstName" autoComplete="given-name" className="form-input" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lastName">Last name</label>
                  <input id="lastName" name="lastName" autoComplete="family-name" className="form-input" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email address</label>
                  <input id="email" name="email" type="email" autoComplete="email" className="form-input" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone number</label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" className="form-input" placeholder={isGhana ? "+233 XX XXX XXXX" : "Include country code"} value={formData.phone} onChange={handleChange} required />
                </div>
              </div>
            </section>

            <section className={styles.formCard} aria-labelledby="delivery-title">
              <h2 id="delivery-title" className={styles.sectionTitle}>Delivery</h2>
              <fieldset className={styles.fieldset}>
                <legend>Destination</legend>
                <div className={styles.choiceRow}>
                  <label className={styles.choiceChip}>
                    <input type="radio" name="shippingDestination" value="ghana" checked={isGhana} onChange={() => handleDestinationChange("ghana")} />
                    <span className={styles.choiceTitle}>Within Ghana</span>
                  </label>
                  <label className={styles.choiceChip}>
                    <input type="radio" name="shippingDestination" value="international" checked={!isGhana} onChange={() => handleDestinationChange("international")} />
                    <span className={styles.choiceTitle}>Outside Ghana</span>
                  </label>
                </div>
              </fieldset>

              {!isGhana && (
                <div className="form-group">
                  <label className="form-label" id="country-label">Country</label>
                  <CustomSelect id="country" name="country" value={formData.country} onChange={handleChange}
                    options={INTERNATIONAL_CHECKOUT_COUNTRY_OPTIONS} placeholder="Select country" required listMaxHeight={320} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="address">Street address</label>
                <input id="address" name="address" autoComplete="shipping address-line1" className="form-input"
                  placeholder="House number and street" value={formData.address} onChange={handleChange} required />
              </div>
              <div className={`${styles.formRow} ${isGhana ? "" : styles.internationalAddressRow}`}>
                <div className="form-group">
                  <label className="form-label" htmlFor="city">City or town</label>
                  <input id="city" name="city" autoComplete="shipping address-level2" className="form-input"
                    value={formData.city} onChange={handleChange} required />
                </div>
                {isGhana ? (
                  <div className="form-group">
                    <label className="form-label" id="region-label">Region</label>
                    <CustomSelect id="region" name="region" value={formData.region} onChange={handleChange}
                      options={regionOptions} placeholder="Select region" required />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label" htmlFor="stateOrProvince">State or province</label>
                    <input id="stateOrProvince" name="stateOrProvince" autoComplete="shipping address-level1" className="form-input"
                      placeholder="N/A if it doesn’t apply" value={formData.stateOrProvince} onChange={handleChange} required />
                  </div>
                )}
                {!isGhana && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="postalCode">Postal code <span className={styles.optional}>(optional)</span></label>
                    <input id="postalCode" name="postalCode" autoComplete="shipping postal-code" className="form-input"
                      value={formData.postalCode} onChange={handleChange} />
                  </div>
                )}
              </div>

              {(!isGhana || dhlEnabled) && (
                <fieldset className={styles.fieldset}>
                  <legend>Delivery method</legend>
                  <div className={styles.choiceRow}>
                    {dhlEnabled && (
                      <label className={styles.choiceChip}>
                        <input type="radio" name="shippingOption" value="dhl" checked={selectedShippingOption === "dhl"}
                          disabled={calculatedDhlPrice == null} onChange={() => setSelectedDhlQuote(currentQuote)} />
                        <span className={styles.choiceTitle}>{dhlLabel}</span>
                        <span className={styles.choiceMeta} aria-live="polite">
                          {isCalculatingShipping
                            ? "Checking rate…"
                            : calculatedDhlPrice != null
                              ? formatOrderAmount(calculatedDhlPrice)
                              : addressReady ? currentQuote?.error ?? "Rate unavailable" : "Enter your address for a rate"}
                        </span>
                      </label>
                    )}
                    <label className={styles.choiceChip}>
                      <input type="radio" name="shippingOption" value="sales" checked={selectedShippingOption === "sales"} onChange={() => setSelectedDhlQuote(null)} />
                      <span className={styles.choiceTitle}>{arrangedLabel}</span>
                      <span className={styles.choiceMeta}>Fee confirmed after checkout</span>
                    </label>
                  </div>
                </fieldset>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="notes">Order note <span className={styles.optional}>(optional)</span></label>
                <textarea id="notes" name="notes" className="form-input" rows={2} placeholder="Landmark or delivery instructions"
                  value={formData.notes} onChange={handleChange} />
              </div>
            </section>

            <section className={styles.formCard} aria-labelledby="payment-title">
              <h2 id="payment-title" className={styles.sectionTitle}>Payment</h2>
              <fieldset className={styles.fieldset}>
                <legend className={styles.srOnly}>Payment method</legend>
                <div className={styles.choiceRow}>
                  <label className={styles.choiceChip}>
                    <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
                    <span className={styles.choiceTitle}><CreditCard size={17} aria-hidden="true" /> Card</span>
                    <span className={styles.choiceMeta}>Visa or Mastercard</span>
                  </label>
                  <label className={styles.choiceChip}>
                    <input type="radio" name="paymentMethod" value="mobile_money" checked={paymentMethod === "mobile_money"} onChange={() => setPaymentMethod("mobile_money")} />
                    <span className={styles.choiceTitle}><Smartphone size={17} aria-hidden="true" /> Mobile Money</span>
                    <span className={styles.choiceMeta}>MTN, Telecel or AirtelTigo</span>
                  </label>
                </div>
              </fieldset>
            </section>
          </form>

          <CheckoutSummary items={items} subtotal={subtotalRaw} discount={discount} promoCode={appliedPromo?.code}
            shippingCost={selectedShippingOption === "dhl" ? shippingCost : null} total={total} submitting={isSubmitting} />
        </div>
      </div>

      {partialStockConflict ? (
        <div className={styles.conflictBackdrop} role="dialog" aria-modal="true" aria-labelledby="partial-stock-modal-title">
          <div className={styles.conflictDialog}>
            <h3 id="partial-stock-modal-title" className={styles.sectionTitle}>Choose a fulfilment option</h3>
            <p>
              You requested <strong>{partialStockConflict.requestedQty}</strong> of{" "}
              <strong>{partialStockConflict.itemName}</strong>, but only{" "}
              <strong>{partialStockConflict.availableStock}</strong> unit(s) are currently in Ready to Wear stock. How would you like to proceed?
            </p>
            <div className={styles.conflictActions}>
              <button
                type="button"
                className={styles.primaryButton}
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
                  className={styles.secondaryButton}
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
                className={styles.cancelButton}
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
