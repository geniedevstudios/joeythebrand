export type ServiceItem = {
  id: string;
  title: string;
  summary: string;
  /** Longer copy for the detail modal */
  detail: string;
};

export const SERVICES: ServiceItem[] = [
  {
    id: "personal-styling",
    title: "Personal Styling",
    summary: "Tailored wardrobe consultations to elevate your personal brand and confidence.",
    detail:
      "We audit your lifestyle, goals, and existing wardrobe, then build a clear direction for silhouettes, colour, and key pieces that feel unmistakably you. Sessions can cover everyday polish, event dressing, or a full refresh—always with practical steps you can repeat long after we meet.",
  },
  {
    id: "brand-strategy",
    title: "Brand Strategy",
    summary: "Develop a cohesive fashion brand identity aligned with your vision and market.",
    detail:
      "Together we clarify who you serve, what you stand for, and how that shows up across naming, mood, range architecture, and launch story. You leave with a focused narrative and positioning choices that make design and marketing decisions easier—not a generic deck, but a roadmap tied to your real product and audience.",
  },
  {
    id: "design-consultation",
    title: "Design Consultation",
    summary: "Expert guidance on design concepts, fabrics, and production processes.",
    detail:
      "From first sketches to tech packs and factory-ready specs, I help you stress-test ideas, choose fabrics and finishes, and anticipate cost and lead-time trade-offs. Ideal when you need a second expert eye before you commit to sampling or scale-up.",
  },
  {
    id: "production-management",
    title: "Production Management",
    summary: "Full oversight from concept to delivery — quality assurance at every stage.",
    detail:
      "I coordinate timelines, vendor communication, fittings, and QC checkpoints so surprises are caught early—not at delivery. Whether you are running a capsule or a seasonal drop, the goal is predictable output, clear approvals, and standards your customer can feel in the garment.",
  },
  {
    id: "business-coaching",
    title: "Business Coaching",
    summary: "Build capacity in fashion entrepreneurship, pricing, and market positioning.",
    detail:
      "Practical working sessions on pricing models, margin targets, wholesale vs DTC, and how to present your line to buyers or investors. We tie advice to your numbers and stage—early label, growing studio, or solo creative ready to professionalise operations.",
  },
  {
    id: "trend-market",
    title: "Trend & Market Analysis",
    summary: "Stay ahead with insights on emerging trends and competitive landscape.",
    detail:
      "Structured scans of runway, retail, and cultural signals relevant to your segment—distilled into what actually matters for your next collection or campaign. Use it to validate direction, spot whitespace, or brief your team with a shared, evidence-based view of the market.",
  },
];
