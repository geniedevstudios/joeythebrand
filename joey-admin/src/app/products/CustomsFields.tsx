import { useId, useState } from "react";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import {
  blankCustomsComponent, GARMENT_TYPES, HS_SUGGESTIONS, validCustomsComponents,
  type CustomsComponent, type CustomsProfile,
} from "@/lib/customsProfile";

const field = "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm";

const GARMENT_OPTIONS = [
  { value: "", label: "Select a garment type" },
  ...Object.entries(GARMENT_TYPES).map(([value, label]) => ({ value, label })),
];
const FABRIC_OPTIONS = [
  { value: "", label: "Select a fabric type" },
  { value: "woven", label: "Woven" },
  { value: "knit", label: "Knit or crocheted" },
  { value: "other", label: "Other fabric construction" },
];
const MANUAL_CODE = "manual";

function CustomsCodePicker({
  line, onChange,
}: {
  line: CustomsComponent;
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const [manual, setManual] = useState(false);
  const suggestions = (HS_SUGGESTIONS[line.garmentType] ?? []).filter(([code]) =>
    line.construction === "knit" ? code.startsWith("61") :
    line.construction === "woven" ? code.startsWith("62") : true);
  const hasSuggestedCode = suggestions.some(([code]) => code === line.hsCode);
  const showManual = manual || !suggestions.length || Boolean(line.hsCode && !hasSuggestedCode);

  return (
    <div className="min-w-0">
      {suggestions.length > 0 && (
        <>
          <span id={labelId}>HS code</span>
          <AdminStyledSelect
            labelledBy={labelId}
            wrapperClassName="mt-1"
            searchPlaceholder="Search by code or garment"
            value={showManual ? MANUAL_CODE : line.hsCode}
            options={[
              { value: "", label: "Select an HS code" },
              ...suggestions.map(([value, label]) => ({ value, label: `${value} · ${label}` })),
              { value: MANUAL_CODE, label: "Enter a code manually", alwaysVisible: true },
            ]}
            onValueChange={(value) => {
              setManual(value === MANUAL_CODE);
              if (value !== MANUAL_CODE) onChange(value);
            }}
          />
        </>
      )}
      {showManual && (
        <label className={suggestions.length ? "mt-2 block" : "block"}>
          {suggestions.length ? "Enter HS code" : "HS code"}
          <input
            className={field}
            inputMode="numeric"
            value={line.hsCode}
            onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
            placeholder="Enter the verified code"
          />
        </label>
      )}
    </div>
  );
}

export default function CustomsFields({
  profile, legacyCode, onChange,
}: {
  profile: CustomsProfile;
  legacyCode?: string;
  onChange: (profile: CustomsProfile) => void;
}) {
  const fieldId = useId();
  const { components, verified } = profile;
  const replace = (index: number, patch: Partial<CustomsComponent>) => {
    onChange({ verified: false, components: components.map((line, i) => i === index ? { ...line, ...patch } : line) });
  };

  return (
    <details className="rounded-md border border-zinc-200 p-4" open={components.length > 0 || undefined}>
      <summary className="cursor-pointer text-sm font-medium">Export customs · {verified ? "Verified" : "Unverified"}</summary>
      <p className="my-3 text-xs text-zinc-600">
        Verify the classification before using DHL internationally. For a set declared as separate garments, add one line per garment and split the sale value across them.
      </p>
      {legacyCode && components.length === 0 && (
        <p className="mb-3 text-xs text-zinc-600">Previous code {legacyCode} is unverified.</p>
      )}
      {components.map((line, index) => {
        const garmentId = `${fieldId}-garment-${index}`;
        const fabricId = `${fieldId}-fabric-${index}`;
        return (
          <fieldset key={index} className="mb-3 grid gap-3 rounded-md border border-zinc-200 p-3 text-xs sm:grid-cols-2">
            <legend>Customs line {index + 1}</legend>
            <label className="sm:col-span-2">
              Customs description
              <input className={field} maxLength={512} value={line.description} onChange={(e) => replace(index, { description: e.target.value })} placeholder="e.g. Men’s woven 100% cotton long-sleeve shirt" />
              <span className="mt-1 block text-xs text-zinc-600">Describe the actual piece, including garment type, fabric construction and fibre content. Add details such as sleeve length or intended wearer where relevant.</span>
            </label>
            <label className="block text-xs font-medium">
              Verified import HS code destination (optional)
              <input className={field} maxLength={2} value={line.inboundCountry ?? ""} onChange={(e) => replace(index, { inboundCountry: e.target.value.toUpperCase() })} placeholder="e.g. CA" />
            </label>
            <label className="block text-xs font-medium">
              Verified import HS code (optional)
              <input className={field} inputMode="numeric" maxLength={12} value={line.inboundHsCode ?? ""} onChange={(e) => replace(index, { inboundHsCode: e.target.value.replace(/\D/g, "") })} />
            </label>
            <div className="min-w-0">
              <span id={garmentId}>Garment type</span>
              <AdminStyledSelect
                labelledBy={garmentId}
                value={line.garmentType}
                options={GARMENT_OPTIONS}
                wrapperClassName="mt-1"
                onValueChange={(value) => replace(index, { garmentType: value as CustomsComponent["garmentType"], hsCode: "" })}
              />
            </div>
            <div className="min-w-0">
              <span id={fabricId}>Main fabric construction</span>
              <AdminStyledSelect
                labelledBy={fabricId}
                value={line.construction}
                options={FABRIC_OPTIONS}
                wrapperClassName="mt-1"
                onValueChange={(value) => replace(index, { construction: value as CustomsComponent["construction"], hsCode: "" })}
              />
            </div>
            <label>
              Fibre composition (%)
              <input className={field} value={line.fibres} onChange={(e) => replace(index, { fibres: e.target.value })} placeholder="e.g. 98% cotton, 2% elastane" />
            </label>
            <CustomsCodePicker
              key={`${line.garmentType}-${line.construction}`}
              line={line}
              onChange={(hsCode) => replace(index, { hsCode })}
            />
            <label>
              Garment net weight (kg)
              <input className={field} type="number" min="0" step="0.001" value={line.weightKg || ""} onChange={(e) => replace(index, { weightKg: Number(e.target.value) })} />
            </label>
            <label>
              Share of item value (%)
              <input className={field} type="number" min="0" max="100" step="0.01" value={line.valueShare || ""} onChange={(e) => replace(index, { valueShare: Number(e.target.value) })} />
            </label>
            <button type="button" className="self-end text-left text-red-700" onClick={() => onChange({ verified: false, components: components.filter((_, i) => i !== index) })}>
              Remove line
            </button>
          </fieldset>
        );
      })}
      <button type="button" className="text-sm font-medium underline" onClick={() => onChange({
        verified: false,
        components: [...components, { ...blankCustomsComponent(), valueShare: components.length ? 0 : 100 }],
      })}>
        Add customs line
      </button>
      {components.length > 0 && (
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={verified} disabled={!validCustomsComponents(components)} onChange={(e) => onChange({ components, verified: e.target.checked })} />
          <span>Classification verified. Complete the required fields and make the value shares add up to 100%.</span>
        </label>
      )}
    </details>
  );
}
