"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users } from "lucide-react";

export type UnifiedUserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  orderCount: number;
  shopConsultationCount: number;
  portfolioConsultationCount: number;
  newsletterSubscriber: boolean;
  newsletterSubscribedAt: string | null;
  joinedAt: string | null;
  hasAccount: boolean;
};

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

export default function UsersPage() {
  const [rows, setRows] = useState<UnifiedUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setError("Not signed in.");
          setIsLoading(false);
          return;
        }
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => null)) as
          | { users?: UnifiedUserRow[]; error?: string }
          | null;
        if (!res.ok) {
          setError(data?.error ?? "Could not load clan members.");
          setRows([]);
          return;
        }
        if (!cancelled) setRows(data?.users ?? []);
      } catch {
        if (!cancelled) setError("Failed to load clan members.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-zinc-900">Loading clan members…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Clan members</h1>
        <span className="text-sm text-zinc-800">{rows.length} rows</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-zinc-300" />
              <h3 className="mt-2 text-sm font-semibold text-zinc-900">No clan members yet</h3>
              <p className="mt-1 text-sm text-zinc-800">No accounts or contacts were returned.</p>
            </div>
          ) : (
            <table className="min-w-[1280px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100">
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Account
                  </th>
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Phone
                  </th>
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Orders
                  </th>
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Shop consults
                  </th>
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Portfolio consults
                  </th>
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Newsletter
                  </th>
                  <th scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Joined / first touch
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((u) => (
                  <tr key={u.id} className="transition hover:bg-white/[0.07]">
                    <td className="px-4 py-3 text-sm text-zinc-800">
                      {u.hasAccount ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-xs font-medium text-zinc-400">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-800">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-zinc-800">{u.phone}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-900">{u.orderCount}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-900">{u.shopConsultationCount}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-900">{u.portfolioConsultationCount}</td>
                    <td className="px-4 py-3 text-sm text-zinc-800">
                      {u.newsletterSubscriber ? (
                        <span title={u.newsletterSubscribedAt ?? ""}>Yes</span>
                      ) : (
                        "—"
                      )}
                      {u.newsletterSubscriber && u.newsletterSubscribedAt ? (
                        <span className="ml-1 block text-[11px] text-zinc-500">
                          {formatDt(u.newsletterSubscribedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-800">{formatDt(u.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
