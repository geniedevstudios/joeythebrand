export type DhlParcel = {
  weight: number;
  dimensions: { length: number; width: number; height: number };
};

export function isDhlParcel(value: unknown): value is DhlParcel {
  const parcel = value as DhlParcel | null;
  return !!parcel?.dimensions &&
    [parcel.weight, parcel.dimensions.length, parcel.dimensions.width, parcel.dimensions.height]
      .every((measurement) => typeof measurement === "number" && Number.isFinite(measurement) && measurement > 0);
}

export function readDhlParcel(value: unknown): DhlParcel | undefined {
  if (!isDhlParcel(value)) return undefined;
  const { weight, dimensions: { length, width, height } } = value;
  return { weight, dimensions: { length, width, height } };
}
