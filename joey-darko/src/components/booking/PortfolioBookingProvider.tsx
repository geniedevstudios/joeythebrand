"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import BookingDrawer from "./BookingDrawer";

type Ctx = {
  openBooking: () => void;
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
  const closeBooking = useCallback(() => setOpen(false), []);
  const openBooking = useCallback(() => setOpen(true), []);

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
      <BookingDrawer open={open} onClose={closeBooking} />
    </PortfolioBookingContext.Provider>
  );
}
