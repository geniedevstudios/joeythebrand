"use client";

import AdminTeamPanel from "@/components/AdminTeamPanel";

export default function SettingsPage() {
  return (
    <div className="w-full max-w-3xl space-y-6 text-[#1c1e22]">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1c1e22]/50">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-[#1c1e22]/60">
          Manage who can sign into the JOEY studio. Edit existing operators or add a new admin.
        </p>
      </div>
      <section className="rounded-3xl border border-[#b6b7ba]/70 bg-white p-6">
        <h2 className="text-sm font-semibold text-[#1c1e22]">Dashboard admins</h2>
        <p className="mt-1 mb-5 text-sm text-[#1c1e22]/55">
          Add or remove people who can access this admin portal.
        </p>
        <AdminTeamPanel />
      </section>
    </div>
  );
}
