import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import ValuesSection from "@/components/home/ValuesSection";
import FounderSection from "@/components/home/FounderSection";
import FeaturedSection from "@/components/home/FeaturedSection";
import BespokeTeaser from "@/components/home/BespokeTeaser";
import ScrollReveal from "@/components/ScrollReveal";

export default function HomePage() {
  return (
    <>
      <HeroSection />
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
