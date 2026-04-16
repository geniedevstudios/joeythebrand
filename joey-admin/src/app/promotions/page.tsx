"use client";

import { useEffect, useState, useCallback } from "react";
import { dataStore } from "@/lib/dataStore";
import type { PromotionCode } from "@/lib/types";
import { Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getPromotions();
      setPromotions(data);
    } catch (err) {
      console.error("Failed to load promotions:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = dataStore.subscribe(load);
    return unsubscribe;
  }, [load]);

  const handleCreatePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsSaving(true);
    setError("");

    const formData = new FormData(form);
    const code = formData.get("code") as string;
    const percentage = Number(formData.get("percentage"));
    const active = formData.get("active") === "on";

    if (!code || isNaN(percentage)) {
      setError("Please fill in all fields.");
      setIsSaving(false);
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    if (promotions.some((p) => p.code.trim().toUpperCase() === normalizedCode)) {
      setError("That discount code already exists. Use a different code.");
      setIsSaving(false);
      return;
    }

    try {
      await dataStore.addPromotion({ code: normalizedCode, percentage, active });
      form.reset();
      await load();
      toast.success(`Promotion ${normalizedCode} created.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create promotion.";
      setError(msg);
      toast.error(msg);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (promo: PromotionCode) => {
    try {
      await dataStore.updatePromotion(promo.id, { active: !promo.active });
      await load();
      toast.success(promo.active ? "Promotion deactivated." : "Promotion activated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update promotion.";
      toast.error(msg);
      console.error("Failed to toggle promo:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promotion code?")) return;
    try {
      await dataStore.deletePromotion(id);
      await load();
      toast.success("Promotion deleted.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete promotion.";
      toast.error(msg);
      console.error("Failed to delete promo:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-zinc-900">Loading promotions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Promotions</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <form onSubmit={handleCreatePromo} className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 space-y-4 sticky top-6">
            <h3 className="text-lg font-semibold text-zinc-900 flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              New Discount Code
            </h3>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Code</label>
              <input type="text" name="code" placeholder="e.g. SUMMER24" required
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm sm:text-sm p-2 border uppercase" />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Discount Percentage (%)</label>
              <input type="number" name="percentage" min="1" max="100" placeholder="20" required
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm sm:text-sm p-2 border" />
            </div>

            <div className="flex items-center">
              <input type="checkbox" name="active" id="active" defaultChecked className="h-4 w-4 rounded border-zinc-300 text-zinc-900" />
              <label htmlFor="active" className="ml-2 block text-sm text-zinc-900">Active Immediately</label>
            </div>

            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded p-2">{error}</p>
            )}

            <button type="submit" disabled={isSaving}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60">
              <Plus className="w-4 h-4 mr-2" />
              {isSaving ? "Creating..." : "Create Promo"}
            </button>
          </form>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            {promotions.length === 0 ? (
              <div className="p-12 text-center text-zinc-900">
                <Tag className="mx-auto h-12 w-12 text-zinc-300" />
                <h3 className="mt-2 text-sm font-semibold text-zinc-900">No promotions</h3>
                <p className="mt-1 text-sm text-zinc-800">Get started by creating a new discount code.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-800">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-800">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-800">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-800">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {promotions.map((promo) => (
                    <tr key={promo.id}>
                      <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-zinc-900">
                        {promo.code}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-800">
                        {promo.percentage}% off
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <button
                          onClick={() => handleToggleActive(promo)}
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${promo.active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-800"}`}
                        >
                          {promo.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button onClick={() => handleDelete(promo.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
