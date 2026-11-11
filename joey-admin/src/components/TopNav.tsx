"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, LogOut, Menu, Settings, X, Pencil, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import { compressImageIfNeeded } from "@/lib/compressImageClient";
import { uploadSiteAsset } from "@/lib/uploadSiteAsset";
import { adminPillClass, adminPillTrackClass } from "@/lib/adminChrome";

 type NavItem = {
   label: string;
   href: string;
   badge?: number;
 };

 function ProfilePhoto({ url, initials }: { url?: string; initials: string }) {
   const [failed, setFailed] = useState(false);
   useEffect(() => {
     setFailed(false);
   }, [url]);
   if (!url || failed) {
     return <span>{initials || "AD"}</span>;
   }
   return (
     // eslint-disable-next-line @next/next/no-img-element
     <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
   );
 }

 function isActivePath(pathname: string, href: string): boolean {
   if (href === "/") return pathname === "/";
   return pathname === href || pathname.startsWith(`${href}/`);
 }

 export function TopNav() {
   const pathname = usePathname();
   const [processingOrdersCount, setProcessingOrdersCount] = useState(0);
   const [pendingConsultationsCount, setPendingConsultationsCount] = useState(0);
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
  const [profilePassword, setProfilePassword] = useState("");
  const [showProfilePassword, setShowProfilePassword] = useState(false);
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
    setProfilePassword("");
    setShowProfilePassword(false);
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
       { label: "Overview", href: "/" },
       { label: "Products", href: "/products" },
       { label: "Orders", href: "/orders", badge: processingOrdersCount || undefined },
       {
         label: "Consultations",
         href: "/content/consultations",
         badge: pendingConsultationsCount || undefined,
       },
       { label: "Website", href: "/users" },
     ],
     [pendingConsultationsCount, processingOrdersCount],
   );

   const isNavActive = (item: NavItem) => {
     if (item.label === "Website") {
       return (
         pathname === "/users" ||
         pathname.startsWith("/users/") ||
         pathname.startsWith("/promotions") ||
         pathname.startsWith("/content/app-pages")
       );
     }
     return isActivePath(pathname, item.href);
   };

   const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");
   const storefrontUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.joeythebrand.com").replace(/\/+$/, "");
   const today = (() => {
     const d = new Date();
     return {
       day: d.toLocaleDateString(undefined, { day: "2-digit" }),
       weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
       month: d.toLocaleDateString(undefined, { month: "long" }),
     };
   })();

  const pillClass = (active: boolean) =>
    `relative inline-flex items-center gap-2 ${adminPillClass(active, "md")}`;

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-[#b6b7ba]/50 bg-[#f5f1eb]/95 backdrop-blur-md">
        <header className="px-3 sm:px-5 md:px-8">
          <div className="flex min-h-[4.5rem] w-full min-w-0 items-center justify-between gap-3 py-3">
            <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="JOEY studio overview">
              <span className="inline-flex items-center rounded-full border border-[#b6b7ba] bg-white px-3 py-1.5 sm:px-4 sm:py-2">
                <Image
                  src="/white-logo.png"
                  alt="JOEY THE BRAND"
                  width={560}
                  height={112}
                  className="h-7 w-auto max-w-[9.5rem] object-contain invert sm:h-8 sm:max-w-[11rem]"
                  priority
                  sizes="11rem"
                />
              </span>
              <span className="hidden max-w-[4.5rem] text-[7px] font-semibold uppercase leading-tight tracking-[0.22em] text-[#1c1e22]/45 sm:block">
                The studio
              </span>
            </Link>

            <nav
              className="hidden min-w-0 flex-1 items-center justify-center lg:flex"
              aria-label="Studio navigation"
            >
              <div className={adminPillTrackClass}>
                {nav.map((item) => {
                  const active = isNavActive(item);
                  return (
                    <Link key={item.href} href={item.href} className={pillClass(active)}>
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
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/settings"
                title="Settings"
                aria-label="Settings"
                aria-current={settingsActive ? "page" : undefined}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#b6b7ba] px-3 text-sm font-semibold transition ${
                  settingsActive ? "bg-[#1c1e22] text-[#f5f1eb]" : "bg-white text-[#1c1e22]/75 hover:bg-[#ebe8e2]"
                }`}
              >
                <Settings className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-bold text-[#1c1e22] ring-1 ring-[#b6b7ba]"
                aria-label="Open profile"
              >
                {userLabel ? (
                  <ProfilePhoto url={userLabel.avatarUrl} initials={userLabel.initials} />
                ) : (
                  <span className="opacity-40">AD</span>
                )}
              </button>

              <button
                type="button"
                aria-label="Sign out"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  try {
                    await supabase.auth.signOut();
                    try {
                      localStorage.removeItem("joey_admin_user_label_v1");
                    } catch {
                      /* ignore */
                    }
                    setUserLabel(null);
                  } finally {
                    setSigningOut(false);
                  }
                }}
                className="hidden h-11 w-11 items-center justify-center rounded-full border border-[#b6b7ba] bg-white text-[#1c1e22]/75 hover:bg-[#ebe8e2] sm:inline-flex"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>

              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#b6b7ba] bg-white text-[#1c1e22] lg:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#b6b7ba]/60 py-3 sm:mx-5 md:mx-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold tracking-wide text-[#1c1e22]/50">
                {userLabel?.name || "Admin"},
              </p>
              <p className="text-xl font-medium tracking-tight text-[#1c1e22] sm:text-2xl">Welcome back</p>
            </div>
            <time className="hidden items-center gap-2.5 sm:flex" dateTime={new Date().toISOString().slice(0, 10)}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#1c1e22] text-sm font-semibold text-[#f5f1eb]">
                {today.day}
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-[#1c1e22]">{today.weekday}</span>
                <span className="block text-xs text-[#1c1e22]/55">{today.month}</span>
              </span>
            </time>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#b6b7ba] bg-white px-3 py-2 text-xs font-semibold text-[#1c1e22]/80 hover:bg-[#ebe8e2]"
            >
              View storefront
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => {
                dataStore.notify();
                toast.success("Database refreshed");
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#b6b7ba] bg-white text-[#1c1e22]/70 hover:bg-[#ebe8e2]"
              aria-label="Refresh data"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden" id="admin-mobile-nav" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-[#b6b7ba] bg-[#f5f1eb]">
            <div className="flex items-center justify-between border-b border-[#b6b7ba]/70 px-4 py-4">
              <span className="text-sm font-semibold text-[#1c1e22]">Menu</span>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#b6b7ba] bg-white text-[#1c1e22]"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Studio navigation">
              <div className="space-y-1">
                {nav.map((item) => {
                  const active = isNavActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
                        active ? "bg-[#1c1e22] text-[#f5f1eb]" : "text-[#1c1e22]/85 hover:bg-white"
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
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className={`mt-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                  settingsActive ? "bg-[#1c1e22] text-[#f5f1eb]" : "text-[#1c1e22]/85 hover:bg-white"
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
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
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#b6b7ba] bg-white shadow-[0_26px_90px_rgba(28,30,34,0.18)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#b6b7ba]/60 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-[#1c1e22]">Profile</h2>
              <p className="mt-1 text-sm text-[#1c1e22]/60">Update your name and profile picture.</p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-[#f5f1eb] ring-1 ring-[#b6b7ba]">
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#1c1e22]/70">
                    <ProfilePhoto url={profileAvatarUrl} initials={userLabel?.initials || "AD"} />
                  </div>
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
                      toast.error(err instanceof Error ? err.message : "Could not upload that photo.");
                    } finally {
                      setProfileUploading(false);
                    }
                  }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={profileUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#b6b7ba] bg-[#f5f1eb] px-4 py-2.5 text-sm font-semibold text-[#1c1e22]/80 transition hover:bg-[#ebe8e2] disabled:opacity-60"
                  >
                    {profileUploading ? "Uploading…" : (
                      <>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </>
                    )}
                  </button>
                  {profileAvatarUrl ? (
                    <button
                      type="button"
                      disabled={profileUploading}
                      onClick={() => setProfileAvatarUrl("")}
                      aria-label="Remove photo"
                      className="inline-flex items-center justify-center rounded-2xl border border-[#b6b7ba] bg-[#f5f1eb] p-2.5 text-[#1c1e22]/70 transition hover:bg-[#ebe8e2] hover:text-red-600 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1e22]/80">Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2 w-full rounded-2xl border border-[#b6b7ba] bg-[#f5f1eb] px-4 py-3 text-sm text-[#1c1e22] placeholder:text-[#1c1e22]/40 outline-none focus:border-[#1c1e22]/40 focus:ring-2 focus:ring-[#b6b7ba]/50"
                />
                
                <label className="mt-4 block text-sm font-semibold text-[#1c1e22]/80">Change Password</label>
                <div className="relative mt-2">
                  <input
                    type={showProfilePassword ? "text" : "password"}
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-[#b6b7ba] bg-[#f5f1eb] py-3 pl-4 pr-12 text-sm text-[#1c1e22] placeholder:text-[#1c1e22]/40 outline-none focus:border-[#1c1e22]/40 focus:ring-2 focus:ring-[#b6b7ba]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfilePassword((v) => !v)}
                    aria-label={showProfilePassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#1c1e22]/55 transition hover:bg-white hover:text-[#1c1e22]"
                  >
                    {showProfilePassword ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
                  </button>
                </div>
                
                <p className="mt-4 text-xs text-[#1c1e22]/50">{userLabel?.email || ""}</p>
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
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#b6b7ba] bg-[#f5f1eb] px-4 py-2.5 text-sm font-semibold text-[#1c1e22]/75 transition hover:bg-[#ebe8e2] hover:text-[#1c1e22] disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#b6b7ba]/60 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                disabled={profileSaving || signingOut}
                className="rounded-2xl border border-[#b6b7ba] bg-[#f5f1eb] px-4 py-2.5 text-sm font-semibold text-[#1c1e22]/80 transition hover:bg-[#ebe8e2] disabled:opacity-60"
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
                    
                    const updates: any = {
                      data: {
                        full_name: name,
                        avatar_url,
                      },
                    };
                    
                    if (profilePassword) {
                      if (profilePassword.length < 8) {
                        toast.error("Password must be at least 8 characters.");
                        setProfileSaving(false);
                        return;
                      }
                      updates.password = profilePassword;
                    }
                    
                    const { error } = await supabase.auth.updateUser(updates);
                    if (error) throw error;
                    
                    if (profilePassword) {
                      toast.success("Profile and password updated.");
                    } else {
                      toast.success("Profile updated.");
                    }
                    
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
                    toast.error(err instanceof Error ? err.message : "Failed to update profile.");
                  } finally {
                    setProfileSaving(false);
                  }
                }}
                className="rounded-2xl bg-[#1c1e22] px-5 py-2.5 text-sm font-semibold text-[#f5f1eb] shadow-sm transition hover:bg-[#2a2c30] disabled:opacity-60"
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
