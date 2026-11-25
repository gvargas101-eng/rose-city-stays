import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createSession: vi.fn(),
  retrieveSession: vi.fn(),
  createIntent: vi.fn(),
  retrieveIntent: vi.fn(),
  createReservation: vi.fn(),
  legacyReceipt: vi.fn(),
  receipt: vi.fn(),
  state: vi.fn(),
  calendar: vi.fn(),
  notify: vi.fn(),
  coupon: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mocks.createSession,
        retrieve: mocks.retrieveSession,
      },
    },
    paymentIntents: {
      create: mocks.createIntent,
      retrieve: mocks.retrieveIntent,
    },
    coupons: { create: mocks.coupon },
  })),
}));
vi.mock("./hostaway-booking", () => ({
  createHostawayReservation: mocks.createReservation,
  recordHostawayStripePayment: mocks.legacyReceipt,
  recordHostawayOwnerReceipt: mocks.receipt,
  getHostawayOwnerPaymentState: mocks.state,
}));
vi.mock("./hostaway", () => ({
  PROPERTY_TO_HOSTAWAY_ID: { "the-briar": 329641 },
  getPropertyCalendar: mocks.calendar,
}));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notify }));

import {
  createOwnerBalanceCheckout,
  getOwnerBookingBalance,
  settleOwnerBookingCheckout,
  syncOwnerReceiptToHostaway,
} from "./owner-booking-payments";
import {
  bookingRouter,
  confirmManualCheckoutSession,
  confirmStripeCheckoutSession,
} from "./routers/booking";

let rows: Record<string, any[]>;
let inserts: string[];
let updates: { table: string; values: any }[];
let locks: string[];
let queue: Promise<unknown>;
const dialect = new MySqlDialect();
function matches(row: any, condition: any) {
  if (!condition) return true;
  const query = dialect.sqlToQuery(condition);
  const expressions = [
    ...query.sql.matchAll(/`[^`]+`\.`([^`]+)`\s*(=|<>)\s*\?/g),
  ];
  return expressions.every((match, index) =>
    match[2] === "="
      ? row[match[1]] === query.params[index]
      : row[match[1]] !== query.params[index]
  );
}
function database() {
  const db: any = {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => {
          const name = getTableName(table);
          const read = () =>
            rows[name]
              .filter(row => matches(row, condition))
              .map(row => ({ ...row }));
          return {
            limit: (count: number) =>
              Object.assign(
                Promise.resolve().then(() => read().slice(0, count)),
                {
                  for: (mode: string) => {
                    locks.push(`${name}:${mode}`);
                    return Promise.resolve().then(() => read().slice(0, count));
                  },
                }
              ),
            orderBy: async () => read(),
            then: (resolve: any) => resolve(read()),
          };
        },
      }),
    }),
    insert: (table: any) => ({
      values: (values: any) => {
        const name = getTableName(table);
        const id = Math.max(0, ...rows[name].map(row => row.id)) + 1;
        const save = () => {
          inserts.push(name);
          rows[name].push({ id, ...values });
          return [{ id }];
        };
        return {
          $returningId: async () => save(),
          onDuplicateKeyUpdate: async () => save(),
          then: (resolve: any) => resolve(save()),
        };
      },
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: async (condition: any) => {
          const name = getTableName(table);
          updates.push({ table: name, values });
          let affectedRows = 0;
          for (const row of rows[name])
            if (matches(row, condition)) {
              Object.assign(row, values);
              affectedRows++;
            }
          return [{ affectedRows }];
        },
      }),
    }),
    transaction: (callback: any) => {
      const next = queue.then(async () => {
        const snapshot = structuredClone(rows);
        try {
          return await callback(db);
        } catch (error) {
          rows = snapshot;
          throw error;
        }
      });
      queue = next.catch(() => undefined);
      return next;
    },
  };
  return db;
}
const owner = () => rows.bookings[0];
const link = () => rows.manual_booking_links[0];
const stripe = {
  checkout: {
    sessions: { create: mocks.createSession, retrieve: mocks.retrieveSession },
  },
} as unknown as Stripe;
const input = {
  token: "owner-token",
  guestName: "Owner Guest",
  guestEmail: "guest@example.com",
  origin: "https://example.com",
  cameraDisclosureAccepted: true,
  guestCountConfirmed: true,
  termsAccepted: true,
  guestIdUrl: "https://example.com/verified-test-id",
};
const checkout = () =>
  (bookingRouter.createManualBookingCheckout as any)._def.resolver({
    input,
    ctx: {},
  });
const session = (extra: Record<string, unknown> = {}) =>
  ({
    id: "cs_owner",
    amount_total: 60000,
    currency: "usd",
    payment_status: "paid",
    payment_intent: "pi_balance",
    customer: "cus_owner",
    metadata: {
      owner_booking_id: "42",
      manual_booking_token: "owner-token",
      owner_balance_amount_cents: "60000",
    },
    ...extra,
  }) as unknown as Stripe.Checkout.Session;

beforeEach(() => {
  vi.clearAllMocks();
  rows = {
    bookings: [
      {
        id: 42,
        bookingSource: "owner",
        status: "confirmed",
        hostawayReservationId: "HA-42",
        propertyId: "the-briar",
        hostawayListingId: 329641,
        guestName: "Owner Guest",
        guestEmail: "guest@example.com",
        checkIn: 1802217600000,
        checkOut: 1802476800000,
        nights: 3,
        guestCount: 2,
        totalAmount: "900.00",
        paidAmount: "300.00",
        depositHoldAmount: "0.00",
        depositHoldIntentId: null,
        depositHoldStatus: null,
        addonsSnapshot: JSON.stringify([
          { name: "Courtesy credit", price: -100 },
        ]),
      },
    ],
    manual_booking_links: [
      {
        id: 1,
        token: "owner-token",
        bookingId: 42,
        hostawayReservationId: "HA-42",
        propertySlug: "the-briar",
        propertyName: "The Briar",
        status: "active",
        expiresAt: Date.now() + 86400000,
        checkIn: 1802217600000,
        checkOut: 1802476800000,
        nights: 3,
        guestCount: 2,
        nightlyRate: "0.00",
        cleaningFee: "0.00",
        extraGuestFee: "0.00",
        taxAmount: "0.00",
        discountAmount: "0.00",
        totalAmount: "600.00",
        customLineItems: JSON.stringify([
          { label: "Remaining reservation balance", amount: 600 },
        ]),
        stripeCheckoutSessionId: "cs_owner",
        bypassAvailabilityCheck: 0,
        securityDepositOverride: null,
        guestNote: "Reservation total $900, paid $300, balance $600.",
        adminNotes: "Never expose this",
      },
    ],
    owner_booking_payments: [
      {
        id: 1,
        bookingId: 42,
        eventKey: "external:initial",
        amount: "300.00",
        method: "external",
        reference: "cash-receipt-1",
        hostawaySyncStatus: "synced",
        hostawayChargeId: "charge_external",
      },
    ],
    site_settings: [],
    discount_code_uses: [],
    booking_cancellation_policies: [],
    properties: [{ slug: "the-briar", cancellationPolicy: "Original property cancellation terms" }],
  };
  inserts = [];
  updates = [];
  locks = [];
  queue = Promise.resolve();
  mocks.getDb.mockResolvedValue(database());
  mocks.receipt.mockResolvedValue({ id: "charge_stripe", status: "paid" });
  mocks.state.mockResolvedValue({
    remainingBalance: 600,
    hasScheduledCollection: false,
    cancelled: false,
  });
  mocks.notify.mockResolvedValue(true);
  mocks.createSession.mockResolvedValue({
    id: "cs_owner",
    url: "https://checkout.stripe.com/owner",
  });
  mocks.retrieveSession.mockResolvedValue({
    ...session(),
    status: "open",
    payment_status: "unpaid",
    url: "https://checkout.stripe.com/owner",
  });
  mocks.calendar.mockResolvedValue([]);
});

describe("owner reservation balance checkout", () => {
  it("rejects missing required guest acknowledgments before starting Stripe", async () => {
    const resolver = (bookingRouter.createManualBookingCheckout as any)._def
      .resolver;
    await expect(
      resolver({ input: { ...input, termsAccepted: false }, ctx: {} })
    ).rejects.toThrow("required acknowledgments");
    await expect(
      resolver({ input: { ...input, guestIdUrl: undefined }, ctx: {} })
    ).rejects.toThrow("required acknowledgments");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("honors each owner-approved bypass without fabricating guest agreement acceptance", async () => {
    Object.assign(link(), {
      bypassCameraDisclosure: 1,
      bypassGuestCount: 1,
      bypassTermsAcceptance: 1,
      bypassIdUpload: 1,
    });
    const resolver = (bookingRouter.createManualBookingCheckout as any)._def
      .resolver;
    await expect(
      resolver({
        input: {
          ...input,
          cameraDisclosureAccepted: false,
          guestCountConfirmed: false,
          termsAccepted: false,
          guestIdUrl: undefined,
        },
        ctx: {},
      })
    ).resolves.toMatchObject({ checkoutUrl: expect.any(String) });
    expect(owner().agreementAcceptedAt).toBeUndefined();
  });
  it("collects only the remainder, saves a reusable card, and skips calendars without creating a booking", async () => {
    link().stripeCheckoutSessionId = null;
    expect(await checkout()).toEqual({
      checkoutUrl: "https://checkout.stripe.com/owner",
    });
    const [params, options] = mocks.createSession.mock.calls[0];
    expect(params.line_items).toHaveLength(1);
    expect(params.line_items[0].price_data.unit_amount).toBe(60000);
    expect(params.line_items[0].price_data.product_data.name).toContain(
      "Remaining balance"
    );
    expect(params.metadata).toMatchObject({
      owner_booking_id: "42",
      manual_booking_token: "owner-token",
    });
    expect(params.payment_intent_data.setup_future_usage).toBe("off_session");
    expect(options.idempotencyKey).toBe("owner-balance-owner-token");
    expect(link().stripeCheckoutSessionId).toBe("cs_owner");
    expect(mocks.state).toHaveBeenCalledWith("HA-42");
    expect(mocks.calendar).not.toHaveBeenCalled();
    expect(mocks.createReservation).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
    expect(locks).toContain("bookings:update");
  });
  it("reuses the stored checkout session without issuing a second payment", async () => {
    await checkout();
    await checkout();
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.retrieveSession).toHaveBeenCalledTimes(2);
  });
  it.each(["cancelled", "pending", "failed"])(
    "rejects %s reservations before Stripe",
    async status => {
      owner().status = status;
      await expect(checkout()).rejects.toThrow("not confirmed");
      expect(mocks.createSession).not.toHaveBeenCalled();
    }
  );
  it("rejects stale links, no payable balance, and mismatched reservation references", async () => {
    owner().paidAmount = "400.00";
    await expect(checkout()).rejects.toThrow("balance has changed");
    owner().paidAmount = "900.00";
    await expect(checkout()).rejects.toThrow("no payable");
    owner().paidAmount = "300.00";
    link().hostawayReservationId = "HA-OTHER";
    await expect(checkout()).rejects.toThrow("does not match");
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.calendar).not.toHaveBeenCalled();
  });
  it("never falls back to creating a reservation for a dangling existing-reservation link", async () => {
    rows.bookings = [];
    await expect(checkout()).rejects.toThrow("needs to be reviewed");
    await expect(confirmManualCheckoutSession(session())).rejects.toThrow(
      "does not match"
    );
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.createReservation).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });
  it.each([
    {
      remainingBalance: 599.99,
      hasScheduledCollection: false,
      cancelled: false,
    },
    { remainingBalance: 600, hasScheduledCollection: true, cancelled: false },
    { remainingBalance: 600, hasScheduledCollection: false, cancelled: true },
  ])(
    "fails closed on Hostaway mismatch or outstanding native collection (%j)",
    async state => {
      mocks.state.mockResolvedValue(state);
      await expect(checkout()).rejects.toThrow(
        "Hostaway balance/collection has changed"
      );
      expect(mocks.createSession).not.toHaveBeenCalled();
      expect(mocks.retrieveSession).not.toHaveBeenCalled();
    }
  );
  it("fails closed if authoritative Hostaway state cannot be read", async () => {
    mocks.state.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(checkout()).rejects.toThrow("Review it in Hostaway");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("surfaces the reservation total and actual receipts without leaking internal notes", async () => {
    const result = await (
      bookingRouter.getManualBookingLink as any
    )._def.resolver({ input: { token: "owner-token" }, ctx: {} });
    expect(result).toMatchObject({
      existingReservation: true,
      originalReservationTotal: 900,
      amountPaid: 300,
      balanceDue: 600,
      securityDepositAmount: 0,
    });
    expect(result.adminNotes).toBeUndefined();
    expect(result.ownerCreateError).toBeUndefined();
    expect(getOwnerBookingBalance(owner())).toEqual({
      originalReservationTotal: 900,
      amountPaid: 300,
      balanceDue: 600,
    });
  });
});

describe("owner Stripe receipt settlement", () => {
  it("serializes webhook and guest return confirmation into one receipt and no duplicate reservation", async () => {
    const results = await Promise.all([
      confirmManualCheckoutSession(session()),
      confirmManualCheckoutSession(session()),
    ]);
    expect(results.map(result => result.alreadyConfirmed).sort()).toEqual([
      false,
      true,
    ]);
    expect(owner().paidAmount).toBe("900.00");
    expect(owner().totalAmount).toBe("900.00");
    expect(owner().status).toBe("confirmed");
    expect(link().status).toBe("paid");
    expect(rows.owner_booking_payments).toHaveLength(2);
    expect(rows.bookings).toHaveLength(1);
    expect(inserts).toEqual(["owner_booking_payments"]);
    expect(mocks.receipt).toHaveBeenCalledOnce();
    expect(mocks.receipt).toHaveBeenCalledWith({
      reservationId: "HA-42",
      amount: 600,
      reference: "pi_balance",
      method: "stripe",
    });
    expect(mocks.createReservation).not.toHaveBeenCalled();
    expect(mocks.legacyReceipt).not.toHaveBeenCalled();
    expect(mocks.createIntent).not.toHaveBeenCalled();
  });
  it.each([
    { payment_status: "unpaid" },
    { amount_total: 90000 },
    { currency: "eur" },
    {
      metadata: { owner_booking_id: "99", manual_booking_token: "owner-token" },
    },
    { id: "cs_another" },
  ])(
    "rejects unpaid, wrong amount, currency, owner metadata or session (%j)",
    async changes => {
      await expect(
        settleOwnerBookingCheckout(session(changes))
      ).rejects.toThrow();
      expect(owner().paidAmount).toBe("300.00");
      expect(link().status).toBe("active");
      expect(inserts).toEqual([]);
      expect(mocks.receipt).not.toHaveBeenCalled();
    }
  );
  it("preserves cancellation on a late paid session and creates no deposit", async () => {
    owner().status = "cancelled";
    owner().depositHoldAmount = "125.00";
    const result = await confirmManualCheckoutSession(session());
    expect(result.bookingId).toBe(42);
    expect(owner().status).toBe("cancelled");
    expect(owner().paidAmount).toBe("900.00");
    expect(link().status).toBe("paid");
    expect(mocks.createReservation).not.toHaveBeenCalled();
    expect(mocks.createIntent).not.toHaveBeenCalled();
    expect(
      updates
        .filter(update => update.table === "bookings")
        .every(update => !("status" in update.values))
    ).toBe(true);
  });
  it("records only the issued amount if an external receipt arrives while Stripe checkout was open", async () => {
    owner().paidAmount = "400.00";
    await settleOwnerBookingCheckout(session());
    expect(owner().paidAmount).toBe("1000.00"); // Actual money is recorded honestly, even overpayment; no silent erasure/refund.
    expect(rows.owner_booking_payments.at(-1).amount).toBe("600.00");
    expect(owner().totalAmount).toBe("900.00");
  });
  it("keeps actual money received if Hostaway sync fails and retries without recollecting", async () => {
    mocks.receipt.mockRejectedValueOnce(new Error("Provider unavailable"));
    await confirmManualCheckoutSession(session());
    expect(owner().paidAmount).toBe("900.00");
    expect(link().status).toBe("paid");
    expect(rows.owner_booking_payments[1].hostawaySyncStatus).toBe("failed");
    expect(mocks.notify).toHaveBeenCalled();
    const result = await syncOwnerReceiptToHostaway(2);
    expect(result.status).toBe("synced");
    expect(rows.owner_booking_payments).toHaveLength(2);
    expect(owner().paidAmount).toBe("900.00");
    expect(rows.owner_booking_payments[1].hostawayChargeId).toBe(
      "charge_stripe"
    );
  });
  it("throws a failed initial external-receipt sync so the owner creation service can warn honestly", async () => {
    rows.owner_booking_payments[0].hostawaySyncStatus = "pending";
    mocks.receipt.mockRejectedValueOnce(new Error("Hostaway unavailable"));
    await expect(syncOwnerReceiptToHostaway(1)).rejects.toThrow(
      "Money received remains recorded"
    );
    expect(owner().paidAmount).toBe("300.00");
    expect(rows.owner_booking_payments[0].hostawaySyncStatus).toBe("failed");
    expect(mocks.notify).toHaveBeenCalled();
  });
  it("returns payment-just-collected separately from the original reservation total", async () => {
    mocks.retrieveSession.mockResolvedValue(session());
    const result = await (
      bookingRouter.confirmManualBooking as any
    )._def.resolver({
      input: { token: "owner-token", sessionId: "cs_owner" },
      ctx: {},
    });
    expect(result).toMatchObject({
      existingReservation: true,
      originalReservationTotal: 900,
      amountPaid: 900,
      balanceDue: 0,
      totalAmount: "600.00",
      bookingStatus: "confirmed",
    });
    expect(rows.bookings).toHaveLength(1);
    expect(mocks.createReservation).not.toHaveBeenCalled();
  });
  it("serializes simultaneous Hostaway sync retries under the receipt-row lock", async () => {
    rows.owner_booking_payments[0].hostawaySyncStatus = "failed";
    const results = await Promise.all([
      syncOwnerReceiptToHostaway(1),
      syncOwnerReceiptToHostaway(1),
    ]);
    expect(results.map(result => result.status)).toEqual(["synced", "synced"]);
    expect(mocks.receipt).toHaveBeenCalledOnce();
    expect(
      locks.filter(lock => lock === "owner_booking_payments:update")
    ).toHaveLength(2);
  });
  it("syncs an initial attested external receipt rather than courtesy pricing credits or the total", async () => {
    rows.owner_booking_payments[0].hostawaySyncStatus = "pending";
    await syncOwnerReceiptToHostaway(1);
    expect(mocks.receipt).toHaveBeenCalledWith({
      reservationId: "HA-42",
      amount: 300,
      reference: "cash-receipt-1",
      method: "external",
    });
    expect(owner().paidAmount).toBe("300.00");
    expect(getOwnerBookingBalance(owner()).balanceDue).toBe(600);
  });
  it("uses the owner's requested deposit amount after full payment, never the current global default", async () => {
    owner().depositHoldAmount = "125.00";
    mocks.retrieveSession.mockResolvedValue({
      ...session(),
      payment_intent: {
        payment_method: { id: "pm_card" },
        customer: "cus_owner",
      },
      customer: "cus_owner",
    });
    mocks.createIntent.mockResolvedValue({
      id: "pi_hold",
      status: "requires_capture",
    });
    const result = await confirmManualCheckoutSession(session());
    expect(result).toMatchObject({
      depositAmount: 125,
      depositStatus: "authorized",
    });
    expect(mocks.createIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 12500, capture_method: "manual" }),
      expect.objectContaining({
        idempotencyKey: "security-deposit-hold-booking-42",
      })
    );
    expect(owner().depositHoldAmount).toBe("125");
  });
  it("does not record a fake deposit hold when no saved card exists", async () => {
    owner().depositHoldAmount = "125.00";
    mocks.retrieveSession.mockResolvedValue({
      ...session(),
      payment_intent: null,
    });
    const result = await confirmManualCheckoutSession(session());
    expect(result.depositStatus).toBe("failed");
    expect(owner().depositHoldAmount).toBe("125.00");
    expect(owner().depositHoldIntentId).toBeNull();
    expect(mocks.createIntent).not.toHaveBeenCalled();
    expect(owner().paidAmount).toBe("900.00");
  });
  it("never creates a hold while an issued partial balance payment still leaves money owing", async () => {
    owner().totalAmount = "1000.00";
    owner().depositHoldAmount = "125.00";
    await confirmManualCheckoutSession(session());
    expect(owner().paidAmount).toBe("900.00");
    expect(mocks.retrieveSession).not.toHaveBeenCalled();
    expect(mocks.createIntent).not.toHaveBeenCalled();
  });
  it("rejects a legacy confirmation against owner bookings without posting the full rental total", async () => {
    mocks.retrieveIntent.mockResolvedValue({ status: "succeeded" });
    owner().stripePaymentIntentId = "pi_balance";
    await expect(
      (bookingRouter.confirmBooking as any)._def.resolver({
        input: { paymentIntentId: "pi_balance" },
        ctx: {},
      })
    ).rejects.toThrow("balance payment link");
    await expect(
      confirmStripeCheckoutSession({
        ...session(),
        client_reference_id: "42",
        metadata: {},
      } as Stripe.Checkout.Session)
    ).rejects.toThrow("legacy client reference");
    expect(mocks.createReservation).not.toHaveBeenCalled();
    expect(mocks.legacyReceipt).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });
  it("keeps ordinary manual checkout and legacy confirmed-booking flows unchanged", async () => {
    link().bookingId = null;
    link().hostawayReservationId = null;
    link().stripeCheckoutSessionId = null;
    link().nightlyRate = "200.00";
    link().customLineItems = null;
    await checkout();
    expect(mocks.calendar).toHaveBeenCalledOnce();
    expect(mocks.state).not.toHaveBeenCalled();
    expect(
      mocks.createSession.mock.calls[0][0].metadata.owner_booking_id
    ).toBeUndefined();
    owner().bookingSource = "website";
    mocks.retrieveIntent.mockResolvedValue({ status: "succeeded" });
    owner().stripePaymentIntentId = "pi_legacy";
    const result = await (bookingRouter.confirmBooking as any)._def.resolver({
      input: { paymentIntentId: "pi_legacy" },
      ctx: {},
    });
    expect(result.success).toBe(true);
    expect(mocks.createReservation).not.toHaveBeenCalled();
  });
});
