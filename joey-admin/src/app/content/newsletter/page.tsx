"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";
import AssetUrlField from "@/components/AssetUrlField";
import { toast } from "sonner";
import {
  buildNewsletterTemplateHtml,
  wrapSimpleNewsletterHtml,
  parseNewsletterTemplateFromRequest,
  DEFAULT_NEWSLETTER_SHOP_URL,
  type NewsletterTemplateInput,
} from "@/lib/newsletterHtml";

type EditorMode = "template" | "simple" | "html";

type SectionState = { imageUrl: string; imageLinkUrl: string; body: string };
type SocialState = { label: string; url: string; iconUrl: string };

type TemplateEditorState = {
  logoImageUrl: string;
  viewInBrowserUrl: string;
  headline: string;
  intro: string;
  heroImageUrl: string;
  heroLinkUrl: string;
  sections: SectionState[];
  extraFooter: string;
  brandName: string;
  socialLinks: SocialState[];
};

/** Supabase public folder for footer icons (set after `npm run upload-newsletter-social-icons`). */
function defaultBundledSocialIconUrl(file: string): string {
  const base = process.env.NEXT_PUBLIC_NEWSLETTER_SOCIAL_ICONS_BASE?.trim().replace(/\/$/, "");
  return base ? `${base}/${file}` : `/newsletter-social/${file}`;
}

function createInitialTemplate(): TemplateEditorState {
  return {
    logoImageUrl: "",
    viewInBrowserUrl: "",
    headline: "",
    intro: "",
    heroImageUrl: "",
    heroLinkUrl: "",
    sections: [
      { imageUrl: "", imageLinkUrl: "", body: "" },
      { imageUrl: "", imageLinkUrl: "", body: "" },
    ],
    extraFooter: "",
    brandName: "JOEY THE BRAND",
    socialLinks: [
      {
        label: "Instagram",
        url: "https://www.instagram.com/joey_thebrand/",
        iconUrl: defaultBundledSocialIconUrl("instagram.png"),
      },
      {
        label: "Facebook",
        url: "https://www.facebook.com/",
        iconUrl: defaultBundledSocialIconUrl("facebook.png"),
      },
      {
        label: "X (Twitter)",
        url: "https://x.com/",
        iconUrl: defaultBundledSocialIconUrl("twitter.png"),
      },
      {
        label: "Website",
        url: DEFAULT_NEWSLETTER_SHOP_URL,
        iconUrl: defaultBundledSocialIconUrl("joey-website.png"),
      },
    ],
  };
}

function toPayloadTemplate(t: TemplateEditorState): Record<string, unknown> {
  return {
    logoImageUrl: t.logoImageUrl,
    viewInBrowserUrl: t.viewInBrowserUrl,
    headline: t.headline,
    intro: t.intro,
    heroImageUrl: t.heroImageUrl,
    heroLinkUrl: t.heroLinkUrl,
    sections: t.sections.map((s) => ({
      imageUrl: s.imageUrl,
      imageLinkUrl: s.imageLinkUrl,
      body: s.body,
    })),
    extraFooter: t.extraFooter,
    brandName: t.brandName,
    socialLinks: t.socialLinks
      .filter((l) => l.label.trim() && l.url.trim())
      .map((l) => ({
        label: l.label.trim(),
        url: l.url.trim(),
        iconUrl: (l.iconUrl ?? "").trim() || undefined,
      })),
  };
}

function templateForBuild(t: TemplateEditorState): NewsletterTemplateInput {
  const parsed = parseNewsletterTemplateFromRequest(toPayloadTemplate(t));
  if (!parsed.ok) {
    return {
      headline: t.headline || "Preview",
      intro: "Add content to see a full preview.",
      sections: [{ body: parsed.error }],
      brandName: t.brandName || undefined,
    };
  }
  return parsed.input;
}

export default function NewsletterPage() {
  const [editorMode, setEditorMode] = useState<EditorMode>("template");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [simpleMode, setSimpleMode] = useState(true);
  const [tpl, setTpl] = useState<TemplateEditorState>(() => createInitialTemplate());

  /** Upgrade root-relative icon paths to Supabase when env is set (e.g. opened page before .env.local was updated). */
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_NEWSLETTER_SOCIAL_ICONS_BASE?.trim().replace(/\/$/, "");
    if (!base) return;
    setTpl((prev) => {
      let changed = false;
      const socialLinks = prev.socialLinks.map((s) => {
        if (s.iconUrl.startsWith("http")) return s;
        const m = s.iconUrl.match(/^\/newsletter-social\/(.+)$/);
        if (!m) return s;
        changed = true;
        return { ...s, iconUrl: `${base}/${m[1]}` };
      });
      if (!changed) return prev;
      return { ...prev, socialLinks };
    });
  }, []);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const resetMessages = () => {
    setStatusMsg("");
    setErrorMsg("");
  };

  const previewHtml = useMemo(() => {
    if (editorMode === "template") {
      return buildNewsletterTemplateHtml(templateForBuild(tpl), DEFAULT_NEWSLETTER_SHOP_URL, {
        useRootRelativeBundledIcons: true,
      });
    }
    if (editorMode === "simple") {
      const plain = body.trim();
      if (!plain) {
        return buildNewsletterTemplateHtml({
          headline: "Preview",
          sections: [{ body: "Type your message to preview the simple layout." }],
        });
      }
      if (simpleMode) return wrapSimpleNewsletterHtml(plain, DEFAULT_NEWSLETTER_SHOP_URL);
      return plain.includes("<html") || plain.includes("<!DOCTYPE") ? plain : `<div class="p-4">${plain}</div>`;
    }
    const h = body.trim();
    if (!h) return "<p class=\"p-4 text-zinc-800\">Paste HTML to preview.</p>";
    return h.includes("<html") || h.includes("<!DOCTYPE") ? h : `<div class="p-4">${h}</div>`;
  }, [editorMode, body, tpl, simpleMode]);

  const sendNewsletter = async () => {
    resetMessages();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your session expired. Sign in again.");
      }

      const payload: Record<string, unknown> = {
        subject: subject.trim(),
        previewText: previewText.trim(),
        editorMode,
      };

      if (editorMode === "template") {
        payload.template = toPayloadTemplate(tpl);
      } else {
        payload.body = body;
        payload.simpleMode = editorMode === "simple" ? simpleMode : false;
      }

      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        campaignId?: number;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setConfirmOpen(false);
      setSubject("");
      setPreviewText("");
      setBody("");
      setTpl(createInitialTemplate());
      const summary =
        data.campaignId != null
          ? `${data.message ?? "Sent."} Brevo campaign #${data.campaignId}.`
          : (data.message ?? "Newsletter sent.");
      setStatusMsg(summary);
      toast.success(summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send newsletter.";
      toast.error(msg);
      throw err;
    }
  };

  const openConfirm = () => {
    resetMessages();
    if (!subject.trim()) {
      setErrorMsg("Add a subject.");
      return;
    }
    if (editorMode === "template") {
      const parsed = parseNewsletterTemplateFromRequest(toPayloadTemplate(tpl));
      if (!parsed.ok) {
        setErrorMsg(parsed.error);
        return;
      }
    } else if (editorMode === "simple" || editorMode === "html") {
      if (!body.trim()) {
        setErrorMsg(editorMode === "html" ? "Add HTML body." : "Add a message body.");
        return;
      }
    }
    setConfirmOpen(true);
  };

  const updateSection = (i: number, patch: Partial<SectionState>) => {
    setTpl((prev) => {
      const sections = prev.sections.map((s, j) => (j === i ? { ...s, ...patch } : s));
      return { ...prev, sections };
    });
  };

  const addSection = () => {
    setTpl((prev) =>
      prev.sections.length >= 8
        ? prev
        : {
            ...prev,
            sections: [...prev.sections, { imageUrl: "", imageLinkUrl: "", body: "" }],
          },
    );
  };

  const removeSection = (i: number) => {
    setTpl((prev) =>
      prev.sections.length <= 1
        ? prev
        : { ...prev, sections: prev.sections.filter((_, j) => j !== i) },
    );
  };

  const updateSocial = (i: number, patch: Partial<SocialState>) => {
    setTpl((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  };

  return (
    <div className="w-full max-w-none space-y-6 pb-12">
      <div>
        <Link 
          href="/content" 
          className="inline-flex items-center gap-1.5 text-sm mb-4 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Site Content
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Send list update</h1>
      </div>

      {statusMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMsg}</div>
      )}

      <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        {(
          [
            ["template", "Visual layout"],
            ["simple", "Simple text"],
            ["html", "Raw HTML"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setEditorMode(id);
              resetMessages();
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              editorMode === id ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">Subject line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. New collection — Easter glow"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Preview text <span className="font-normal normal-case text-zinc-700">(optional)</span>
              </label>
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Inbox snippet under the subject"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                maxLength={255}
              />
            </div>
          </div>

          {editorMode === "template" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-8">
              <p className="text-sm text-zinc-800">
                Order in the email: <strong className="text-zinc-800">Logo</strong> →{" "}
                <strong className="text-zinc-800">View in browser</strong> → optional{" "}
                <strong className="text-zinc-800">hero</strong> (collection / flyer) → headline &amp; copy → footer with
                social icons and legal text. For a video, upload a <em>poster</em> image and set the link to YouTube or
                Instagram.
              </p>

              <AssetUrlField
                label="Logo (top of email)"
                value={tpl.logoImageUrl}
                onChange={(url) => setTpl((p) => ({ ...p, logoImageUrl: url }))}
                uploadFolder="newsletter/logo"
                accept="image/*"
                placeholder="Upload your app logo (PNG/SVG as PNG recommended)"
              />

              <div>
                <label className="block text-sm font-medium text-zinc-700">View this email in your browser — URL</label>
                <input
                  type="url"
                  value={tpl.viewInBrowserUrl}
                  onChange={(e) => setTpl((p) => ({ ...p, viewInBrowserUrl: e.target.value }))}
                  placeholder="https://yoursite.com/newsletter/april (hosted copy of this email)"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm"
                />
              </div>

              <div className="border-t border-zinc-100 pt-6 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900">Hero — collection, flyer, or banner</h3>
                <AssetUrlField
                  label="Hero image"
                  value={tpl.heroImageUrl}
                  onChange={(url) => setTpl((p) => ({ ...p, heroImageUrl: url }))}
                  uploadFolder="newsletter/hero"
                  accept="image/*"
                />
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Hero link (optional)</label>
                  <input
                    type="url"
                    value={tpl.heroLinkUrl}
                    onChange={(e) => setTpl((p) => ({ ...p, heroLinkUrl: e.target.value }))}
                    placeholder="Shop collection, event page, or video URL"
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6 space-y-3">
                <label className="block text-sm font-medium text-zinc-700">Headline (main title under hero)</label>
                <input
                  type="text"
                  value={tpl.headline}
                  onChange={(e) => setTpl((p) => ({ ...p, headline: e.target.value }))}
                  placeholder="EGG-STRA GLOW THIS EASTER!"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm"
                  maxLength={240}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Intro / lead paragraph</label>
                <textarea
                  value={tpl.intro}
                  onChange={(e) => setTpl((p) => ({ ...p, intro: e.target.value }))}
                  rows={4}
                  placeholder="Opening line — separate extra paragraphs with a blank line."
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm"
                />
              </div>

              <div className="space-y-6 border-t border-zinc-100 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">More images &amp; text blocks</h3>
                  <button
                    type="button"
                    onClick={addSection}
                    disabled={tpl.sections.length >= 8}
                    className="text-sm font-medium text-zinc-700 underline decoration-zinc-300 disabled:opacity-40"
                  >
                    Add block
                  </button>
                </div>
                {tpl.sections.map((sec, i) => (
                  <div key={i} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-800">Block {i + 1}</span>
                      {tpl.sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(i)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <AssetUrlField
                      label="Image (optional)"
                      value={sec.imageUrl}
                      onChange={(url) => updateSection(i, { imageUrl: url })}
                      uploadFolder={`newsletter/block-${i}`}
                      accept="image/*"
                    />
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Image link (optional)</label>
                      <input
                        type="url"
                        value={sec.imageLinkUrl}
                        onChange={(e) => updateSection(i, { imageLinkUrl: e.target.value })}
                        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm"
                        placeholder="Where tapping the image should go"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Text</label>
                      <textarea
                        value={sec.body}
                        onChange={(e) => updateSection(i, { body: e.target.value })}
                        rows={4}
                        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm"
                        placeholder="Paragraphs — blank line between paragraphs."
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-100 pt-6">
                <label className="block text-sm font-medium text-zinc-700">Extra footer copy (optional)</label>
                <p className="mt-1 text-xs text-zinc-700">
                  Booking, payment, policies — separate paragraphs with a blank line.
                </p>
                <textarea
                  value={tpl.extraFooter}
                  onChange={(e) => setTpl((p) => ({ ...p, extraFooter: e.target.value }))}
                  rows={8}
                  className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm font-mono text-[13px]"
                />
              </div>

              <div className="border-t border-zinc-100 pt-6 space-y-4">
                {tpl.socialLinks.map((soc, i) => (
                  <div key={i} className="grid gap-3 rounded-lg border border-zinc-100 p-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-zinc-600">Label</label>
                      <input
                        value={soc.label}
                        onChange={(e) => updateSocial(i, { label: e.target.value })}
                        className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-600">URL</label>
                      <input
                        type="url"
                        value={soc.url}
                        onChange={(e) => updateSocial(i, { url: e.target.value })}
                        className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <AssetUrlField
                        label="Icon image (optional)"
                        value={soc.iconUrl}
                        onChange={(url) => updateSocial(i, { iconUrl: url })}
                        uploadFolder={`newsletter/social-${i}`}
                        accept="image/*"
                        placeholder="32×32 PNG recommended"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Copyright name</label>
                <input
                  value={tpl.brandName}
                  onChange={(e) => setTpl((p) => ({ ...p, brandName: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm"
                />
              </div>
            </div>
          )}

          {editorMode === "simple" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={simpleMode}
                  onChange={(e) => setSimpleMode(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300"
                />
                <span className="text-sm text-zinc-700">
                  <strong>Simple layout</strong> — plain text; we wrap it in the compact branded template.
                </span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm shadow-sm"
                placeholder="Paragraphs separated by a blank line."
              />
            </div>
          )}

          {editorMode === "html" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs shadow-sm"
                placeholder="Full HTML document or body fragment."
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openConfirm}
              className="rounded-md bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
            >
              Send to list
            </button>
            <p className="text-xs text-zinc-700">Sends immediately to everyone subscribed to your newsletter.</p>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 space-y-2">
          <h2 className="text-sm font-semibold text-zinc-800">Email preview</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-inner">
            <div
              className="max-h-[min(80vh,900px)] overflow-auto bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Send newsletter now?"
        confirmLabel="Send campaign"
        description={
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed text-zinc-800">
              This sends to <strong className="font-semibold text-zinc-950">everyone</strong> subscribed to your
              newsletter.
            </p>
            <div className="rounded-lg border-2 border-zinc-300 bg-zinc-100 px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Subject line</p>
              <p className="mt-2 break-words text-lg font-semibold leading-snug text-zinc-950">
                {subject.trim() || "—"}
              </p>
            </div>
          </div>
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={sendNewsletter}
      />
    </div>
  );
}
