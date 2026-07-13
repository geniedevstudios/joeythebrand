import EventsClient from "./EventsClient";
import { fetchEventsPageContent } from "@/lib/fetchEventsPageServer";
import { fetchPublicEvents } from "@/lib/fetchEventsServer";

export const metadata = {
  title: "Events",
  description:
    "Events, trunk shows, and private appointments from JOEY THE BRAND.",
};

export default async function EventsPage() {
  const [page, events] = await Promise.all([fetchEventsPageContent(), fetchPublicEvents()]);
  return (
    <EventsClient
      topVideoUrl={page?.topVideoUrl}
      topVideoPosterUrl={page?.topVideoPosterUrl}
      topVideoTabletUrl={page?.topVideoTabletUrl}
      topVideoTabletPosterUrl={page?.topVideoTabletPosterUrl}
      topVideoMobileUrl={page?.topVideoMobileUrl}
      topVideoMobilePosterUrl={page?.topVideoMobilePosterUrl}
      heading={page?.heading}
      subheading={page?.subheading}
      events={events ?? []}
    />
  );
}

