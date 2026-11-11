import type { Metadata } from "next";
import { Suspense } from "react";
import ReportIssueClient from "./ReportIssueClient";

export const metadata: Metadata = {
  title: "Report an Issue | JOEY THE BRAND",
  description: "Encountered a bug or having trouble with your order? Report the issue to our team for quick support.",
};

export default function ReportIssuePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "clamp(3rem, 12vw, 6rem) 0" }} aria-busy="true" />}>
      <ReportIssueClient />
    </Suspense>
  );
}
