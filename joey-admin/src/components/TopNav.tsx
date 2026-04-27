"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import { compressImageIfNeeded } from "@/lib/compressImageClient";
import { uploadSiteAsset } from "@/lib/uploadSiteAsset";

 type NavItem = {
   label: string;
   href: string;
   badge?: number;
 };

 type DropdownItem = {
   label: string;
   href: string;
   badge?: number;
 };

 function isActivePath(pathname: string, href: string): boolean {
   if (href === "/") return pathname === "/";
   return pathname === href || pathname.startsWith(`${href}/`);
 }

 export function TopNav() {
   const pathname = usePathname();
   const [processingOrdersCount, setProcessingOrdersCount] = useState(0);
   const [pendingConsultationsCount, setPendingConsultationsCount] = useState(0);
   const [contentOpen, setContentOpen] = useState(false);
   const contentRootRef = useRef<HTMLDivElement>(null);
  const [userLabel, setUserLabel] = useState<{
    name: string;
    email: string;
    initials: string;
    avatarUrl?: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem("joey_admin_user_label_v1");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        name?: unknown;
        email?: unknown;
        initials?: unknown;
        avatarUrl?: unknown;
      };
      const name = String(parsed.name ?? "").trim();
      const email = String(parsed.email ?? "").trim();
      const initials = String(parsed.initials ?? "").trim();
      const avatarUrl = String(parsed.avatarUrl ?? "").trim();
      if (!name || !email || !initials) return null;
      return { name, email, initials, avatarUrl: avatarUrl || undefined };
    } catch {
      return null;
    }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string>("");
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

   useEffect(() => {
     const refresh = async () => {
       try {
         const [orders, consultations] = await Promise.all([
           dataStore.getOrders(),
           dataStore.getConsultationBookings(),
         ]);
         setProcessingOrdersCount(orders.filter((o) => o.status === "processing").length);
         setPendingConsultationsCount(consultations.filter((c) => c.status === "pending").length);
       } catch {
         // ignore
       }
     };
     void refresh();
     const unsub = dataStore.subscribe(refresh);
     return unsub;
   }, []);

   useEffect(() => {
    const pick = (
      u: any,
    ): { name: string; email: string; initials: string; avatarUrl?: string } | null => {
       if (!u) return null;
       const email = String(u.email || "").trim();
       const meta = (u.user_metadata || {}) as Record<string, unknown>;
       const nameRaw =
         String(meta.full_name || meta.name || meta.display_name || "").trim() ||
         String(meta.first_name || "").trim();
       const name = nameRaw || (email ? email.split("@")[0] : "Admin");
      const avatarUrl = String(meta.avatar_url || meta.avatarUrl || "").trim() || undefined;
       const initials = name
         .split(/\s+/)
         .filter(Boolean)
         .slice(0, 2)
         .map((s) => s[0]?.toUpperCase())
         .join("") || "AD";
      return { name, email, initials, avatarUrl };
     };

    supabase.auth.getUser().then(({ data }) => {
      const next = pick(data.user);
      setUserLabel(next);
      try {
        if (next) localStorage.setItem("joey_admin_user_label_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
    });
     const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const next = pick(session?.user);
      setUserLabel(next);
      try {
        if (next) localStorage.setItem("joey_admin_user_label_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
     });
     return () => sub.subscription.unsubscribe();
   }, []);

  useEffect(() => {
    if (!profileOpen) return;
    setProfileName(userLabel?.name || "");
    setProfileAvatarUrl(userLabel?.avatarUrl || "");
  }, [profileOpen, userLabel?.avatarUrl, userLabel?.name]);

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  useEffect(() => {
    if (!contentOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (contentRootRef.current && !contentRootRef.current.contains(e.target as Node)) {
        setContentOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContentOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [contentOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

   const nav: NavItem[] = useMemo(
     () => [
       { label: "Dashboard", href: "/" },
       { label: "Products", href: "/products" },
       { label: "Orders", href: "/orders", badge: processingOrdersCount || undefined },
       { label: "Promotions", href: "/promotions" },
       { label: "Clan", href: "/users" },
     ],
     [processingOrdersCount],
   );

   const contentItems: DropdownItem[] = useMemo(
     () => [
       { label: "Site Content", href: "/content" },
       { label: "App pages", href: "/content/app-pages" },
       {
         label: "Consultations",
         href: "/content/consultations",
         badge: pendingConsultationsCount || undefined,
       },
       { label: "Newsletter", href: "/content/newsletter" },
     ],
     [pendingConsultationsCount],
   );

   const contentActive =
     pathname === "/content" ||
     pathname.startsWith("/content/app-pages") ||
     pathname.startsWith("/content/consultations") ||
     pathname.startsWith("/content/newsletter");

  return (
    <>
      <header className="relative z-30 border-b border-white/10 bg-[#0b0d10] px-3 sm:px-5 md:px-6">
        <div className="flex min-h-24 w-full min-w-0 items-center justify-between gap-2 py-2 sm:gap-3 lg:justify-start lg:gap-4">
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex shrink-0 items-center">
              <Image
                src="/white-logo.png"
                alt="JOEY THE BRAND"
                width={560}
                height={112}
                className="h-14 w-auto max-w-[9rem] object-contain opacity-95 sm:h-16 sm:max-w-[12rem] md:h-[4.5rem] md:max-w-[15rem] lg:h-20 lg:max-w-[22rem] xl:max-w-[26rem]"
                priority
                sizes="(max-width: 640px) 9rem, (max-width: 1024px) 15rem, 26rem"
              />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="truncate text-sm font-semibold tracking-wide text-white">ADMIN</div>
              <div className="truncate text-[11px] font-medium text-white/55">Management portal</div>
            </div>
          </div>

          <nav
            className="hidden min-h-[3rem] min-w-0 flex-1 items-center justify-center lg:flex"
            aria-label="Admin navigation"
          >
            <div className="flex w-max min-w-0 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              {nav.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border border-[#d6ff2a]/60 bg-white/[0.02] text-[#d6ff2a] shadow-[0_0_0_1px_rgba(214,255,42,0.15)]"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                    {item.badge ? (
                      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-1 ring-white/20">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}

              <div className="relative" ref={contentRootRef}>
                <button
                  type="button"
                  onClick={() => setContentOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={contentOpen}
                  className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    contentActive
                      ? "border border-[#d6ff2a]/60 bg-white/[0.02] text-[#d6ff2a] shadow-[0_0_0_1px_rgba(214,255,42,0.15)]"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  Site
                  <span className="text-white/40" aria-hidden>
                    ▾
                  </span>
                </button>

                {contentOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d10] shadow-[0_26px_90px_rgba(0,0,0,0.55)]"
                  >
                    <div className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      Site Content
                    </div>
                    <div className="px-2 pb-2">
                      {contentItems.map((it) => {
                        const active = isActivePath(pathname, it.href);
                        return (
                          <Link
                            key={it.href}
                            href={it.href}
                            role="menuitem"
                            onClick={() => setContentOpen(false)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              active
                                ? "bg-white/6 text-white"
                                : "text-white/75 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <span>{it.label}</span>
                            {it.badge ? (
                              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-1 ring-white/20">
                                {it.badge}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="admin-mobile-nav"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="group inline-flex items-center gap-3 rounded-full px-2 py-1.5 transition hover:bg-white/5"
              aria-label="Open profile settings"
              aria-busy={userLabel ? undefined : true}
            >
              <div className="hidden text-right sm:block">
                {userLabel ? (
                  <>
                    <div className="text-sm font-semibold text-white">{userLabel.name}</div>
                    <div className="text-[11px] font-medium text-white/55">{userLabel.email}</div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 rounded bg-white/10" />
                    <div className="h-3 w-40 rounded bg-white/7" />
                  </div>
                )}
              </div>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-bold text-white ring-1 ring-white/10">
                {userLabel?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userLabel.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : userLabel ? (
                  <span>{userLabel.initials}</span>
                ) : (
                  <span className="opacity-0">AD</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden" id="admin-mobile-nav" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#0b0d10] shadow-[0_26px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="text-sm font-semibold tracking-wide text-white">Menu</span>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white hover:bg-white/5"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
              <div className="space-y-1">
                {nav.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
                        active ? "bg-white/[0.08] text-[#d6ff2a]" : "text-white/85 hover:bg-white/[0.06]"
                      }`}
                    >
                      {item.label}
                      {item.badge ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
              <p className="mb-2 mt-6 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Site</p>
              <div className="space-y-1">
                {contentItems.map((it) => {
                  const active = isActivePath(pathname, it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
                        active ? "bg-white/[0.08] text-[#d6ff2a]" : "text-white/85 hover:bg-white/[0.06]"
                      }`}
                    >
                      {it.label}
                      {it.badge ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                          {it.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      ) : null}

      {profileOpen ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProfileOpen(false);
          }}
        >
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            aria-hidden
            onClick={() => setProfileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10] shadow-[0_26px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/5"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-white">Profile</h2>
              <p className="mt-1 text-sm text-white/60">Update your name and profile picture.</p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                  {profileAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/70">
                      {userLabel?.initials || "AD"}
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setProfileUploading(true);
                    try {
                      const prepared = await compressImageIfNeeded(f, 512, 0.86);
                      const { data } = await supabase.auth.getUser();
                      const uid = data.user?.id || "me";
                      const url = await uploadSiteAsset(prepared, `admin/avatars/${uid}`);
                      setProfileAvatarUrl(url);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setProfileUploading(false);
                    }
                  }}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={profileUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] disabled:opacity-60"
                  >
                    {profileUploading ? "Uploading…" : "Change photo"}
                  </button>
                  {profileAvatarUrl ? (
                    <button
                      type="button"
                      disabled={profileUploading}
                      onClick={() => setProfileAvatarUrl("")}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06] disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80">Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-[#d6ff2a]/50 focus:ring-2 focus:ring-[#d6ff2a]/20"
                />
                <p className="mt-2 text-xs text-white/50">{userLabel?.email || ""}</p>
                <button
                  type="button"
                  aria-label="Sign out of admin"
                  disabled={signingOut || profileSaving}
                  onClick={async () => {
                    setSigningOut(true);
                    try {
                      await supabase.auth.signOut();
                      try {
                        localStorage.removeItem("joey_admin_user_label_v1");
                      } catch {
                        // ignore
                      }
                      setUserLabel(null);
                      setProfileOpen(false);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setSigningOut(false);
                    }
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                disabled={profileSaving || signingOut}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={profileSaving || signingOut}
                onClick={async () => {
                  setProfileSaving(true);
                  try {
                    const name = profileName.trim();
                    const avatar_url = profileAvatarUrl.trim();
                    const { error } = await supabase.auth.updateUser({
                      data: {
                        full_name: name,
                        avatar_url,
                      },
                    });
                    if (error) throw error;
                    setProfileOpen(false);

                    const { data } = await supabase.auth.getUser();
                    const u: any = data.user;
                    const email = String(u?.email || "").trim();
                    const meta = (u?.user_metadata || {}) as Record<string, unknown>;
                    const nameRaw =
                      String(meta.full_name || meta.name || meta.display_name || "").trim() ||
                      String(meta.first_name || "").trim();
                    const finalName = nameRaw || (email ? email.split("@")[0] : "Admin");
                    const initials = finalName
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join("") || "AD";
                    const nextAvatar = String(meta.avatar_url || meta.avatarUrl || "").trim() || undefined;
                    setUserLabel({ name: finalName, email, initials, avatarUrl: nextAvatar });
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setProfileSaving(false);
                  }
                }}
                className="rounded-2xl bg-[#d6ff2a] px-5 py-2.5 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(214,255,42,0.14)] transition hover:opacity-95 disabled:opacity-60"
              >
                {profileSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
 }
