"use client";

import type { PageHeroAnchor, PageHeroFit } from "@/lib/types";
import AdminStyledSelect from "./AdminStyledSelect";

function LabeledAdminSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  name,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  name: string;
}) {
  const labelId = `${name}-label`;
  return (
    <div>
      <span id={labelId} className="block text-xs font-semibold uppercase tracking-wide text-zinc-700">
        {label}
      </span>
      <AdminStyledSelect
        name={name}
        labelledBy={labelId}
        defaultValue={value}
        options={options}
        wrapperClassName="mt-1.5"
        onValueChange={(v) => onChange(v as T)}
      />
    </div>
  );
}

export default function HeroFitSelectors({
  fit,
  anchor,
  onFit,
  onAnchor,
  compact,
}: {
  fit: PageHeroFit;
  anchor: PageHeroAnchor;
  onFit: (f: PageHeroFit) => void;
  onAnchor: (a: PageHeroAnchor) => void;
  compact?: boolean;
}) {
  const gridClass = compact
    ? "mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"
    : "mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2";

  const fitOptions: { value: PageHeroFit; label: string }[] = [
    { value: "cover", label: "Fill banner (may crop)" },
    { value: "contain", label: "Show full image (letterbox bars)" },
  ];

  const anchorOptions: { value: PageHeroAnchor; label: string }[] = [
    { value: "top", label: "Top" },
    { value: "center", label: "Center" },
    { value: "bottom", label: "Bottom" },
  ];

  return (
    <div className={gridClass}>
      <LabeledAdminSelect name="page-hero-fit" label="Fill mode" value={fit} onChange={onFit} options={fitOptions} />
      <LabeledAdminSelect
        name="page-hero-anchor"
        label="Focus (when cropping)"
        value={anchor}
        onChange={onAnchor}
        options={anchorOptions}
      />
    </div>
  );
}
