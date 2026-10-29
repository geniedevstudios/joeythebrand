import { displaySizeLabel } from "./wearSizes";

export function formatSizeLabel(raw: string, fit?: string, wearTag?: string): string {
  return displaySizeLabel(raw, fit, wearTag);
}
