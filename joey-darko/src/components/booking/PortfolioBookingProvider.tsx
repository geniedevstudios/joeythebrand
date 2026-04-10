"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import BookingDrawer from "./BookingDrawer";

type Ctx = {
  openBooking: (service?: any) => void;
  closeBooking: () => void;
  isOpen: boolean;
};

const PortfolioBookingContext = createContext<Ctx | null>(null);

export function usePortfolioBooking(): Ctx {
  const c = useContext(PortfolioBookingContext);
  if (!c) {
    throw new Error("usePortfolioBooking must be used within PortfolioBookingProvider");
  }
  return c;
}

export function PortfolioBookingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialService, setInitialService] = useState<string | undefined>(undefined);

  const closeBooking = useCallback(() => {
    setOpen(false);
    setInitialService(undefined);
  }, []);

  const openBooking = useCallback((service?: unknown) => {
    // If called directly by onClick, the first arg is an event object.
    // We only want to set initialService if it's explicitly a string title.
    const serviceName = typeof service === "string" ? service : undefined;
    setInitialService(serviceName);
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      openBooking,
      closeBooking,
      isOpen: open,
    }),
    [open, openBooking, closeBooking],
  );

  return (
    <PortfolioBookingContext.Provider value={value}>
      {children}
      <BookingDrawer open={open} onClose={closeBooking} initialService={initialService} />
    </PortfolioBookingContext.Provider>
  );
}
