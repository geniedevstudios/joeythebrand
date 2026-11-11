"use client";

import { Plus } from "lucide-react";
import type { Product, ProductVariant, SizeStock } from "@/lib/types";
import AssetUrlField from "@/components/AssetUrlField";
import { AvailableSizesField } from "./AvailableSizesField";

const HEX = /^#[0-9a-fA-F]{6}$/;

export const STANDARD_SIZES = ["S", "M", "L", "XL", "XXL", "Custom"] as const;
export const UK_SIZES = [
  "UK 8",
  "UK 10",
  "UK 12",
  "UK 14",
  "UK 16",
  "UK 18",
  "UK 20",
  "UK 22",
  "Custom",
] as const;

type DraftColour = ProductVariant & {
  draftKey: string;
  chosenSizes: string[];
  sizeQty: SizeStock[];
};

function extrasFromProduct(product: Product, main: string): string[] {
  return (product.images || []).filter((u) => u?.trim() && u.trim() !== main).slice(0, 2);
}

export function blankColour(defaultSizes: string[]): DraftColour {
  return {
    draftKey: crypto.randomUUID(),
    id: `color-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "color",
    name: "",
    colorHex: "",
    thumbnailUrl: "",
    images: ["", "", ""],
    quantity: 0,
    combos: [],
    chosenSizes: [...defaultSizes],
    sizeQty: defaultSizes.map((size) => ({ size, quantity: 0 })),
  };
}

function sizesFromProduct(product: Product, allSizes: string[]): string[] {
  const fromProduct = (product.sizes || [])
    .filter((s) => s.available !== false)
    .map((s) => s.name)
    .filter((name) => allSizes.includes(name));
  return fromProduct.length ? fromProduct : [...allSizes];
}

export function colourwaysFrom(product: Product | null, allSizes: string[]): DraftColour[] {
  if (!product) return [blankColour(allSizes)];

  const colors = (product.variants || []).filter(
    (v) => (v.type === "color" || !v.type) && v.id !== "fit-combo",
  );
  const fallbackSizes = sizesFromProduct(product, allSizes);

  if (colors.length) {
    return colors.map((v, i) => {
      const gallery = (v.images || []).map((u) => u?.trim()).filter(Boolean) as string[];
      let thumbnail = (v.thumbnailUrl || "").trim();
      let images: string[] = ["", "", ""];

      if (i === 0) {
        thumbnail = thumbnail || product.image?.trim() || gallery[0] || "";
        const extras = [
          ...gallery.filter((u) => u !== thumbnail && u !== product.hoverImage?.trim()),
          ...extrasFromProduct(product, thumbnail),
        ].filter((u, idx, arr) => arr.indexOf(u) === idx);
        images = [product.hoverImage?.trim() || "", extras[0] || "", extras[1] || ""];
      } else {
        thumbnail = thumbnail || gallery[0] || "";
        const rest = gallery.filter((u) => u !== thumbnail);
        images = ["", rest[0] || "", rest[1] || ""];
      }

      const sizeStock = Array.isArray(v.sizeStock) ? v.sizeStock : [];
      const chosenSizes = sizeStock.length
        ? sizeStock.map((row) => row.size).filter((size) => allSizes.includes(size))
        : fallbackSizes;
      const sizeQty =
        sizeStock.length > 0
          ? chosenSizes.map((size) => {
              const row = sizeStock.find((item) => item.size === size);
              return { size, quantity: Number(row?.quantity) || 0 };
            })
          : chosenSizes.map((size, idx) => ({
              size,
              quantity: idx === 0 ? Number(v.quantity) || 0 : 0,
            }));

      return {
        ...v,
        draftKey: v.id || crypto.randomUUID(),
        type: "color" as const,
        colorHex: v.colorHex || "",
        thumbnailUrl: thumbnail,
        images,
        combos: [],
        chosenSizes,
        sizeQty,
      };
    });
  }

  const main = product.image?.trim() || "";
  const extras = extrasFromProduct(product, main);
  return [
    {
      draftKey: "main-color",
      id: "main-color",
      type: "color",
      name: "",
      colorHex: "",
      thumbnailUrl: main,
      images: [product.hoverImage?.trim() || "", extras[0] || "", extras[1] || ""],
      quantity: product.quantity,
      combos: [],
      chosenSizes: fallbackSizes,
      sizeQty: fallbackSizes.map((size, idx) => ({
        size,
        quantity: idx === 0 ? Number(product.quantity) || 0 : 0,
      })),
    },
  ];
}

export function commitColourways(
  ways: DraftColour[],
  trackStock: boolean,
):
  | { error: string }
  | {
      colourways: ProductVariant[];
      image: string;
      hoverImage: string;
      images: string[];
      quantity: number;
      sizes: { name: string; available: boolean }[];
    } {
  if (!ways.length) return { error: "Add a colour for this piece." };

  const colourways: ProductVariant[] = [];
  for (const [index, way] of ways.entries()) {
    const color = (way.name || "").trim();
    const swatch = (way.colorHex || "").trim();
    if (HEX.test(swatch) && !color) {
      return { error: "Name the colour, or leave both the name and the swatch empty." };
    }
    if (ways.length > 1 && !color) return { error: "Name each colour." };

    const main = (way.thumbnailUrl || "").trim();
    if (!main) {
      return {
        error: color
          ? `Add a photograph for ${color}.`
          : "Add a main photograph for this piece.",
      };
    }

    const chosen = way.chosenSizes || [];
    if (!chosen.length) {
      return {
        error: color
          ? `Choose at least one size for ${color}.`
          : "Choose at least one size for this piece.",
      };
    }

    const sizeQty = chosen.map((size) => {
      const row = (way.sizeQty || []).find((item) => item.size === size);
      return { size, quantity: Math.max(0, Number(row?.quantity) || 0) };
    });

    if (trackStock && sizeQty.some((row) => !Number.isInteger(row.quantity) || row.quantity < 0)) {
      return {
        error: color
          ? `Enter how many are left for each size of ${color}.`
          : "Enter how many are left for each size.",
      };
    }

    const quantity = trackStock ? sizeQty.reduce((sum, row) => sum + row.quantity, 0) : 0;
    const hover = (way.images?.[0] || "").trim();
    const extra1 = (way.images?.[1] || "").trim();
    const extra2 = (way.images?.[2] || "").trim();
    const id =
      index === 0
        ? way.id && way.id !== "fit-combo"
          ? way.id
          : "main-color"
        : way.id || `color-${index}`;

    colourways.push({
      id,
      type: "color",
      name: color,
      colorHex: color && HEX.test(swatch) ? swatch : "",
      thumbnailUrl: main,
      images: index === 0 ? [hover, extra1, extra2].filter(Boolean) : [main, hover, extra1, extra2].filter(Boolean),
      quantity,
      sizeStock: sizeQty,
      productNameOverride: way.productNameOverride?.trim() || undefined,
      combos: [],
    });
  }

  const lead = colourways[0];
  const leadDraft = ways[0];
  const hover = (leadDraft.images?.[0] || "").trim();
  const extras = [leadDraft.images?.[1], leadDraft.images?.[2]]
    .map((u) => (u || "").trim())
    .filter(Boolean);
  const sizeNames = Array.from(
    new Set(ways.flatMap((way) => way.chosenSizes || [])),
  );

  return {
    colourways,
    image: lead.thumbnailUrl || "",
    hoverImage: hover,
    images: [lead.thumbnailUrl || "", ...extras].filter(Boolean),
    quantity: colourways.reduce((sum, way) => sum + (Number(way.quantity) || 0), 0),
    sizes: sizeNames.map((name) => ({ name, available: true })),
  };
}

export function ColourwaysField({
  variants,
  onChange,
  uploadFolder,
  trackStock,
  allSizes,
}: {
  variants: DraftColour[];
  onChange: (next: DraftColour[]) => void;
  uploadFolder: string;
  trackStock: boolean;
  allSizes: string[];
}) {
  function patch(draftKey: string, update: Partial<DraftColour>) {
    onChange(variants.map((way) => (way.draftKey === draftKey ? { ...way, ...update } : way)));
  }

  function setImage(draftKey: string, index: number, url: string) {
    onChange(
      variants.map((way) => {
        if (way.draftKey !== draftKey) return way;
        const images = [way.images?.[0] || "", way.images?.[1] || "", way.images?.[2] || ""];
        images[index] = url;
        return { ...way, images };
      }),
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Colours</h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
            Each colour has its own photographs
            {trackStock ? " and its own quantities." : "."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...variants, blankColour(allSizes)])}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          <Plus className="h-4 w-4" />
          Add a colour
        </button>
      </div>

      {variants.map((way, index) => {
        const swatch = way.colorHex || "";
        const hasSwatch = HEX.test(swatch);
        return (
          <article key={way.draftKey} className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <strong className="text-base font-semibold text-zinc-900">
                {way.name?.trim() || `Colour ${index + 1}`}
              </strong>
              {variants.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onChange(variants.filter((item) => item.draftKey !== way.draftKey))}
                  className="text-sm font-medium text-zinc-500 hover:text-red-600"
                >
                  Remove colour
                </button>
              ) : null}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">Colour name</span>
                    <input
                      value={way.name || ""}
                      placeholder="Onyx"
                      onChange={(e) => {
                        const color = e.target.value;
                        patch(
                          way.draftKey,
                          color.trim() ? { name: color } : { name: "", colorHex: "" },
                        );
                      }}
                      className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
                    />
                  </label>
                  <div>
                    <span className="text-sm font-medium text-zinc-700">Colour swatch</span>
                    <div className="mt-1 flex flex-col items-start gap-2">
                      {!hasSwatch ? (
                        <label className="relative flex min-h-10 w-full cursor-pointer items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-500">
                          Choose a swatch
                          <input
                            type="color"
                            aria-label={`Swatch for ${way.name || `colour ${index + 1}`}`}
                            value="#272b36"
                            onChange={(e) => patch(way.draftKey, { colorHex: e.target.value })}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </label>
                      ) : (
                        <input
                          type="color"
                          aria-label={`Swatch for ${way.name || `colour ${index + 1}`}`}
                          value={swatch}
                          onChange={(e) => patch(way.draftKey, { colorHex: e.target.value })}
                          className="h-10 w-14 cursor-pointer rounded-md border border-zinc-300 bg-white p-1"
                        />
                      )}
                      {(way.name?.trim() || hasSwatch) && (
                        <button
                          type="button"
                          className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
                          onClick={() => patch(way.draftKey, { name: "", colorHex: "" })}
                        >
                          Clear colour
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <AvailableSizesField
                  key={`${way.draftKey}-${allSizes.join(",")}`}
                  allSizes={allSizes}
                  chosen={way.chosenSizes}
                  stock={way.sizeQty}
                  trackStock={trackStock}
                  onChange={(nextSizes, nextStock) =>
                    patch(way.draftKey, { chosenSizes: nextSizes, sizeQty: nextStock })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <AssetUrlField
                  id={`${way.draftKey}-main`}
                  label="Main photograph"
                  value={way.thumbnailUrl || ""}
                  onChange={(url) => patch(way.draftKey, { thumbnailUrl: url })}
                  uploadFolder={`${uploadFolder}/colours/${way.id}`}
                  accept="image/*"
                />
                <AssetUrlField
                  id={`${way.draftKey}-hover`}
                  label="Hover photograph"
                  value={way.images?.[0] || ""}
                  onChange={(url) => setImage(way.draftKey, 0, url)}
                  uploadFolder={`${uploadFolder}/colours/${way.id}`}
                  accept="image/*"
                />
                <AssetUrlField
                  id={`${way.draftKey}-photo-3`}
                  label="Photograph 3"
                  value={way.images?.[1] || ""}
                  onChange={(url) => setImage(way.draftKey, 1, url)}
                  uploadFolder={`${uploadFolder}/colours/${way.id}`}
                  accept="image/*"
                />
                <AssetUrlField
                  id={`${way.draftKey}-photo-4`}
                  label="Photograph 4"
                  value={way.images?.[2] || ""}
                  onChange={(url) => setImage(way.draftKey, 2, url)}
                  uploadFolder={`${uploadFolder}/colours/${way.id}`}
                  accept="image/*"
                />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export type { DraftColour };
