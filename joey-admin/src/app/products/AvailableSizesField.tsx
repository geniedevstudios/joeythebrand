"use client";

import { useState } from "react";

export type SizeQty = { size: string; quantity: number };

function parseQty(value: string) {
  if (value === "") return 0;
  if (!/^\d{1,4}$/.test(value)) return null;
  const number = Number(value);
  return number <= 9999 ? number : null;
}

export function AvailableSizesField({
  allSizes,
  chosen,
  stock,
  trackStock,
  onChange,
}: {
  allSizes: string[];
  chosen: string[];
  stock: SizeQty[];
  trackStock: boolean;
  onChange: (sizes: string[], stock: SizeQty[]) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      allSizes.map((size) => {
        const entry = stock.find((item) => item.size === size);
        return [size, entry ? String(entry.quantity) : ""];
      }),
    ),
  );

  function emit(nextChosen: string[], nextDraft: Record<string, string>) {
    setDraft(nextDraft);
    const ordered = allSizes.filter((size) => nextChosen.includes(size));
    if (!trackStock) {
      onChange(
        ordered,
        ordered.map((size) => ({ size, quantity: 0 })),
      );
      return;
    }
    onChange(
      ordered,
      ordered.map((size) => {
        const parsed = parseQty(nextDraft[size] ?? "");
        return { size, quantity: parsed == null ? 0 : parsed };
      }),
    );
  }

  function toggle(size: string, on: boolean) {
    const nextChosen = on ? [...chosen, size] : chosen.filter((item) => item !== size);
    const nextDraft = { ...draft };
    if (on && nextDraft[size] == null) nextDraft[size] = "";
    if (!on) delete nextDraft[size];
    emit(nextChosen, nextDraft);
  }

  return (
    <fieldset className="mt-5 min-w-0 border-0 p-0">
      <legend className="text-sm font-medium text-zinc-700">Available sizes</legend>
      <p className="mt-2 mb-3 text-[11px] leading-relaxed text-zinc-500">
        {trackStock
          ? "Choose each size you offer, then enter how many are left. A paid order reduces what is left."
          : "Choose the sizes customers can order. Leave all unchecked to mark this piece as sold out."}
      </p>
      <div
        className={`grid gap-2 ${
          trackStock ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {allSizes.map((size) => {
          const on = chosen.includes(size);
          return (
            <div
              key={size}
              className={`rounded-lg border px-3 py-3 ${
                on ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
              }`}
            >
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => toggle(size, e.target.checked)}
                  className="rounded border-zinc-300"
                />
                <strong className="text-sm font-medium text-zinc-900">{size}</strong>
              </label>
              {trackStock && on ? (
                <label className="mt-2 grid gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
                  Quantity left
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    step={1}
                    inputMode="numeric"
                    aria-label={`How many size ${size} are left`}
                    value={draft[size] ?? ""}
                    onChange={(e) =>
                      emit(chosen, { ...draft, [size]: e.target.value })
                    }
                    className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-900"
                  />
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4">
        <button
          type="button"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          onClick={() => {
            const nextDraft = { ...draft };
            for (const size of allSizes) if (nextDraft[size] == null) nextDraft[size] = "";
            emit([...allSizes], nextDraft);
          }}
        >
          Select all
        </button>
        <button
          type="button"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          onClick={() => emit([], {})}
        >
          Clear sizes
        </button>
      </div>
    </fieldset>
  );
}
