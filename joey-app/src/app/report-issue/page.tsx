import type { Metadata } from "next";
import { Suspense } from "react";
import ReportIssueClient from "./ReportIssueClient";
import { fetchSiteContentForHome } from "@/lib/fetchSiteContentServer";
import { DEFAULT_SITE_CONTENT } from "@/lib/dataStore";

export const metadata: Metadata = {
  title: "Report an Issue | JOEY THE BRAND",
  description: "Encountered a bug or having trouble with your order? Report the issue to our team for quick support.",
};

export const dynamic = "force-dynamic";

export default async function ReportIssuePage() {
  const initialSiteContent = (await fetchSiteContentForHome()) ?? DEFAULT_SITE_CONTENT;
  return (
    <Suspense fallback={<div className="container" style={{ padding: "clamp(3rem, 12vw, 6rem) 0" }} aria-busy="true" />}>
      <ReportIssueClient initialSiteContent={initialSiteContent} />
    </Suspense>
  );
}
