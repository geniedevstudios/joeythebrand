const PRODUCTION_SITE = "https://www.joeythebrand.com";

/** Public origin for email links and images. Never localhost, never a redirecting apex host. */
export function getEmailBaseUrl(): string {
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

/** Stable logo URL. Email clients often refuse redirects and filenames with spaces. */
export const EMAIL_LOGO_URL = `${PRODUCTION_SITE}/white-logo.png`;
