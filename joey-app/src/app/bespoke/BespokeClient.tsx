"use client";
import { useState, useEffect, useSyncExternalStore, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import styles from "./BespokeClient.module.css";
import shopStyles from "../shop/ShopClient.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderPropsWithSSRSeed } from "@/hooks/usePageHero";
import type { Product, SiteContent } from "@/lib/types";
import CustomSelect from "@/components/CustomSelect";
import CustomDatePicker from "@/components/CustomDatePicker";
import ProductMedia from "@/components/shop/ProductMedia";
import SizeGuideModal from "@/components/SizeGuideModal";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { getStorefrontSizes } from "@/lib/wearSizes";
import {
  getVariantStockStatus,
  getIsSoloUnavailable,
  isCuratedBespokeMtoProduct,
} from "@/lib/variantUtils";
import { authStore } from "@/store/authStore";
import { cartStore } from "@/store/cartStore";
import { wishlistStore, type WishlistItem } from "@/store/wishlistStore";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_WISHLIST: WishlistItem[] = [];

const services = ["Bespoke Tailoring", "Styling Consultation", "Wardrobe Curation", "Event Styling"];
const serviceOptions = services.map((s) => ({ value: s, label: s }));

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toTimeLabel(h24: number, m: number): string {
  const hour12 = ((h24 + 11) % 12) + 1;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const mm = m === 0 ? "00" : String(m);
  return `${hour12}:${mm} ${ampm}`;
}

const timeOptions = (() => {
  const out: { value: string; label: string }[] = [];
  for (let h = 8; h <= 15; h++) {
    for (const m of [0, 30] as const) {
      if (h === 15 && m === 30) continue; // end at 3:00pm
      const value = `${pad2(h)}:${pad2(m)}`;
      out.push({ value, label: toTimeLabel(h, m) });
    }
  }
  return out;
})();

export default function BespokeClient({
  initialSiteContent,
  initialMtoProducts = EMPTY_PRODUCTS,
}: {
  initialSiteContent: SiteContent;
  initialMtoProducts?: Product[];
}) {
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const storeProducts = useSyncExternalStore(
    dataStore.subscribe,
    dataStore.getAllProductsIncludingBespoke,
    () => initialMtoProducts,
  );
  const wishlistItems = useSyncExternalStore(
    wishlistStore.subscribe,
    wishlistStore.getItems,
    () => EMPTY_WISHLIST,
  );
  const storeSiteContent = useSyncExternalStore(
    dataStore.subscribe,
    dataStore.getSiteContent,
    () => initialSiteContent,
  );
  const mtoVideoUrl =
    storeSiteContent.pageHeroes?.bespoke?.mtoVideoUrl?.trim() ||
    initialSiteContent.pageHeroes?.bespoke?.mtoVideoUrl?.trim() ||
    storeSiteContent.founderVideoUrl?.trim() ||
    initialSiteContent.founderVideoUrl?.trim() ||
    "";
  const mtoVideoPoster =
    storeSiteContent.pageHeroes?.bespoke?.mtoPosterUrl?.trim() ||
    initialSiteContent.pageHeroes?.bespoke?.mtoPosterUrl?.trim() ||
    storeSiteContent.founderVideoPosterUrl?.trim() ||
    initialSiteContent.founderVideoPosterUrl?.trim() ||
    "";

  const curatedMtoProducts = useMemo(() => {
    const fromStore = storeProducts.filter(isCuratedBespokeMtoProduct);
    if (fromStore.length > 0) return fromStore;
    return initialMtoProducts.filter(isCuratedBespokeMtoProduct);
  }, [storeProducts, initialMtoProducts]);
  const [activeMtoIdx, setActiveMtoIdx] = useState(0);
  const [prevMtoIdx, setPrevMtoIdx] = useState<number | null>(null);
  const [mtoHoverPaused, setMtoHoverPaused] = useState(false);
  const [selectedShowcaseColorId, setSelectedShowcaseColorId] = useState<string>("main-color");
  const [mobileColorById, setMobileColorById] = useState<Record<string, string>>({});

  const switchMtoSlide = useCallback(
    (nextIdxOrUpdater: number | ((current: number) => number)) => {
      setActiveMtoIdx((current) => {
        const len = curatedMtoProducts.length;
        if (len <= 1) return 0;
        const resolved =
          typeof nextIdxOrUpdater === "function"
            ? nextIdxOrUpdater(current)
            : nextIdxOrUpdater;
        const normalized = ((resolved % len) + len) % len;
        if (normalized !== current) {
          setPrevMtoIdx(current);
          setSelectedShowcaseColorId("main-color");
        }
        return normalized;
      });
    },
    [curatedMtoProducts.length],
  );

  useEffect(() => {
    if (prevMtoIdx === null) return;
    const t = window.setTimeout(() => {
      setPrevMtoIdx(null);
    }, 950);
    return () => window.clearTimeout(t);
  }, [prevMtoIdx, activeMtoIdx]);

  // Quick View Modal state for MTO showcase
  const [quickViewPiece, setQuickViewPiece] = useState<Product | null>(null);
  const [quickViewColorVariantId, setQuickViewColorVariantId] = useState<string>("main-color");
  const [quickViewMode, setQuickViewMode] = useState<"solo" | "paired">("solo");
  const [quickViewComboId, setQuickViewComboId] = useState<string>("");
  const [quickViewFit, setQuickViewFit] = useState<string>("Standard");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    if (curatedMtoProducts.length <= 1 || mtoHoverPaused || Boolean(quickViewPiece)) return;
    const timer = window.setInterval(() => {
      switchMtoSlide((prev) => prev + 1);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [curatedMtoProducts.length, mtoHoverPaused, activeMtoIdx, quickViewPiece, switchMtoSlide]);

  useEffect(() => {
    if (quickViewPiece) {
      document.body.style.overflow = "hidden";
      setQty(1);
      setSelectedSize("");
      setQuickViewColorVariantId(selectedShowcaseColorId || "main-color");
      setQuickViewMode("solo");
      setQuickViewComboId("");
      if (quickViewPiece.wearTag === "womens") {
        setQuickViewFit("Standard");
      } else if (quickViewPiece.wearTag === "unisex") {
        setQuickViewFit("Men");
      } else {
        setQuickViewFit("Standard");
      }
    } else {
      document.body.style.overflow = "";
      setActiveImage("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [quickViewPiece, selectedShowcaseColorId]);
  const [, setBookingIdForPayment] = useState<string | null>(null);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [slotStep, setSlotStep] = useState<"date" | "time">("date");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    date: "",
    time: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [calendarLoadError, setCalendarLoadError] = useState("");
  const {
    empty: bespokeHeroEmpty,
    shellSpinner: bespokeHeroSpinner,
    style: bespokeHeroStyle,
    showImageLoader: bespokeHeroImageLoader,
    imageReady: bespokeHeroImageReady,
  } = usePageHeroShellRenderPropsWithSSRSeed("bespoke", initialSiteContent);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : user.name || "",
      email: prev.email.trim() ? prev.email : user.email || "",
    }));
  }, [user]);

  const loadCalendar = useCallback(async () => {
    if (!user?.id) {
      setDisabledDates([]);
      setCalendarLoadError("");
      return;
    }
    try {
      const { disabledDateSet } = await dataStore.getConsultationAvailability(user.id);
      setDisabledDates([...disabledDateSet]);
      setCalendarLoadError("");
    } catch {
      setDisabledDates([]);
      setCalendarLoadError(
        "Live calendar could not be loaded. You can still pick a date; if it’s unavailable, you’ll see an error when you submit.",
      );
    }
  }, [user?.id]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (!user?.id) return;
    const id = window.setInterval(() => void loadCalendar(), 60000);
    return () => window.clearInterval(id);
  }, [user?.id, loadCalendar]);

  useEffect(() => {
    if (!user?.id) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`bespoke-calendar-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_bookings" }, () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => {
          t = undefined;
          void loadCalendar();
        }, 150);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_settings" }, () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => {
          t = undefined;
          void loadCalendar();
        }, 150);
      })
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadCalendar]);

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
    if (!payConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPayConfirmOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [payConfirmOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const DOWNPAYMENT_GHS = 1110;

  const openPayConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitError("");
    if (!form.date?.trim()) {
      setSubmitError("Please choose a preferred date.");
      return;
    }
    if (!form.time?.trim()) {
      setSubmitError("Please choose a preferred time (8:00am–3:00pm).");
      return;
    }
    if (!form.service?.trim()) {
      setSubmitError("Please select a service type.");
      return;
    }
    const paystack = (window as Window & { PaystackPop?: { setup: (opts: Record<string, unknown>) => { openIframe: () => void } } })
      .PaystackPop;
    if (!paystack) {
      toast.error("Payment gateway is still loading. Please wait a moment.");
      return;
    }
    setPayConfirmOpen(true);
  };

  const proceedToPay = async () => {
    if (!user) return;
    setPayConfirmOpen(false);
    setStatus("sending");
    try {
      const booking = await dataStore.createConsultationBooking({
        userId: user.id,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        service: form.service,
        preferredDate: form.date.trim(),
        preferredTime: form.time.trim(),
        notes: form.notes || undefined,
      });
      setBookingIdForPayment(booking.id);

      const amount = Math.round(DOWNPAYMENT_GHS * 100);

      const paystack = (window as Window & { PaystackPop?: { setup: (opts: Record<string, unknown>) => { openIframe: () => void } } })
        .PaystackPop;
      if (!paystack) {
        throw new Error("Paystack failed to load.");
      }
      const handler = paystack.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: form.email,
        amount,
        currency: "GHS",
        ref: `BSP-${booking.service.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-")}-${booking.id.slice(-8)}`,
        metadata: {
          custom_fields: [
            {
              display_name: "Consultation Booking ID",
              variable_name: "booking_id",
              value: booking.id,
            },
          ],
        },
        callback: function (paystackRes: { reference?: string }) {
          (async () => {
            try {
              const verifyRes = await fetch("/api/paystack/verify-consultation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reference: paystackRes.reference,
                  bookingId: booking.id,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
              setStatus("sent");
              toast.success("Down payment received. Your slot request is in.");
              void loadCalendar();
            } catch (err) {
              setStatus("error");
              setSubmitError(err instanceof Error ? err.message : "Payment verification failed.");
              toast.error(err instanceof Error ? err.message : "Payment verification failed.");
            }
          })();
        },
        onClose: function () {
          setStatus("idle");
          toast.info("Payment cancelled.");
          if (!booking?.id) return;
          void fetch("/api/paystack/abandon-consultation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: booking.id }),
          });
        },
      });

      handler.openIframe();
    } catch (err) {
      setStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.header}`}
        data-page-hero-empty={bespokeHeroEmpty ? "true" : "false"}
        data-page-hero-loading={bespokeHeroSpinner ? "true" : "false"}
        data-page-hero-ready={bespokeHeroImageReady ? "true" : "false"}
        style={bespokeHeroStyle}
      >
        {bespokeHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <div className={styles.headerInner}>
            <div className={styles.headerText}>
              <span className={`section-label ${styles.headerKicker}`}>Consultancy</span>
              <h1 className={`t-display ${styles.title}`}>
                Book A Slot —<br /><em>Bespoke or Styling</em>
              </h1>
              <p className={styles.subtitle}>
                This is for clan members who desire exclusivity — our take on putting that look
                together for the big day or your next phase. We offer custom tailoring experiences
                crafted around your presence and personality.
              </p>
              <p className={styles.note}>
                By appointment only. A down payment of <strong>GHS 1,110</strong> is required to reserve a slot.
              </p>
            </div>

            <div className={styles.steps}>
              {[
                { num: "01", label: "Book", desc: "Submit your slot request below" },
                { num: "02", label: "Consult", desc: "We discuss your vision & measurements" },
                { num: "03", label: "Create", desc: "We craft your piece" },
                { num: "04", label: "Fit", desc: "Final fitting & refinements" },
              ].map((s) => (
                <div key={s.num} className={styles.step}>
                  <span className={styles.stepNum}>{s.num}</span>
                  <div>
                    <p className={styles.stepLabel}>{s.label}</p>
                    <p className={styles.stepDesc}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`section ${styles.formSection}`}>
        <div className="container">
          <div className={styles.formWrap}>
            {!user ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>
                  <Image src="/blacklogo21.png" alt="JOEY THE BRAND" width={140} height={28} />
                </div>
                <h2 className={styles.successTitle}>Sign in to request a slot</h2>
                <p className={styles.successBody}>
                  Bespoke appointments are tied to your account so you can track status, see when we confirm,
                  and receive your booking code after approval.
                </p>
                <Link href="/account" className="btn btn-primary">
                  Sign in or create an account
                </Link>
              </div>
            ) : status === "sent" ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>
                  <Image src="/blacklogo21.png" alt="JOEY THE BRAND" width={140} height={28} />
                </div>
                <h2 className={styles.successTitle}>Your slot request is in.</h2>
                <p className={styles.successBody}>
                  We&apos;ll review your details and update the status on your account within 24–48 hours.
                  You can follow progress under <strong>Bespoke appointments</strong> on your account page.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
                  <Link href="/account" className="btn btn-primary">
                    View my account
                  </Link>
                  <a
                    href="https://wa.me/233504148009"
                    className="btn btn-outline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp Joey
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={openPayConfirm} className={styles.form} noValidate>
                <p className={styles.signedInNote}>
                  Signed in as <strong>{user.email}</strong>. This request will appear on your account.
                </p>
                <h2 className={styles.formTitle}>Your Details</h2>

                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Full Name *</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="form-input"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="form-input"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Phone / WhatsApp *</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="form-input"
                      placeholder="+233 xxx xxx xxx"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="date" className="form-label">Preferred Date *</label>
                    {calendarLoadError ? (
                      <p className={styles.calendarWarn}>{calendarLoadError}</p>
                    ) : null}
                    {slotStep === "date" ? (
                      <div style={{ display: "grid", gap: "10px" }}>
                        <CustomDatePicker
                          id="date"
                          name="date"
                          value={form.date}
                          onChange={handleChange as (e: { target: { name: string; value: string } }) => void}
                          min={new Date().toISOString().split("T")[0]}
                          disabledDates={disabledDates}
                          closeOnSelect={false}
                          nextLabel="Next: pick time"
                          nextDisabled={!form.date.trim()}
                          onNext={() => {
                            if (!form.date.trim()) return;
                            setSlotStep("time");
                            setSubmitError("");
                          }}
                        />
                        {form.date.trim() && form.time.trim() ? (
                          <span style={{ alignSelf: "center", fontSize: "0.9rem", color: "var(--alaska-gray)" }}>
                            Selected: <strong>{form.date}</strong> at{" "}
                            <strong>{timeOptions.find((t) => t.value === form.time)?.label ?? form.time}</strong>
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "10px" }}>
                        <div style={{ fontSize: "0.9rem", color: "var(--alaska-gray)" }}>
                          Date: <strong>{form.date || "—"}</strong>
                        </div>
                        <label className="form-label" id="time-label">Preferred Time *</label>
                        <CustomSelect
                          id="time"
                          name="time"
                          value={form.time}
                          onChange={handleChange}
                          options={timeOptions}
                          placeholder="Select a time (8:00am–3:00pm)"
                          required
                        />
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <button type="button" className="btn btn-outline" onClick={() => setSlotStep("date")}>
                            Back
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!form.time.trim()}
                            onClick={() => setSlotStep("date")}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" id="service-label">Service Type *</label>
                  <CustomSelect
                    id="service"
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    options={serviceOptions}
                    placeholder="Select a service"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="notes" className="form-label">Tell Us About Your Vision</label>
                  <textarea
                    id="notes"
                    name="notes"
                    className="form-textarea"
                    placeholder="Describe the occasion, your style preferences, or anything else we should know…"
                    value={form.notes}
                    onChange={handleChange}
                  />
                </div>

                {(status === "error" || submitError) && (
                  <p className={styles.errorMsg}>
                    {submitError
                      ? submitError
                      : status === "error"
                        ? "Could not save your request. Please try again or report the issue if it persists."
                        : null}
                  </p>
                )}

                <div className={styles.submitRow}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    id="bespoke-submit"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? "Submitting…" : "Request My Slot"}
                  </button>

                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {curatedMtoProducts.length > 0 ? (
        <section className={styles.mtoSection} aria-labelledby="bespoke-mto-heading">
          <div className={styles.mtoBanner}>
            <div className={styles.mtoBannerMedia} aria-hidden="true">
              {mtoVideoUrl ? (
                <video
                  key={mtoVideoUrl}
                  className={styles.mtoBannerVideo}
                  src={mtoVideoUrl}
                  poster={mtoVideoPoster && mtoVideoPoster !== mtoVideoUrl ? mtoVideoPoster : undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              ) : mtoVideoPoster ? (
                <img
                  src={mtoVideoPoster}
                  alt=""
                  className={styles.mtoBannerVideo}
                  draggable={false}
                />
              ) : null}
              <div className={styles.mtoBannerScrim} />
            </div>

            <div className={styles.mtoHeader}>
              <span className={styles.mtoKicker}>— Crafted On Order</span>
              <h2 id="bespoke-mto-heading" className={`t-display ${styles.mtoTitle}`}>
                Made to Order Pieces
              </h2>
              <p className={styles.mtoSubtitle}>
                Exclusive designs created by JOEY THE BRAND and handcrafted specifically for your order. Select your size and options, complete full payment at checkout, and your piece will be produced within the stated lead time.
              </p>
            </div>
          </div>

          <div
            className={styles.mtoShowcase}
            onMouseEnter={() => setMtoHoverPaused(true)}
            onMouseLeave={() => setMtoHoverPaused(false)}
          >
            {(() => {
              const safeIdx =
                curatedMtoProducts.length > 0
                  ? Math.min(activeMtoIdx, curatedMtoProducts.length - 1)
                  : 0;
              const p = curatedMtoProducts[safeIdx];
              if (!p) return null;

              const leadDays = p.madeToOrderLeadDays ?? p.bespokeLeadDays ?? 14;
              const inWishlist = wishlistItems.some((w) => w.id === p.id);
              const colorVariants = (p.variants || []).filter((v) => v.type === "color");
              const activeShowcaseColor =
                colorVariants.find((v) => v.id === selectedShowcaseColorId) ||
                colorVariants[0] ||
                null;
              const displayImage =
                (activeShowcaseColor &&
                  activeShowcaseColor.id !== "main-color" &&
                  (activeShowcaseColor.images?.[0] || activeShowcaseColor.thumbnailUrl)) ||
                p.image;
              const displayTitle =
                (activeShowcaseColor &&
                  activeShowcaseColor.id !== "main-color" &&
                  activeShowcaseColor.productNameOverride?.trim()) ||
                p.name;
              const availableSizes = (p.sizes || [])
                .filter((s) => s.available !== false)
                .map((s) => s.name);
              const defaultSize = availableSizes[0] || "Standard";
              const sizeSummary =
                availableSizes.length > 2
                  ? `${availableSizes[0]} – ${availableSizes[availableSizes.length - 1]}`
                  : availableSizes.length > 0
                    ? availableSizes.join(", ")
                    : "Standard & Custom";

              const productDescription = (p.description || "").trim();
              const detailLabel = "Craftsmanship";
              const detailValue = productDescription || "100% Handcrafted";

              const productHref = `/shop/${p.slug || p.id}`;

              const handleQuickAddShowcaseToCart = () => {
                const stockStatus = getVariantStockStatus(p, activeShowcaseColor, null, "solo");
                const defaultFit =
                  p.wearTag === "womens"
                    ? "Standard"
                    : p.wearTag === "unisex"
                      ? "Men"
                      : undefined;
                cartStore.addItem({
                  productId: p.id,
                  name: displayTitle,
                  color: activeShowcaseColor?.name || undefined,
                  colorHex: activeShowcaseColor?.colorHex,
                  size: defaultSize,
                  fit: defaultFit,
                  wearTag: p.wearTag,
                  price: stockStatus.unitPrice,
                  image: displayImage,
                  image2: activeShowcaseColor?.images?.[1] || p.images?.[0] || displayImage,
                  quantity: 1,
                  maxStock: stockStatus.mtoMaxQtyPerOrder,
                  availablePhysicalStock: 0,
                  mtoMaxQtyPerOrder: stockStatus.mtoMaxQtyPerOrder,
                  fulfillmentChoice: "made_to_order",
                  isMadeToOrder: true,
                  leadDays: stockStatus.leadDays,
                  isBespoke: true,
                  bespokeLeadDays: stockStatus.leadDays,
                  variantId:
                    stockStatus.variantId !== "base" ? stockStatus.variantId : undefined,
                });
                toast.success(`${displayTitle} (${defaultSize}) added to your cart!`);
              };

              const prevProduct =
                prevMtoIdx !== null && prevMtoIdx !== safeIdx
                  ? curatedMtoProducts[prevMtoIdx] || null
                  : null;

              return (
                <div className={styles.mtoShowcaseInner}>
                  {/* Left Column: Title, Price, Bottom Slide Dots */}
                  <div className={styles.mtoShowcaseLeft}>
                    <div />
                    <div className={styles.mtoTitleStage}>
                      {prevProduct ? (
                        <div
                          key={`prev-title-${prevProduct.id}`}
                          className={`${styles.mtoTitleBlock} ${styles.mtoTitleBlockExit}`}
                          aria-hidden="true"
                        >
                          <span className={styles.mtoProductTag}>
                            {prevProduct.categoryName || "Made to Order"}
                          </span>
                          <div className={styles.mtoShowcaseNameLink}>
                            <h3 className={styles.mtoShowcaseName}>{prevProduct.name}</h3>
                          </div>
                          <p className={styles.mtoShowcasePrice}>
                            GHC {prevProduct.price.toLocaleString()}
                            {prevProduct.originalPrice ? (
                              <span className={styles.mtoShowcaseOriginalPrice}>
                                GHC {prevProduct.originalPrice.toLocaleString()}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      ) : null}

                      <div
                        key={`curr-title-${p.id}-${activeShowcaseColor?.id || "main"}`}
                        className={`${styles.mtoTitleBlock} ${styles.mtoTitleBlockEnter}`}
                      >
                        <span className={styles.mtoProductTag}>
                          {p.categoryName || "Made to Order"}
                        </span>
                        <Link href={productHref} className={styles.mtoShowcaseNameLink}>
                          <h3 className={styles.mtoShowcaseName}>{displayTitle}</h3>
                        </Link>
                        <p className={styles.mtoShowcasePrice}>
                          GHC {p.price.toLocaleString()}
                          {p.originalPrice ? (
                            <span className={styles.mtoShowcaseOriginalPrice}>
                              GHC {p.originalPrice.toLocaleString()}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    <div className={styles.mtoBarsRow} role="tablist" aria-label="Made to Order pieces">
                      {curatedMtoProducts.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={idx === safeIdx}
                          aria-label={`View ${item.name}`}
                          className={`${styles.mtoBarBtn} ${
                            idx === safeIdx ? styles.mtoBarBtnActive : ""
                          }`}
                          onClick={() => switchMtoSlide(idx)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Center Column: White Circle + Dual-Buffered Sliding Product Image */}
                  <div className={styles.mtoShowcaseCenter}>
                    <div
                      key={`circle-${p.id}`}
                      className={styles.mtoCircleBackdrop}
                      aria-hidden="true"
                    />
                    <div className={styles.mtoMediaStage}>
                      {prevProduct ? (
                        <div
                          key={`prev-media-${prevProduct.id}`}
                          className={`${styles.mtoMediaLink} ${styles.mtoMediaExit}`}
                          aria-hidden="true"
                        >
                          <ProductMedia
                            src={prevProduct.image}
                            alt=""
                            className={styles.mtoShowcaseMedia}
                          />
                        </div>
                      ) : null}

                      <Link
                        key={`curr-media-${p.id}-${activeShowcaseColor?.id || "main"}`}
                        href={productHref}
                        className={`${styles.mtoMediaLink} ${styles.mtoMediaEnter}`}
                        aria-label={`View ${displayTitle}`}
                      >
                        <ProductMedia
                          src={displayImage}
                          alt={displayTitle}
                          className={styles.mtoShowcaseMedia}
                        />
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Specs, Vertical Action Icons (Heart, Quick View, Variant Colors), Bottom-Right + Add to Cart */}
                  <div className={styles.mtoShowcaseRight}>
                    <div />
                    <div className={styles.mtoRightTop}>
                      <div
                        key={`specs-${p.id}`}
                        className={styles.mtoSpecsList}
                      >
                        <div className={styles.mtoSpecItem}>
                          <span className={styles.mtoSpecLabel}>{detailLabel}</span>
                          <span className={styles.mtoSpecValue}>{detailValue}</span>
                        </div>

                        <div className={styles.mtoSpecItem}>
                          <span className={styles.mtoSpecLabel}>Sizing</span>
                          <span className={styles.mtoSpecValue}>{sizeSummary}</span>
                        </div>

                        <div className={styles.mtoSpecItem}>
                          <span className={styles.mtoSpecLabel}>Production Lead Time</span>
                          <span className={styles.mtoSpecValue}>{leadDays} Days</span>
                        </div>
                      </div>

                      <div className={styles.mtoSideActions}>
                        {/* 1. Heart (Wishlist) Button */}
                        <button
                          type="button"
                          className={`${styles.mtoCircleIconBtn} ${
                            inWishlist ? styles.mtoCircleIconBtnActive : ""
                          }`}
                          aria-label={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                          title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                          onClick={() => {
                            const wasIn = wishlistStore.has(p.id);
                            wishlistStore.toggleItem({
                              id: p.id,
                              name: p.name,
                              price: `GHC ${p.price.toLocaleString()}`,
                              image: p.image,
                              hoverImage: p.hoverImage,
                              category: p.categoryName || "",
                            });
                            toast.success(
                              wasIn
                                ? `${p.name} removed from wishlist`
                                : `${p.name} added to wishlist`,
                            );
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill={inWishlist ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>

                        {/* 2. View (Quick View) Button */}
                        <button
                          type="button"
                          className={styles.mtoCircleIconBtn}
                          aria-label={`Quick view ${p.name}`}
                          title="Quick View"
                          onClick={() => setQuickViewPiece(p)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="6" cy="15" r="4" />
                            <circle cx="18" cy="15" r="4" />
                            <path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
                            <path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2" />
                            <path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2" />
                          </svg>
                        </button>

                        {/* 3. Variant Colors (if available) */}
                        {colorVariants.length > 0 &&
                          colorVariants.map((v) => {
                            const isSelectedColor =
                              (activeShowcaseColor?.id || "main-color") === v.id;
                            const swatchImg =
                              v.thumbnailUrl ||
                              v.images?.[0] ||
                              (v.id === "main-color" ? p.image : null);
                            return (
                              <button
                                key={v.id}
                                type="button"
                                className={`${styles.mtoColorVariantBtn} ${
                                  isSelectedColor ? styles.mtoColorVariantBtnActive : ""
                                }`}
                                title={v.name || "Select color"}
                                aria-label={`Select color ${v.name || v.id}`}
                                style={{
                                  backgroundColor: v.colorHex || "#ccc",
                                  backgroundImage: swatchImg ? `url(${swatchImg})` : "none",
                                }}
                                onClick={() => setSelectedShowcaseColorId(v.id)}
                              />
                            );
                          })}
                      </div>
                    </div>

                    <div className={styles.mtoPlusWrap}>
                      <button
                        type="button"
                        className={styles.mtoPlusBtn}
                        aria-label={`Add ${displayTitle} to cart`}
                        title="Add to Cart"
                        onClick={handleQuickAddShowcaseToCart}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Phones: stacked lookbook — tap the photo for product details */}
          <div className={styles.mtoLookbook}>
            {curatedMtoProducts.map((p) => {
              const inWishlist = wishlistItems.some((w) => w.id === p.id);
              const colorVariants = (p.variants || []).filter((v) => v.type === "color");
              const selectedColorId = mobileColorById[p.id] || "main-color";
              const activeColor =
                colorVariants.find((v) => v.id === selectedColorId) ||
                colorVariants[0] ||
                null;
              const displayImage =
                (activeColor &&
                  activeColor.id !== "main-color" &&
                  (activeColor.images?.[0] || activeColor.thumbnailUrl)) ||
                p.image;
              const displayTitle =
                (activeColor &&
                  activeColor.id !== "main-color" &&
                  activeColor.productNameOverride?.trim()) ||
                p.name;
              const displayPrice =
                Number(activeColor?.price) > 0 ? Number(activeColor.price) : p.price;
              const productHref = `/shop/${p.slug || p.id}`;

              return (
                <article key={p.id} className={styles.mtoLookPanel}>
                  <Link
                    href={productHref}
                    className={styles.mtoLookLink}
                    aria-label={`View ${displayTitle}`}
                  >
                    <ProductMedia
                      src={displayImage}
                      alt={displayTitle}
                      className={styles.mtoLookMedia}
                      loading="lazy"
                    />
                    <span className={styles.mtoLookScrim} aria-hidden="true" />
                    <span className={styles.mtoLookCaption}>
                      <span className={styles.mtoLookName}>{displayTitle}</span>
                      <span className={styles.mtoLookPrice}>
                        GHC {displayPrice.toLocaleString()}
                        {p.originalPrice ? (
                          <span className={styles.mtoLookOriginalPrice}>
                            GHC {p.originalPrice.toLocaleString()}
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.mtoLookCta}>View piece</span>
                    </span>
                  </Link>

                  <div className={styles.mtoLookActions}>
                    <button
                      type="button"
                      className={`${styles.mtoCircleIconBtn} ${styles.mtoLookIconBtn} ${
                        inWishlist ? styles.mtoCircleIconBtnActive : ""
                      }`}
                      aria-label={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                      title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                      onClick={() => {
                        const wasIn = wishlistStore.has(p.id);
                        wishlistStore.toggleItem({
                          id: p.id,
                          name: p.name,
                          price: `GHC ${p.price.toLocaleString()}`,
                          image: p.image,
                          hoverImage: p.hoverImage,
                          category: p.categoryName || "",
                        });
                        toast.success(
                          wasIn
                            ? `${p.name} removed from wishlist`
                            : `${p.name} added to wishlist`,
                        );
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={inWishlist ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className={`${styles.mtoCircleIconBtn} ${styles.mtoLookIconBtn}`}
                      aria-label={`Quick view ${displayTitle}`}
                      title="Quick View"
                      onClick={() => setQuickViewPiece(p)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="6" cy="15" r="4" />
                        <circle cx="18" cy="15" r="4" />
                        <path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
                        <path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2" />
                        <path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2" />
                      </svg>
                    </button>

                    {colorVariants.length > 0 ? (
                      <div className={styles.mtoLookSwatches} role="group" aria-label="Colors">
                        {colorVariants.map((v) => {
                          const isSelected = (activeColor?.id || "main-color") === v.id;
                          const swatchImg =
                            v.thumbnailUrl ||
                            v.images?.[0] ||
                            (v.id === "main-color" ? p.image : null);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              className={`${styles.mtoLookSwatch} ${
                                isSelected ? styles.mtoLookSwatchActive : ""
                              }`}
                              title={v.name || "Select color"}
                              aria-label={`Select color ${v.name || v.id}`}
                              aria-pressed={isSelected}
                              style={{
                                backgroundColor: v.colorHex || "#ccc",
                                backgroundImage: swatchImg ? `url(${swatchImg})` : "none",
                              }}
                              onClick={() =>
                                setMobileColorById((prev) => ({ ...prev, [p.id]: v.id }))
                              }
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Quick View Modal for MTO Showcase */}
      {quickViewPiece ? (
        <div
          className={shopStyles.modalBackdrop}
          onClick={() => setQuickViewPiece(null)}
          aria-hidden="true"
        >
          <div
            className={shopStyles.modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bespoke-qv-title"
          >
            <button
              type="button"
              className={shopStyles.modalClose}
              onClick={() => setQuickViewPiece(null)}
              aria-label="Close modal"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className={shopStyles.modalGrid}>
              {(() => {
                const qvColorVariants = (quickViewPiece.variants || []).filter(
                  (v) => v.type === "color",
                );
                const qvActiveVariant =
                  qvColorVariants.find((v) => v.id === quickViewColorVariantId) ||
                  qvColorVariants[0] ||
                  null;
                const qvFitParent = (quickViewPiece.variants || []).find(
                  (v) => v.type === "fit_combo",
                );
                const qvCombos =
                  qvColorVariants.length > 0
                    ? qvActiveVariant?.combos || []
                    : qvFitParent?.combos || [];
                const qvActiveCombo =
                  quickViewMode === "paired"
                    ? qvCombos.find((c) => c.id === quickViewComboId) || qvCombos[0] || null
                    : null;

                const qvGalleryImages = (() => {
                  if (quickViewMode === "paired" && qvActiveCombo?.images?.length) {
                    return qvActiveCombo.images.filter(Boolean);
                  }
                  if (
                    qvActiveVariant &&
                    qvActiveVariant.id !== "main-color" &&
                    qvActiveVariant.images?.length
                  ) {
                    return qvActiveVariant.images.filter(Boolean);
                  }
                  const base = [quickViewPiece.image, ...(quickViewPiece.images || [])].filter(
                    Boolean,
                  );
                  return [...new Set(base)];
                })();

                const quickViewStockStatus = getVariantStockStatus(
                  quickViewPiece,
                  qvActiveVariant,
                  qvActiveCombo,
                  quickViewMode,
                );
                const isInQvWishlist = wishlistItems.some((w) => w.id === quickViewPiece.id);

                const qvAvailableSizes = getStorefrontSizes(quickViewPiece, quickViewFit);

                const handleQvAddToCart = () => {
                  if (!selectedSize && qvAvailableSizes.length > 0) {
                    toast.error("Please pick a size before adding to cart.");
                    return;
                  }
                  setAddStatus("adding");
                  setTimeout(() => {
                    const resolvedName = qvActiveCombo?.productNameOverride
                      ? qvActiveCombo.productNameOverride
                      : qvActiveVariant &&
                          qvActiveVariant.id !== "main-color" &&
                          qvActiveVariant.productNameOverride
                        ? qvActiveVariant.productNameOverride
                        : quickViewPiece.name;
                    cartStore.addItem({
                      productId: quickViewPiece.id,
                      name: resolvedName,
                      color: qvActiveVariant?.name,
                      colorHex: qvActiveVariant?.colorHex,
                      combo: qvActiveCombo ? qvActiveCombo.name : undefined,
                      size: selectedSize || qvAvailableSizes[0] || "Standard",
                      fit:
                        quickViewPiece.wearTag === "womens" ||
                        quickViewPiece.wearTag === "unisex"
                          ? quickViewFit
                          : undefined,
                      wearTag: quickViewPiece.wearTag,
                      price: quickViewStockStatus.unitPrice,
                      image:
                        qvActiveCombo?.thumbnailUrl ||
                        qvGalleryImages[0] ||
                        quickViewPiece.image,
                      image2:
                        qvActiveCombo?.images?.[0] ||
                        qvGalleryImages[1] ||
                        quickViewPiece.images?.[0],
                      quantity: qty,
                      maxStock: quickViewStockStatus.maxStock,
                      availablePhysicalStock: quickViewStockStatus.availablePhysicalStock,
                      mtoMaxQtyPerOrder: quickViewStockStatus.mtoMaxQtyPerOrder,
                      fulfillmentChoice: "made_to_order",
                      isMadeToOrder: true,
                      leadDays: quickViewStockStatus.leadDays,
                      isBespoke: true,
                      bespokeLeadDays: quickViewStockStatus.leadDays,
                      variantId:
                        quickViewStockStatus.variantId !== "base"
                          ? quickViewStockStatus.variantId
                          : undefined,
                      comboId:
                        quickViewStockStatus.comboId !== "base"
                          ? quickViewStockStatus.comboId
                          : undefined,
                    });
                    setAddStatus("added");
                    toast.success(`${resolvedName} added to your cart!`);
                    setTimeout(() => {
                      setAddStatus("idle");
                      setQuickViewPiece(null);
                    }, 1200);
                  }, 300);
                };

                return (
                  <>
                    <div className={shopStyles.modalGallery}>
                      <div className={shopStyles.modalImageWrap} style={{ position: "relative" }}>
                        <ProductMedia
                          src={activeImage || qvGalleryImages[0] || quickViewPiece.image}
                          alt={quickViewPiece.name}
                          className={shopStyles.modalImage}
                        />
                        <div
                          className={shopStyles.badgeStack}
                          aria-hidden="true"
                          style={{ left: "var(--space-md)" }}
                        >
                          <span className={shopStyles.saleBadge} style={{ background: "#595D66" }}>
                            MADE TO ORDER
                          </span>
                        </div>
                      </div>
                      {qvGalleryImages.length > 1 ? (
                        <div className={shopStyles.modalThumbnails}>
                          {qvGalleryImages.map((img: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              className={`${shopStyles.thumbBtn} ${
                                (activeImage || qvGalleryImages[0]) === img
                                  ? shopStyles.thumbActive
                                  : ""
                              }`}
                              onClick={() => setActiveImage(img)}
                              aria-label={`View image ${idx + 1}`}
                            >
                              <ProductMedia
                                src={img}
                                alt={`Thumbnail ${idx + 1}`}
                                className={shopStyles.thumbImage}
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {qvColorVariants.length > 0 ? (
                        <div className={shopStyles.colorSelectorSection}>
                          <span className={shopStyles.colorSelectorLabel}>Color:</span>
                          <div className={shopStyles.colorSelectorSwatches}>
                            {qvColorVariants.map((v: any) => {
                              const swatchUrl =
                                v.thumbnailUrl ||
                                v.images?.[0] ||
                                (v.id === "main-color" ? quickViewPiece.image : null);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  className={`${shopStyles.colorSelectorBtn} ${
                                    quickViewColorVariantId === v.id
                                      ? shopStyles.colorSelectorBtnActive
                                      : ""
                                  }`}
                                  style={{
                                    backgroundColor: v.colorHex || "#ccc",
                                    backgroundImage: swatchUrl ? `url(${swatchUrl})` : "none",
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }}
                                  onClick={() => {
                                    setQuickViewColorVariantId(v.id);
                                    setActiveImage("");
                                    const isSoloUnavail = getIsSoloUnavailable(v, quickViewPiece);
                                    const hasCombos = v.combos && v.combos.length > 0;
                                    if (isSoloUnavail && hasCombos) {
                                      setQuickViewMode("paired");
                                      setQuickViewComboId(v.combos[0].id);
                                    } else if (!hasCombos) {
                                      setQuickViewMode("solo");
                                      setQuickViewComboId("");
                                    }
                                  }}
                                  title={v.name || "Color"}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className={shopStyles.modalInfo}>
                      <h2 id="bespoke-qv-title" className={`t-display ${shopStyles.modalTitle}`}>
                        {qvActiveCombo?.productNameOverride
                          ? qvActiveCombo.productNameOverride
                          : qvActiveVariant &&
                              qvActiveVariant.id !== "main-color" &&
                              qvActiveVariant.productNameOverride
                            ? qvActiveVariant.productNameOverride
                            : quickViewPiece.name}
                      </h2>
                      <div className={shopStyles.modalPriceRow}>
                        <span className={shopStyles.modalPrice}>
                          GHC {quickViewStockStatus.unitPrice.toLocaleString()}
                        </span>
                        {!qvActiveCombo && quickViewPiece.originalPrice ? (
                          <span className={shopStyles.modalOriginalPrice}>
                            GHC {quickViewPiece.originalPrice.toLocaleString()}
                          </span>
                        ) : null}
                      </div>

                      <p className={shopStyles.modalDesc}>{quickViewPiece.description}</p>

                      {(quickViewPiece.wearTag === "womens" ||
                        quickViewPiece.wearTag === "unisex") && (
                        <div className={shopStyles.modalSizeRow} style={{ marginBottom: "1rem" }}>
                          <span className={shopStyles.qtyLabel}>
                            {quickViewPiece.wearTag === "unisex" ? "Gender:" : "Fit:"}
                          </span>
                          <div className={shopStyles.modalFitSelector}>
                            {(quickViewPiece.wearTag === "unisex"
                              ? ["Men", "Women"]
                              : ["Standard", "Thick"]
                            ).map((fit) => (
                              <button
                                key={fit}
                                type="button"
                                className={`${shopStyles.fitBtn} ${
                                  quickViewFit === fit ? shopStyles.fitBtnActive : ""
                                }`}
                                onClick={() => {
                                  setQuickViewFit(fit);
                                  setSelectedSize("");
                                }}
                              >
                                {fit}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={shopStyles.modalSizeRow}>
                        <span className={shopStyles.qtyLabel}>Size:</span>
                        <div className={shopStyles.sizeGrid}>
                          {qvAvailableSizes.map((sz: string) => (
                            <button
                              key={sz}
                              type="button"
                              className={`${shopStyles.sizeBtn} ${
                                selectedSize === sz ? shopStyles.sizeActive : ""
                              }`}
                              onClick={() => setSelectedSize((prev) => (prev === sz ? "" : sz))}
                            >
                              {formatSizeLabel(sz, quickViewFit, quickViewPiece.wearTag)}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={shopStyles.sizeGuideBtn}
                          onClick={() => setSizeGuideOpen(true)}
                        >
                          Size Guide
                        </button>
                      </div>

                      <div className={shopStyles.modalQtyRow}>
                        <div className={shopStyles.qtyLeft}>
                          <span className={shopStyles.qtyLabel}>Quantity:</span>
                          <div className={shopStyles.qtyControl}>
                            <button
                              type="button"
                              className={shopStyles.qtyBtn}
                              onClick={() => setQty(Math.max(1, qty - 1))}
                            >
                              -
                            </button>
                            <span className={shopStyles.qtyVal}>{qty}</span>
                            <button
                              type="button"
                              className={shopStyles.qtyBtn}
                              onClick={() => {
                                if (qty < quickViewStockStatus.maxStock) {
                                  setQty(qty + 1);
                                } else {
                                  toast.error(
                                    `Maximum ${quickViewStockStatus.maxStock} Made to Order pieces per order.`,
                                  );
                                }
                              }}
                              disabled={qty >= quickViewStockStatus.maxStock}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={shopStyles.modalActions}>
                        <button
                          type="button"
                          className={`btn btn-primary ${shopStyles.modalAddBtn}`}
                          onClick={handleQvAddToCart}
                          disabled={addStatus !== "idle"}
                        >
                          {addStatus === "idle"
                            ? "Order Made to Order"
                            : addStatus === "adding"
                              ? "Adding..."
                              : "Added ✓"}
                        </button>
                        <button
                          type="button"
                          className={shopStyles.modalWishlistBtn}
                          onClick={() => {
                            const wasIn = wishlistStore.has(quickViewPiece.id);
                            wishlistStore.toggleItem({
                              id: quickViewPiece.id,
                              name: quickViewPiece.name,
                              price: `GHC ${quickViewPiece.price.toLocaleString()}`,
                              image: quickViewPiece.image,
                              hoverImage: quickViewPiece.hoverImage,
                              category: quickViewPiece.categoryName || "",
                            });
                            toast.success(
                              wasIn
                                ? `${quickViewPiece.name} removed from wishlist`
                                : `${quickViewPiece.name} added to wishlist`,
                            );
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill={isInQvWishlist ? "var(--alaska-gray)" : "none"}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {isInQvWishlist ? "Saved To Wishlist" : "Add To Wishlist"}
                        </button>
                      </div>

                      <div
                        role="status"
                        aria-live="polite"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "14px",
                          marginBottom: "2px",
                          fontSize: "0.78rem",
                          color: "var(--alaska-gray)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Clock
                          aria-hidden
                          style={{
                            flex: "0 0 auto",
                            opacity: 0.85,
                            width: "14px",
                            height: "14px",
                            color: "var(--alaska-gray)",
                          }}
                        />
                        <span>
                          Made to Order piece handcrafted for you within{" "}
                          {quickViewStockStatus.leadDays || 14} days
                        </span>
                      </div>

                      <Link
                        href={`/shop/${quickViewPiece.slug || quickViewPiece.id}`}
                        className={shopStyles.modalFullDetail}
                      >
                        View Full Details →
                      </Link>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        kind="unisex"
      />

      {payConfirmOpen ? (
        <div
          className={styles.payBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm down payment"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPayConfirmOpen(false);
          }}
        >
          <div className={styles.payModal}>
            <div className={styles.payModalHeader}>
              <div className={styles.payModalKicker}>Down payment</div>
              <h3 className={styles.payModalTitle}>Proceed to pay to book your slot</h3>
            </div>
            <div className={styles.payModalBody}>
              <p className={styles.payModalMsg}>
                You will be charged <strong>GHS {DOWNPAYMENT_GHS.toLocaleString()}</strong> to reserve your slot.
                After payment, your request will appear on your account for confirmation.
              </p>
            </div>
            <div className={styles.payModalActions}>
              <button type="button" className="btn btn-outline" onClick={() => setPayConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={proceedToPay}>
                Confirm &amp; Pay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
