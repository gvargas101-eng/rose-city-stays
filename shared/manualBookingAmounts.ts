export interface ManualAdjustmentItem {
  label: string;
  /** Positive = custom charge; negative = owner credit (not an external payment). */
  amount: number;
}

export interface ManualBookingAmountsInput {
  nightlyRate: number;
  nights: number;
  cleaningFee: number;
  extraGuestFee: number;
  taxAmount: number;
  discountAmount: number;
  customLineItems?: ManualAdjustmentItem[];
}

const cents = (amount: number) => Math.round(amount * 100);

/** One calculation shared by link creation, owner preview, and Stripe checkout. */
export function getManualBookingAmounts(input: ManualBookingAmountsInput) {
  const subtotalCents = cents(input.nightlyRate * input.nights);
  const discountCents = cents(input.discountAmount);
  const items = input.customLineItems ?? [];
  const chargeCents = items.reduce(
    (sum, item) => sum + Math.max(0, cents(item.amount)),
    0
  );
  const creditCents = items.reduce(
    (sum, item) => sum + Math.max(0, -cents(item.amount)),
    0
  );
  const grossCents =
    subtotalCents +
    cents(input.cleaningFee) +
    cents(input.extraGuestFee) +
    cents(input.taxAmount) +
    chargeCents;
  const totalCents = grossCents - discountCents - creditCents;
  return {
    subtotal: subtotalCents / 100,
    customCharges: chargeCents / 100,
    credits: creditCents / 100,
    discountAmount: discountCents / 100,
    stripeDiscountAmount: (discountCents + creditCents) / 100,
    total: totalCents / 100,
  };
}

/** Never silently clamp an excessive credit or create a link Stripe cannot collect. */
export function validateManualBookingAmounts(
  input: ManualBookingAmountsInput,
  options: { allowZero?: boolean } = {}
) {
  const nonnegative = [
    input.nightlyRate,
    input.cleaningFee,
    input.extraGuestFee,
    input.taxAmount,
    input.discountAmount,
  ];
  if (
    !Number.isInteger(input.nights) ||
    input.nights < 1 ||
    nonnegative.some(value => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error(
      "Rates, fees, tax, and discounts must be valid nonnegative amounts."
    );
  }
  if (
    (input.customLineItems ?? []).some(
      item =>
        !item ||
        typeof item.label !== "string" ||
        !item.label.trim() ||
        !Number.isFinite(item.amount) ||
        cents(item.amount) === 0
    )
  ) {
    throw new Error(
      "Each custom charge or credit needs a label and an amount of at least $0.01."
    );
  }
  if (
    [
      ...nonnegative,
      ...(input.customLineItems ?? []).map(item => item.amount),
    ].some(value => Math.abs(cents(value) / 100 - value) > 0.00000001)
  ) {
    throw new Error(
      "Enter monetary amounts with no more than two decimal places."
    );
  }
  const amounts = getManualBookingAmounts(input);
  if (amounts.discountAmount > amounts.subtotal) {
    throw new Error(
      "Nightly discount cannot exceed the nightly subtotal. Use a custom credit for other reductions."
    );
  }
  if (!options.allowZero && amounts.total < 0.5) {
    throw new Error(
      "Credits and discounts must leave at least $0.50 to pay. This payment-link flow does not confirm unpaid or fully credited stays."
    );
  }
  if (amounts.total < 0)
    throw new Error("Credits cannot exceed the total reservation charges.");
  return amounts;
}

export function getNightlyDiscount(
  subtotal: number,
  mode: "fixed" | "percent",
  value: number
) {
  return (
    Math.round((mode === "percent" ? (subtotal * value) / 100 : value) * 100) /
    100
  );
}
