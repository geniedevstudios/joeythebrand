const currency = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  currencyDisplay: "code",
});

export function formatOrderAmount(amount: number) {
  return currency.format(amount);
}
