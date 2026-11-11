"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { isPrimaryAdminEmail } from "@/lib/adminPrimary";
import ConfirmDialog from "@/components/ConfirmDialog";

type TeamMember = { email: string; userId: string | null; name: string; isPrimary: boolean };

export default function AdminTeamPanel() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editAdminOpen, setEditAdminOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [pendingDeleteEmail, setPendingDeleteEmail] = useState<string | null>(null);

  const isPrimaryAdmin = isPrimaryAdminEmail(sessionEmail);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in.");
      const res = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const out = (await res.json()) as { error?: string; members?: TeamMember[] };
      if (!res.ok) throw new Error(out.error || "Failed to load team");
      setTeamMembers(out.members ?? []);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to load team");
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const handleDeleteAdmin = async (email: string) => {
    setDeletingEmail(email);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in.");
      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const out = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(out.error || "Failed to remove");
      toast.success("Admin removed.");
      await loadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove.");
      throw err;
    } finally {
      setDeletingEmail(null);
      setPendingDeleteEmail(null);
    }
  };

  if (!isPrimaryAdmin) {
    return (
      <p className="text-sm text-[#1c1e22]/60">
        Only the primary admin can add or remove dashboard operators.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setEditAdminOpen(true);
            void loadTeam();
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#1c1e22] px-4 py-2 text-sm font-semibold text-[#f5f1eb] shadow-sm transition hover:opacity-95"
        >
          Edit admin
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
            <Users className="h-4 w-4 text-[#f5f1eb]" strokeWidth={2} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCreateUserOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#1c1e22] px-4 py-2 text-sm font-semibold text-[#f5f1eb] shadow-sm transition hover:opacity-95"
        >
          Add admin
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[#f5f1eb]">+</span>
        </button>
      </div>

      {createUserOpen ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Add admin"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateUserOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#b6b7ba]/70 bg-white shadow-[0_18px_50px_rgba(28,30,34,0.14)] ring-1 ring-[#b6b7ba]/40">
            <div className="border-b border-[#b6b7ba]/70 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-[#1c1e22]">Add admin</h2>
              <p className="mt-1 text-sm text-[#1c1e22]/60">
                Create an email + password that can sign into the admin portal.
              </p>
            </div>
            <form
              className="space-y-4 px-6 py-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const name = newUserName.trim();
                const email = newUserEmail.trim().toLowerCase();
                const password = newUserPassword;
                if (!email || !password) {
                  toast.error("Email and password are required.");
                  return;
                }
                if (password.length < 8) {
                  toast.error("Password must be at least 8 characters.");
                  return;
                }
                setCreatingUser(true);
                try {
                  const { data: sess } = await supabase.auth.getSession();
                  const token = sess.session?.access_token;
                  if (!token) throw new Error("Not signed in.");
                  const res = await fetch("/api/admin/create-user", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name, email, password }),
                  });
                  const out = (await res.json()) as { error?: string; teamSyncError?: string };
                  if (!res.ok) throw new Error(out.error || "Failed to create user");
                  toast.success("Admin account created.");
                  if (out.teamSyncError) toast.warning(out.teamSyncError);
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserPassword("");
                  setShowNewUserPassword(false);
                  setCreateUserOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to create user.");
                } finally {
                  setCreatingUser(false);
                }
              }}
            >
              <div>
                <label className="block text-sm font-semibold text-[#1c1e22]/80">Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full name"
                  className="mt-2 w-full rounded-2xl border border-[#b6b7ba]/70 bg-white px-4 py-3 text-sm text-[#1c1e22]/90 placeholder:text-[#1c1e22]/40 outline-none focus:border-[#1c1e22]/40 focus:ring-2 focus:ring-[#b6b7ba]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1c1e22]/80">Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="mt-2 w-full rounded-2xl border border-[#b6b7ba]/70 bg-white px-4 py-3 text-sm text-[#1c1e22]/90 placeholder:text-[#1c1e22]/40 outline-none focus:border-[#1c1e22]/40 focus:ring-2 focus:ring-[#b6b7ba]/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1c1e22]/80">Password</label>
                <div className="relative mt-2">
                  <input
                    type={showNewUserPassword ? "text" : "password"}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-[#b6b7ba]/70 bg-white py-3 pl-4 pr-12 text-sm text-[#1c1e22]/90 placeholder:text-[#1c1e22]/40 outline-none focus:border-[#1c1e22]/40 focus:ring-2 focus:ring-[#b6b7ba]/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword((v) => !v)}
                    aria-label={showNewUserPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#1c1e22]/55 transition hover:bg-[#f5f1eb] hover:text-[#1c1e22]/90"
                  >
                    {showNewUserPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-[#b6b7ba]/70 pt-4 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-[#b6b7ba]/70 bg-white px-4 py-2.5 text-sm font-semibold text-[#1c1e22]/80"
                  onClick={() => setCreateUserOpen(false)}
                  disabled={creatingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="rounded-2xl bg-[#1c1e22] px-5 py-2.5 text-sm font-semibold text-[#f5f1eb] disabled:opacity-60"
                >
                  {creatingUser ? "Creating…" : "Create admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editAdminOpen ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Manage dashboard admins"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditAdminOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#b6b7ba]/70 bg-white shadow-[0_18px_50px_rgba(28,30,34,0.14)] ring-1 ring-[#b6b7ba]/40">
            <div className="border-b border-[#b6b7ba]/70 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-[#1c1e22]">Dashboard admins</h2>
              <p className="mt-1 text-sm text-[#1c1e22]/60">
                Operators listed here can access the admin dashboard. Remove someone to revoke their access.
              </p>
            </div>
            <div className="max-h-[min(60vh,420px)] overflow-y-auto px-6 py-4">
              {teamLoading ? (
                <p className="text-sm text-[#1c1e22]/60">Loading…</p>
              ) : teamError ? (
                <p className="text-sm text-red-300/90">{teamError}</p>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-[#1c1e22]/60">No operators found.</p>
              ) : (
                <ul className="space-y-2">
                  {teamMembers.map((m) => (
                    <li
                      key={m.email}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#b6b7ba]/70 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#1c1e22]">{m.name}</div>
                        <div className="truncate text-xs text-[#1c1e22]/55">{m.email}</div>
                        {m.isPrimary ? (
                          <span className="mt-1 inline-block rounded-full bg-[#ebe8e2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1c1e22]/70">
                            Primary
                          </span>
                        ) : null}
                      </div>
                      {m.isPrimary ? (
                        <span className="shrink-0 text-xs text-[#1c1e22]/40">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={deletingEmail === m.email}
                          onClick={() => setPendingDeleteEmail(m.email)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          {deletingEmail === m.email ? "Removing…" : "Remove"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-[#b6b7ba]/70 px-6 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-[#b6b7ba]/70 bg-white px-4 py-2.5 text-sm font-semibold text-[#1c1e22]/80"
                  onClick={() => setEditAdminOpen(false)}
                  disabled={!!deletingEmail}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-[#b6b7ba]/70 bg-[#f5f1eb] px-4 py-2.5 text-sm font-semibold text-[#1c1e22]/90"
                  onClick={() => void loadTeam()}
                  disabled={teamLoading || !!deletingEmail}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDeleteEmail !== null}
        title="Remove admin?"
        description={
          pendingDeleteEmail ? (
            <>
              Remove <span className="font-medium text-zinc-900">{pendingDeleteEmail}</span> from dashboard access? Their login will be deleted if an account exists. This cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Remove admin"
        variant="danger"
        onCancel={() => setPendingDeleteEmail(null)}
        onConfirm={async () => {
          if (pendingDeleteEmail) await handleDeleteAdmin(pendingDeleteEmail);
        }}
      />
    </>
  );
}
