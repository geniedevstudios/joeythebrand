"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "./StoreLocator.module.css";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";

// Dynamically import the map to avoid SSR issues with window/document
const StoreLocatorMap = dynamic(() => import("./StoreLocatorMap"), {
  ssr: false,
  loading: () => <div style={{ height: "100%", width: "100%", background: "#eaeaea" }} />,
});

// Hardcoded store location per user request
const STORES = [
  {
    id: "accra-hq",
    name: "Joey The Brand Studio",
    tagline: "BY APPOINTMENTS ONLY",
    address: "Nii Kwaofio St, Ashaley Botwe, Accra, Ghana",
    hours: "Mon–Fri: 08:00–18:00\nWeekends & Public Holidays: Closed",
    phone: "+233504148009",
    email: "joeythebrandonline@gmail.com",
    lat: 5.6791,
    lng: -0.1558,
  },
];

export default function StoreLocator() {
  // Start with null so it is zoomed out initially
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  return (
    <section className={styles.wrapper} id="store-locator">
      {/* Sidebar List */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Our stores</h2>
          <p className={styles.sidebarSubtitle}>{STORES.length} location(s) across Ghana</p>
        </div>

        <div className={styles.storeList}>
          {STORES.map((store) => {
            const isActive = activeStoreId === store.id;
            return (
              <div
                key={store.id}
                className={`${styles.storeItem} ${isActive ? styles.storeItemActive : ""}`}
                onClick={() => setActiveStoreId(store.id)}
              >
                <h3 className={styles.storeName}>{store.name}</h3>
                <p className={styles.storeTagline}>{store.tagline}</p>

                <p className={styles.storeAddress}>{store.address}</p>

                <div className={styles.hoursBlock}>
                  <div className={styles.storeHoursLabel}>Hours</div>
                  <p className={styles.storeHours} style={{ whiteSpace: "pre-line" }}>
                    {store.hours}
                  </p>
                </div>

                <div className={styles.storeContact}>
                  <Link href="/bespoke" className={styles.storeLink}>
                    Book an appointment →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Area */}
      <div className={styles.mapContainer}>
        <div className={styles.mapOverlay}>
          <div 
            className={styles.mapOverlayBtn} 
            style={{ cursor: "pointer" }}
            onClick={() => setActiveStoreId(null)}
          >
            Store Locator
          </div>
        </div>
        <StoreLocatorMap 
          locations={STORES} 
          activeStoreId={activeStoreId} 
          onMarkerClick={setActiveStoreId} 
        />
      </div>
    </section>
  );
}
