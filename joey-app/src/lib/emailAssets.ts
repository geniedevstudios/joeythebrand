const PRODUCTION_SITE = "https://www.joeythebrand.com";

/** Public origin for the live shop: emails, canonicals, sitemap. Never localhost, never apex. */
export function getPublicSiteUrl(): string {
  const explicit = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  try {
    const raw = explicit || PRODUCTION_SITE;
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return PRODUCTION_SITE;
    }
    if (u.hostname === "joeythebrand.com") u.hostname = "www.joeythebrand.com";
    u.protocol = "https:";
    return `${u.protocol}//${u.host}`.replace(/\/+$/, "");
  } catch {
    return PRODUCTION_SITE;
  }
}

export function getEmailBaseUrl(): string {
  return getPublicSiteUrl();
}

/** Stable logo URL. Email clients often refuse redirects and filenames with spaces. */
export const EMAIL_LOGO_URL = `${PRODUCTION_SITE}/white-logo.png`;
