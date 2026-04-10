/**
 * Footer outbound links — set `null` until URLs are ready; Instagram is live.
 */
export const FOOTER_LINKS = {
  instagram: "https://www.instagram.com/urtailorstailor.official/",
  twitter: null as string | null,
  facebook: null as string | null,
  /**
   * “Curated by 🧞 | dev” pill — opens in a new tab when set.
   * Or set `NEXT_PUBLIC_DEV_PORTFOLIO_URL` in `.env.local` (overrides this).
   */
  portfolioDev: null as string | null,
} as const;
