/** Shared Email design tokens for Joey transactional mail. */

export const emailColors = {
  page: "#f5f1ec",
  shell: "#f9f5ef",
  panel: "#fffdfa",
  heroFallback: "#272b36",
  headline: "#272b36",
  body: "#5c554e",
  muted: "#685c54",
  meta: "#685c54",
  accent: "#272b36",
  detail: "#f9f5ef",
  divider: "#dfd7ce",
  footerRule: "#dfd7ce",
  eyebrow: "#685c54",
  soft: "#685c54",
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
  color: "#fffdfa",
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
  color: "#272b36",
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
  .hero { height: 200px !important; }
  .email-logo { width: 184px !important; height: 184px !important; }
  .item-image { width: 80px !important; max-width: 80px !important; }
  .item-copy { padding-left: 12px !important; }
  .gutter { width: 16px !important; }
  .panel-padding { padding: 0 18px 32px !important; }
  .headline { font-size: 28px !important; }
}
`;
