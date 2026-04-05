/** Escape text for HTML bodies (simple messages). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const DEFAULT_NEWSLETTER_SHOP_URL = "https://joeythebrand.com";

const DEFAULT_SHOP = DEFAULT_NEWSLETTER_SHOP_URL;

const MAX_HEADLINE = 240;
const MAX_INTRO = 4000;
const MAX_SECTION_BODY = 12000;
const MAX_SECTIONS = 8;
const MAX_EXTRA_FOOTER = 24000;
const MAX_URL = 2048;
const MAX_LABEL = 80;
const DEFAULT_BRAND = "JOEY THE BRAND";

export type NewsletterSectionInput = {
  imageUrl?: string;
  /** Opens when the image is tapped (e.g. collection page or YouTube for a “video” poster). */
  imageLinkUrl?: string;
  body?: string;
};

export type NewsletterSocialInput = {
  label: string;
  url: string;
  /** Small square icon (upload to site assets); shown instead of text when set. */
  iconUrl?: string;
};

export type NewsletterTemplateInput = {
  /** Centered at the very top (your app logo). */
  logoImageUrl?: string;
  viewInBrowserUrl?: string;
  headline: string;
  intro?: string;
  /** Full-width banner under “view in browser” — collections hero, event flyer, etc. */
  heroImageUrl?: string;
  /** Optional click-through for the hero image. */
  heroLinkUrl?: string;
  sections: NewsletterSectionInput[];
  /** Booking info, payment details, long footer copy (paragraphs) */
  extraFooter?: string;
  socialLinks?: NewsletterSocialInput[];
  brandName?: string;
};

function safeHttpUrl(raw: string | undefined): string | null {
  const s = raw?.trim().slice(0, MAX_URL);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Bundled footer icons only — blocks path traversal. */
function safeNewsletterBundledIconPath(raw: string | undefined): string | null {
  const s = raw?.trim();
  if (!s || !s.startsWith("/newsletter-social/")) return null;
  if (s.includes("..") || s.includes("\\") || s.includes("\0")) return null;
  if (!/^\/newsletter-social\/[a-zA-Z0-9._-]+$/.test(s)) return null;
  return s;
}

/**
 * Bundled footer icons (`/newsletter-social/*.png`):
 * - Preview: root-relative path (same origin as admin).
 * - Email: must be absolute HTTPS. Uses the same idea as uploaded images when you set
 *   `NEWSLETTER_SOCIAL_ICONS_BASE` to your Supabase public folder URL, or
 *   `NEWSLETTER_PUBLIC_ORIGIN` to the live storefront origin that serves `/newsletter-social/*`.
 */
function resolveSocialIconSrc(
  raw: string | undefined,
  shopBaseNoSlash: string,
  /** Admin preview: keep `/newsletter-social/…` so icons load from the current host. */
  useRootRelativeIcons: boolean,
): string | null {
  const bundled = safeNewsletterBundledIconPath(raw);
  if (bundled) {
    if (useRootRelativeIcons) return bundled;
    const supaFolder = process.env.NEWSLETTER_SOCIAL_ICONS_BASE?.trim().replace(/\/$/, "");
    if (supaFolder) {
      const file = bundled.replace(/^\/newsletter-social\//, "");
      if (!file || file.includes("/")) return null;
      const full = `${supaFolder}/${file}`;
      return safeHttpUrl(full) ?? full;
    }
    const publicOrigin =
      process.env.NEWSLETTER_PUBLIC_ORIGIN?.trim().replace(/\/$/, "") || shopBaseNoSlash.replace(/\/$/, "");
    return `${publicOrigin}${bundled}`;
  }
  return safeHttpUrl(raw);
}

function splitParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const P_MAIN =
  "margin:0 0 18px;font-size:16px;line-height:1.65;color:#3f3f46;font-family:Georgia,'Times New Roman',serif;";
const P_SMALL =
  "margin:0 0 12px;font-size:13px;line-height:1.6;color:#52525b;font-family:system-ui,-apple-system,sans-serif;";

function paragraphsHtml(text: string, style: string): string {
  return splitParagraphs(text)
    .map(
      (p) =>
        `<p style="${style}">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

export type BuildNewsletterTemplateOptions = {
  /**
   * When true, bundled icon paths stay as `/newsletter-social/*.png` (works in admin preview on :3001).
   * When false (default), they are prefixed with the shop/site origin for real emails.
   */
  useRootRelativeBundledIcons?: boolean;
};

/**
 * Promotional / editorial layout: optional web view link, hero, sections with images, footer & social row.
 * All user text is escaped; only validated http(s) URLs are emitted in href/src.
 */
export function buildNewsletterTemplateHtml(
  input: NewsletterTemplateInput,
  shopUrl?: string,
  options?: BuildNewsletterTemplateOptions,
): string {
  const useRootRelative = options?.useRootRelativeBundledIcons === true;
  const base = (shopUrl || process.env.NEWSLETTER_SHOP_URL || DEFAULT_SHOP).replace(/\/$/, "");
  const brand = (input.brandName?.trim() || DEFAULT_BRAND).slice(0, 120);
  const year = new Date().getFullYear();

  const logoSrc = safeHttpUrl(input.logoImageUrl);
  const logoRow = logoSrc
    ? `<tr><td style="padding:28px 24px 16px;text-align:center;background:#ffffff;">
         <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(brand)}" width="200" style="display:inline-block;max-width:200px;width:100%;height:auto;border:0;outline:none;text-decoration:none;vertical-align:middle;"/>
       </td></tr>`
    : "";

  const viewUrl = safeHttpUrl(input.viewInBrowserUrl);
  const viewRow = viewUrl
    ? `<tr><td style="padding:${logoSrc ? "4px" : "24px"} 24px 16px;text-align:center;font-family:system-ui,sans-serif;font-size:12px;background:#ffffff;">
         <a href="${escapeHtml(viewUrl)}" style="color:#52525b;text-decoration:underline;">View this email in your browser</a>
       </td></tr>`
    : "";

  const heroSrc = safeHttpUrl(input.heroImageUrl);
  const heroLink = safeHttpUrl(input.heroLinkUrl);
  const heroImgTag = heroSrc
    ? `<img src="${escapeHtml(heroSrc)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;outline:none;text-decoration:none;"/>`
    : "";
  const heroRow = heroSrc
    ? `<tr><td style="padding:0;background:#ffffff;">
         ${heroLink ? `<a href="${escapeHtml(heroLink)}" style="text-decoration:none;">${heroImgTag}</a>` : heroImgTag}
       </td></tr>`
    : "";

  const headline = input.headline.trim().slice(0, MAX_HEADLINE);
  const headlineRow =
    headline.length > 0
      ? `<tr><td style="padding:28px 24px 8px;background:#ffffff;">
           <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:0.02em;color:#18181b;font-family:system-ui,-apple-system,sans-serif;text-transform:none;">${escapeHtml(headline)}</h1>
         </td></tr>`
      : "";

  const brandBarRow = !logoSrc
    ? `<tr><td style="padding:20px 24px 16px;background:#272B36;color:#ffffff;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:system-ui,sans-serif;">
         ${escapeHtml(brand)}
       </td></tr>`
    : "";

  const introHtml = input.intro?.trim()
    ? `<tr><td style="padding:0 24px 8px;background:#ffffff;">${paragraphsHtml(input.intro.slice(0, MAX_INTRO), P_MAIN)}</td></tr>`
    : "";

  const sectionRows: string[] = [];
  for (const sec of input.sections.slice(0, MAX_SECTIONS)) {
    const img = safeHttpUrl(sec.imageUrl);
    const imgClick = safeHttpUrl(sec.imageLinkUrl);
    const body = (sec.body ?? "").slice(0, MAX_SECTION_BODY);
    if (img) {
      const imgTag = `<img src="${escapeHtml(img)}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:4px;border:0;outline:none;text-decoration:none;"/>`;
      const wrapped = imgClick
        ? `<a href="${escapeHtml(imgClick)}" style="text-decoration:none;">${imgTag}</a>`
        : imgTag;
      sectionRows.push(`<tr><td style="padding:24px 24px 0;background:#ffffff;">${wrapped}</td></tr>`);
    }
    if (body.trim()) {
      sectionRows.push(
        `<tr><td style="padding:${img ? "16px" : "24px"} 24px 0;background:#ffffff;">${paragraphsHtml(body, P_MAIN)}</td></tr>`,
      );
    }
  }

  const extra = input.extraFooter?.trim().slice(0, MAX_EXTRA_FOOTER);
  const extraHtml = extra
    ? `<tr><td style="padding:28px 24px 0;border-top:1px solid #e4e4e7;background:#ffffff;">${paragraphsHtml(extra, P_SMALL)}</td></tr>`
    : "";

  const links = (input.socialLinks ?? [])
    .slice(0, 6)
    .map((l) => {
      const href = safeHttpUrl(l.url);
      const label = l.label.trim().slice(0, MAX_LABEL);
      const icon = resolveSocialIconSrc(l.iconUrl, base, useRootRelative);
      if (!href || !label) return null;
      return { href, label, icon };
    })
    .filter((x): x is { href: string; label: string; icon: string | null } => x != null);

  const socialCell = (l: { href: string; label: string; icon: string | null }) =>
    l.icon
      ? `<a href="${escapeHtml(l.href)}" style="display:inline-block;text-decoration:none;margin:0 10px;vertical-align:middle;" title="${escapeHtml(l.label)}"><img src="${escapeHtml(l.icon)}" alt="${escapeHtml(l.label)}" width="32" height="32" style="display:block;width:32px;height:32px;border:0;outline:none;"/></a>`
      : `<a href="${escapeHtml(l.href)}" style="color:#272B36;font-weight:600;text-decoration:underline;font-family:system-ui,sans-serif;font-size:13px;">${escapeHtml(l.label)}</a>`;

  const socialHtml =
    links.length > 0
      ? `<tr><td style="padding:28px 24px 20px;text-align:center;background:#fafafa;border-top:1px solid #e4e4e7;">
          <div style="font-size:0;line-height:0;">
          ${links.map((l, i) => `${i > 0 ? `<span style="display:inline-block;width:8px;"></span>` : ""}${socialCell(l)}`).join("")}
          </div>
        </td></tr>`
      : `<tr><td style="padding:28px 24px 16px;text-align:center;font-family:system-ui,sans-serif;font-size:13px;background:#fafafa;border-top:1px solid #e4e4e7;">
          <a href="${escapeHtml(base + "/shop")}" style="color:#272B36;font-weight:600;text-decoration:none;">Shop</a>
          <span style="color:#d4d4d8;">&nbsp;·&nbsp;</span>
          <a href="${escapeHtml(base + "/bespoke")}" style="color:#272B36;font-weight:600;text-decoration:none;">Bespoke</a>
        </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(brand)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          ${logoRow}
          ${viewRow}
          ${brandBarRow}
          ${heroRow}
          ${headlineRow}
          ${introHtml}
          ${sectionRows.join("")}
          ${extraHtml}
          ${socialHtml}
          <tr>
            <td style="padding:24px 24px 12px;text-align:center;font-family:system-ui,sans-serif;font-size:11px;color:#a1a1aa;line-height:1.5;">
              Copyright © ${year} ${escapeHtml(brand)}<br/>
              All rights reserved.
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 28px;text-align:center;font-family:system-ui,sans-serif;font-size:11px;color:#a1a1aa;line-height:1.5;">
              Want to change how you receive these emails?<br/>
              You can update your preferences or unsubscribe using the link in your email client.
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;font-family:system-ui,sans-serif;max-width:560px;text-align:center;line-height:1.5;">
          You joined our mailing list to hear from ${escapeHtml(brand)}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type ParseTemplateResult =
  | { ok: true; input: NewsletterTemplateInput }
  | { ok: false; error: string };

export function parseNewsletterTemplateFromRequest(raw: unknown): ParseTemplateResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid template payload." };
  }
  const t = raw as Record<string, unknown>;
  const headline = typeof t.headline === "string" ? t.headline.trim().slice(0, MAX_HEADLINE) : "";

  const logoImageUrl = typeof t.logoImageUrl === "string" ? t.logoImageUrl.slice(0, MAX_URL) : "";
  const viewInBrowserUrl = typeof t.viewInBrowserUrl === "string" ? t.viewInBrowserUrl : "";
  const intro = typeof t.intro === "string" ? t.intro.slice(0, MAX_INTRO) : "";
  const heroImageUrl = typeof t.heroImageUrl === "string" ? t.heroImageUrl.slice(0, MAX_URL) : "";
  const heroLinkUrl = typeof t.heroLinkUrl === "string" ? t.heroLinkUrl.slice(0, MAX_URL) : "";
  const extraFooter = typeof t.extraFooter === "string" ? t.extraFooter.slice(0, MAX_EXTRA_FOOTER) : "";
  const brandName = typeof t.brandName === "string" ? t.brandName.slice(0, 120) : "";

  const sectionsList = Array.isArray(t.sections) ? t.sections : [];
  const sections: NewsletterSectionInput[] = [];
  for (const item of sectionsList.slice(0, MAX_SECTIONS)) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const imageUrl = typeof s.imageUrl === "string" ? s.imageUrl.slice(0, MAX_URL) : "";
    const imageLinkUrl = typeof s.imageLinkUrl === "string" ? s.imageLinkUrl.slice(0, MAX_URL) : "";
    const body = typeof s.body === "string" ? s.body.slice(0, MAX_SECTION_BODY) : "";
    sections.push({ imageUrl, imageLinkUrl, body });
  }

  if (sections.length === 0) {
    sections.push({ imageUrl: "", imageLinkUrl: "", body: "" });
  }

  let socialLinks: NewsletterSocialInput[] = [];
  if (Array.isArray(t.socialLinks)) {
    for (const item of t.socialLinks.slice(0, 6)) {
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      const label = typeof s.label === "string" ? s.label.slice(0, MAX_LABEL) : "";
      const url = typeof s.url === "string" ? s.url.slice(0, MAX_URL) : "";
      const iconUrl = typeof s.iconUrl === "string" ? s.iconUrl.slice(0, MAX_URL) : "";
      if (label.trim() && url.trim()) socialLinks.push({ label, url, iconUrl: iconUrl.trim() || undefined });
    }
  }

  const input: NewsletterTemplateInput = {
    logoImageUrl: logoImageUrl.trim() || undefined,
    viewInBrowserUrl: viewInBrowserUrl.trim() || undefined,
    headline,
    intro: intro.trim() || undefined,
    heroImageUrl: heroImageUrl.trim() || undefined,
    heroLinkUrl: heroLinkUrl.trim() || undefined,
    sections,
    extraFooter: extraFooter.trim() || undefined,
    socialLinks: socialLinks.length ? socialLinks : undefined,
    brandName: brandName.trim() || undefined,
  };

  const hasContent =
    !!safeHttpUrl(input.logoImageUrl) ||
    headline.length > 0 ||
    !!input.intro?.trim() ||
    !!safeHttpUrl(input.heroImageUrl) ||
    input.sections.some((s) => safeHttpUrl(s.imageUrl) || s.body?.trim()) ||
    !!input.extraFooter?.trim();

  if (!hasContent) {
    return {
      ok: false,
      error: "Add a logo, headline, intro, hero or section images/text, or footer details.",
    };
  }

  return { ok: true, input };
}

/**
 * Wrap plain text (paragraphs separated by blank lines) in a minimal responsive layout.
 */
export function wrapSimpleNewsletterHtml(body: string, shopUrl?: string): string {
  const base = (shopUrl || process.env.NEWSLETTER_SHOP_URL || DEFAULT_SHOP).replace(/\/$/, "");
  const chunks = body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const blocks = chunks
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#27272a;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>JOEY THE BRAND</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:28px 28px 8px;background:#272B36;color:#ffffff;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:system-ui,sans-serif;">
              JOEY THE BRAND
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 32px;">
              ${blocks}
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#71717a;font-family:system-ui,sans-serif;">
                <a href="${escapeHtml(base + "/shop")}" style="color:#272B36;font-weight:600;">Shop new arrivals</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(base + "/bespoke")}" style="color:#272B36;">Bespoke</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;font-family:system-ui,sans-serif;max-width:560px;">
          You received this because you joined our list. Use the unsubscribe link in your email app if you no longer wish to hear from us.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
