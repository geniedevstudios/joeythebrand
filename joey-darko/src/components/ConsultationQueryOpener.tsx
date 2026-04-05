"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePortfolioBooking } from "@/components/booking/PortfolioBookingProvider";

/** Opens the booking drawer when the URL contains `?consult=1` (e.g. after /booking redirect). */
export default function ConsultationQueryOpener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openBooking } = usePortfolioBooking();
  const done = useRef(false);

  useEffect(() => {
    const consult = searchParams.get("consult");
    if (consult !== "1") {
      done.current = false;
      return;
    }
    if (done.current) return;
    done.current = true;
    openBooking();
    router.replace("/", { scroll: false });
  }, [searchParams, router, openBooking]);

  return null;
}
