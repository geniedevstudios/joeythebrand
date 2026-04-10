import HeroSection from "@/components/home/HeroSection";
import CollectionsSection from "@/components/home/CollectionsSection";
import AboutSection from "@/components/home/AboutSection";
import ValuesSection from "@/components/home/ValuesSection";
import FounderSection from "@/components/home/FounderSection";
import FeaturedSection from "@/components/home/FeaturedSection";
import BespokeTeaser from "@/components/home/BespokeTeaser";
import ScrollReveal from "@/components/ScrollReveal";
import { fetchSiteContentForHome } from "@/lib/fetchSiteContentServer";
import { fetchCollectionsForHome } from "@/lib/fetchCollectionsServer";
import { DEFAULT_SITE_CONTENT } from "@/lib/dataStore";

/** Fresh hero from Supabase on each request so admin edits show without a stale shell. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSiteContent = (await fetchSiteContentForHome()) ?? DEFAULT_SITE_CONTENT;
  const initialCollections = (await fetchCollectionsForHome()) ?? undefined;

  return (
    <>
      <HeroSection initialSiteContent={initialSiteContent} />
      <ScrollReveal>
        <CollectionsSection initialCollections={initialCollections} />
      </ScrollReveal>
      <ScrollReveal>
        <AboutSection />
      </ScrollReveal>
      <ScrollReveal>
        <ValuesSection />
      </ScrollReveal>
      <ScrollReveal>
        <FeaturedSection />
      </ScrollReveal>
      <ScrollReveal>
        <FounderSection initialCollections={initialCollections} />
      </ScrollReveal>
      <ScrollReveal>
        <BespokeTeaser />
      </ScrollReveal>
    </>
  );
}
