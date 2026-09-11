"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Create a custom logo icon for markers to match Joey aesthetic
const customIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"><img src="/blacklogo21.png" style="width: 100%; height: auto; object-fit: contain;" /></div>`,
  iconSize: [60, 12],
  iconAnchor: [30, 6],
});

interface StoreLocation {
  id: string;
  name: string;
  tagline: string;
  address: string;
  hours: string;
  phone: string;
  lat: number;
  lng: number;
}

interface MapProps {
  locations: StoreLocation[];
  activeStoreId: string | null;
  onMarkerClick: (id: string) => void;
}

// Helper component to smoothly animate map to active marker
function MapEffect({ locations, activeStoreId }: MapProps) {
  const map = useMap();

  useEffect(() => {
    if (!activeStoreId) {
      // Zoomed out state
      map.flyTo([5.6037, -0.1870], 4, { duration: 1.5 });
      return;
    }
    const loc = locations.find((l) => l.id === activeStoreId);
    if (loc) {
      map.flyTo([loc.lat, loc.lng], 15, { duration: 1.5 });
    }
  }, [activeStoreId, locations, map]);

  return null;
}

export default function StoreLocatorMap({ locations, activeStoreId, onMarkerClick }: MapProps) {
  const defaultCenter: [number, number] = [5.6037, -0.1870];
  const [mounted, setMounted] = useState(false);
  const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ?? "";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ height: "100%", width: "100%", background: "#eaeaea" }} />;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={4}
      scrollWheelZoom={true}
      touchZoom={true}
      zoomControl={false}
      style={{ height: "100%", width: "100%", zIndex: 1 }}
    >
      <TileLayer
        url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <ZoomControl position="bottomright" />

      {locations.map((loc) => {
        const isActive = activeStoreId === loc.id;
        return (
          <Marker 
            key={loc.id} 
            position={[loc.lat, loc.lng]} 
            icon={customIcon}
            eventHandlers={{
              click: () => onMarkerClick(loc.id),
            }}
          >
            {/* The popup content formatted like the reference image */}
            <Popup 
              className="store-popup"
              eventHandlers={{
                add: (e) => {
                  if (isActive) e.target.openPopup();
                }
              }}
            >
              <div style={{ fontFamily: "var(--font-body, sans-serif)", color: "#333", minWidth: "220px" }}>
                <h4 style={{ fontFamily: "var(--font-display, sans-serif)", fontSize: "1.15rem", margin: "0 0 4px 0", fontWeight: 600, color: "#111" }}>{loc.name}</h4>
                <div style={{ fontFamily: "var(--font-label, sans-serif)", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "12px" }}>{loc.tagline}</div>
                <div style={{ fontSize: "0.85rem", marginBottom: "12px", color: "#555" }}>{loc.address}</div>
                <div style={{ fontSize: "0.85rem", marginBottom: "12px", color: "#555", whiteSpace: "pre-line" }}>{loc.hours}</div>
                <div style={{ fontSize: "0.85rem", color: "#888" }}>{loc.phone}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <MapEffect locations={locations} activeStoreId={activeStoreId} onMarkerClick={onMarkerClick} />
    </MapContainer>
  );
}
