import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import ValuesSection from "@/components/home/ValuesSection";
import FounderSection from "@/components/home/FounderSection";
import FeaturedSection from "@/components/home/FeaturedSection";
import BespokeTeaser from "@/components/home/BespokeTeaser";
import ScrollReveal from "@/components/ScrollReveal";
import { fetchSiteContentForHome } from "@/lib/fetchSiteContentServer";
import { DEFAULT_SITE_CONTENT } from "@/lib/dataStore";

/** Fresh hero from Supabase on each request so admin edits show without a stale shell. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSiteContent = (await fetchSiteContentForHome()) ?? DEFAULT_SITE_CONTENT;

  return (
    <>
      <HeroSection initialSiteContent={initialSiteContent} />
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
        <FounderSection />
      </ScrollReveal>
      <ScrollReveal>
        <BespokeTeaser />
      </ScrollReveal>
    </>
  );
}
