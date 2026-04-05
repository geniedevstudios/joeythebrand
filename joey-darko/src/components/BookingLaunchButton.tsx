"use client";

import { usePortfolioBooking } from "@/components/booking/PortfolioBookingProvider";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function BookingLaunchButton({ className, children }: Props) {
  const { openBooking } = usePortfolioBooking();
  return (
    <button type="button" className={className} onClick={openBooking}>
      {children}
    </button>
  );
}
