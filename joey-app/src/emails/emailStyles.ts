/** Shared RMS-inspired email design tokens for Joey transactional mail. */

export const emailColors = {
  page: "#f0efed",
  shell: "#f7f6f4",
  panel: "#ffffff",
  heroFallback: "#ecd8d7",
  headline: "#24231f",
  body: "#77746d",
  muted: "#96928b",
  meta: "#88847a",
  accent: "#4c2938",
  detail: "#f7f6f4",
  divider: "#eee8e3",
  footerRule: "#dedbd5",
  eyebrow: "#555149",
  soft: "#8a7d80",
} as const;

export const emailFonts = {
  sans: "Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
} as const;

export const emailEyebrow = {
  margin: "0",
  fontFamily: emailFonts.sans,
  fontSize: "9px",
  fontWeight: "bold" as const,
  letterSpacing: "3px",
  textAlign: "center" as const,
  color: emailColors.eyebrow,
  textTransform: "uppercase" as const,
};

export const emailHeadline = {
  margin: "12px 0 0",
  fontFamily: emailFonts.serif,
  fontSize: "34px",
  fontWeight: "normal" as const,
  lineHeight: "1.15",
  letterSpacing: "-1px",
  color: emailColors.headline,
  textAlign: "center" as const,
};

export const emailParagraph = {
  margin: "14px 0 0",
  fontFamily: emailFonts.sans,
  fontSize: "14px",
  lineHeight: "1.7",
  color: emailColors.body,
};

export const emailCta = {
  display: "inline-block" as const,
  padding: "16px 32px",
  border: `1px solid ${emailColors.accent}`,
  backgroundColor: emailColors.accent,
  color: "#ffffff",
  textDecoration: "none",
  fontFamily: emailFonts.sans,
  fontSize: "10px",
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
};

export const emailDetailBox = {
  marginTop: "26px",
  padding: "22px",
  backgroundColor: emailColors.detail,
  textAlign: "left" as const,
};

export const emailItemName = {
  margin: "0",
  fontFamily: emailFonts.serif,
  fontSize: "22px",
  lineHeight: "1.25",
  fontWeight: "normal" as const,
  color: "#34272d",
};

export const emailItemMeta = {
  margin: "10px 0 0",
  fontFamily: emailFonts.sans,
  fontSize: "11px",
  lineHeight: "1.8",
  letterSpacing: "1px",
  color: emailColors.soft,
};

export const emailItemPrice = {
  margin: "14px 0 0",
  fontFamily: emailFonts.sans,
  fontSize: "14px",
  color: emailColors.accent,
};

export const emailResponsiveCss = `
@media only screen and (max-width:480px) {
  .email-shell { padding: 0 !important; }
  .hero, .hero-link { height: 200px !important; }
  .gutter { width: 16px !important; }
  .panel-padding { padding: 0 18px 32px !important; }
  .headline { font-size: 28px !important; }
}
`;
