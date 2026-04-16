import EventsClient from "./EventsClient";
import { fetchEventsPageContent } from "@/lib/fetchEventsPageServer";
import { fetchPublicEvents } from "@/lib/fetchEventsServer";

export const metadata = {
  title: "Events — JOEY THE BRAND",
  description:
    "Events, trunk shows, and private appointments from JOEY THE BRAND.",
};

export default async function EventsPage() {
  const [page, events] = await Promise.all([fetchEventsPageContent(), fetchPublicEvents()]);
  return (
    <EventsClient
      topVideoUrl={page?.topVideoUrl}
      topVideoPosterUrl={page?.topVideoPosterUrl}
      heading={page?.heading}
      subheading={page?.subheading}
      events={events ?? []}
    />
  );
}

