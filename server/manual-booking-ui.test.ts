import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  links: [] as any[],
  bookings: [] as any[],
  stateOverrides: new Map<number, unknown>(),
  stateUpdates: new Map<number, unknown>(),
  stateValues: new Map<number, unknown>(),
  stateIndex: 0,
  refIndex: 0,
  refs: new Map<number, { current: unknown }>(),
  captureEffects: false,
  effects: [] as (() => unknown)[],
  propertiesResult: { data: [{ slug: "sample-house", name: "Sample house", hostawayListingId: 12345, active: 1, cleaningFee: "85.00" }], error: null } as any,
  calendarResult: { data: undefined, isFetching: false } as any,
  calendarQuery: vi.fn(),
  tree: null as any,
  createBooking: vi.fn(),
  createLink: vi.fn(),
  ownerServiceCreate: vi.fn(),
  createBalanceLink: vi.fn(),
  ownerOptions: null as any,
  searchResult: { data: [], isFetching: false, error: null } as any,
  searchQuery: vi.fn(),
  retryGuestSearch: vi.fn(),
  syncStatusResult: { data: null, isLoading: false, error: null } as any,
  syncResult: { data: undefined, isPending: false, error: null } as any,
  syncGuests: vi.fn(),
  syncOptions: null as any,
  invalidateGuestSearch: vi.fn(),
  invalidateGuestSyncStatus: vi.fn(),
  confirm: vi.fn(() => true),
  storage: new Map<string, string>(),
  mutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("react", async importOriginal => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = mocks.stateIndex++;
      const [value, setValue] = actual.useState(mocks.stateOverrides.has(index) ? mocks.stateOverrides.get(index) : initial);
      mocks.stateValues.set(index, value);
      return [value, (next: any) => {
        const previous = mocks.stateUpdates.has(index) ? mocks.stateUpdates.get(index) : value;
        mocks.stateUpdates.set(index, typeof next === "function" ? next(previous) : next);
        setValue(next);
      }];
    },
    useRef: (initial: unknown) => {
      const index = mocks.refIndex++;
      const ref = actual.useRef(initial);
      if (!mocks.captureEffects) return ref;
      if (!mocks.refs.has(index)) mocks.refs.set(index, ref);
      return mocks.refs.get(index);
    },
    useEffect: (effect: () => unknown, deps: unknown[]) => {
      actual.useEffect(effect as React.EffectCallback, deps);
      if (mocks.captureEffects) mocks.effects.push(effect);
    },
  };
});
vi.mock("./owner-bookings", async importOriginal => {
  const actual = await importOriginal<typeof import("./owner-bookings")>();
  return { ...actual, createOwnerBooking: mocks.ownerServiceCreate };
});
vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({
    admin: {
      listManualBookingLinks: { invalidate: vi.fn() },
      listBookings: { invalidate: vi.fn() },
      getReservationsForCalendar: { invalidate: vi.fn() },
      searchGuestProfiles: { invalidate: mocks.invalidateGuestSearch },
      getGuestSyncStatus: { invalidate: mocks.invalidateGuestSyncStatus },
    },
    hostaway: { calendar: { invalidate: vi.fn() } },
  }),
  admin: {
    listProperties: { useQuery: () => mocks.propertiesResult },
    listBookings: { useQuery: () => ({ data: mocks.bookings, refetch: vi.fn() }) },
    listManualBookingLinks: { useQuery: () => ({ data: mocks.links, isLoading: false, refetch: vi.fn() }) },
    searchGuestProfiles: { useQuery: (...args: unknown[]) => {
      mocks.searchQuery(...args);
      return { ...mocks.searchResult, refetch: mocks.retryGuestSearch };
    } },
    getGuestSyncStatus: { useQuery: () => mocks.syncStatusResult },
    syncHostawayGuests: { useMutation: (options: unknown) => {
      mocks.syncOptions = options;
      return { ...mocks.syncResult, mutate: mocks.syncGuests };
    } },
    createManualBookingLink: { useMutation: () => ({ mutate: mocks.createLink, isPending: false }) },
    revokeManualBookingLink: { useMutation: mocks.mutation },
    refreshBookingStatuses: { useMutation: mocks.mutation },
    updateBookingStatus: { useMutation: mocks.mutation },
    releaseDepositHold: { useMutation: mocks.mutation },
    captureDepositHold: { useMutation: mocks.mutation },
  },
  ownerBookings: {
    create: { useMutation: (options: unknown) => { mocks.ownerOptions = options; return { mutate: mocks.createBooking, isPending: false }; } },
    createPaymentLink: { useMutation: () => ({ mutate: mocks.createBalanceLink, isPending: false }) },
  },
  hostaway: { calendar: { useQuery: (...args: unknown[]) => { mocks.calendarQuery(...args); return mocks.calendarResult; } } },
  discountCodes: { validate: { useMutation: mocks.mutation } },
  extensions: { quote: { useMutation: mocks.mutation }, createAndCollect: { useMutation: mocks.mutation } },
  changes: { quote: { useMutation: mocks.mutation }, create: { useMutation: mocks.mutation }, refund: { useMutation: mocks.mutation } },
} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("../client/src/pages/admin/AdminLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => { mocks.tree = children; return children; },
}));
import { toast } from "sonner";
import AdminManualBookings from "../client/src/pages/admin/AdminManualBookings";
import AdminBookings from "../client/src/pages/admin/AdminBookings";
import { ownerBookingsRouter } from "./routers/ownerBookings";

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("crypto", { randomUUID });
  vi.stubGlobal("window", {
    location: { origin: "https://preview.example.com", search: "" },
    confirm: mocks.confirm,
    sessionStorage: {
      getItem: (key: string) => mocks.storage.get(key) ?? null,
      setItem: (key: string, value: string) => mocks.storage.set(key, value),
      removeItem: (key: string) => mocks.storage.delete(key),
    },
  });
});
afterEach(() => {
  mocks.links.length = 0;
  mocks.bookings.length = 0;
  mocks.stateOverrides.clear();
  mocks.stateUpdates.clear();
  mocks.stateValues.clear();
  mocks.stateIndex = 0;
  mocks.refIndex = 0;
  mocks.refs.clear();
  mocks.captureEffects = false;
  mocks.effects.length = 0;
  mocks.propertiesResult = { data: [{ slug: "sample-house", name: "Sample house", hostawayListingId: 12345, active: 1, cleaningFee: "85.00" }], error: null };
  mocks.calendarResult = { data: undefined, isFetching: false };
  mocks.searchResult = { data: [], isFetching: false, error: null };
  mocks.syncStatusResult = { data: null, isLoading: false, error: null };
  mocks.syncResult = { data: undefined, isPending: false, error: null };
  mocks.syncOptions = null;
  mocks.storage.clear();
  mocks.confirm.mockReturnValue(true);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
const render = (component = AdminManualBookings) => {
  mocks.stateIndex = 0;
  mocks.refIndex = 0;
  mocks.effects.length = 0;
  return renderToStaticMarkup(React.createElement(component));
};
function flushEffects() {
  for (const effect of mocks.effects.splice(0)) effect();
}
function rerenderAfterUpdates() {
  // Model the same mounted component across DB query updates without a browser,
  // live database or payments; preserve state and refs, then run queued effects.
  for (const [index, value] of mocks.stateValues) mocks.stateOverrides.set(index, value);
  for (const [index, value] of mocks.stateUpdates) mocks.stateOverrides.set(index, value);
  mocks.stateUpdates.clear();
  const html = render();
  flushEffects();
  return html;
}
function elements(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements((node.props as any).children)];
}
function submit() {
  const form = elements(mocks.tree).find(node => node.type === "form");
  form.props.onSubmit({ preventDefault: vi.fn() });
}
function validForm(overrides: Record<string, unknown> = {}) {
  mocks.stateOverrides.set(0, {
    propertySlug: "sample-house", checkIn: "2027-01-10", checkOut: "2027-01-12", guestCount: 2,
    nightlyRate: 100, cleaningFee: 0, discountAmount: 0, discountMode: "fixed", discountPercent: 0,
    discountLabel: "", extraGuestFee: 0, taxRate: 0, taxOverride: "",
    bypassCameraDisclosure: false, bypassGuestCount: false, bypassTermsAcceptance: false,
    bypassIdUpload: false, bypassAvailabilityCheck: false, adminNotes: "", guestName: "Jane Ownerguest",
    guestEmail: "jane@example.com", guestPhone: "", expiryDays: 7, securityDepositOverride: "",
    guestNote: "", customLineItems: [], amountReceived: 0, paymentReference: "", allowUnpaid: true,
    createPaymentLink: false, ...overrides,
  });
}
function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, propertyId: "sample-house", guestName: "Owner Guest", guestEmail: "guest@example.com",
    guestPhone: null, checkIn: Date.parse("2027-01-10"), checkOut: Date.parse("2027-01-12"), nights: 2,
    guestCount: 2, nightlyRate: "100.00", subtotal: "200.00", cleaningFee: "0.00", taxRate: "0.00",
    taxAmount: "0.00", totalAmount: "200.00", status: "confirmed", bookingSource: "owner", paidAmount: "0.00",
    externalPaymentReference: null, hostawayReservationId: "987654", createdAt: Date.now(), ...overrides,
  };
}

describe("manual booking owner UI", () => {
  it("defaults to actual booking and retains separate payment-link-only mode", () => {
    const html = render();
    expect(html).toContain("Create a Manual Booking");
    expect(html).toContain("Create Booking — Actual Hostaway Reservation");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Payment Link Only");
    expect(html).toContain("Review &amp; Create Booking");
    expect(html).toContain("even when unpaid");
    expect(html).toContain("Creating here does not charge a card");
    expect(html).toContain("Hostaway auto-payment rules may still schedule collection");
    expect(html).toContain("Use one collection channel only");
    expect(html).not.toContain("Availability Check (Override)");
    expect(html).toContain("Name &amp; Email Required");
    expect(html).toContain("Amount received");
    expect(html).toContain("Balance due");
    expect(html).toContain("I explicitly allow this unpaid balance");
    expect(html).toContain("Add Credit");
    expect(html).toContain("Add Charge");
    expect(html).toContain("Percent (%)");
    expect(html).toContain("Custom Tax Amount");
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
  });
  it("shows the legacy payment-only behavior only in that mode", () => {
    mocks.stateOverrides.set(1, "link");
    const html = render();
    expect(html).toContain("Payment Link Only — No Reservation Yet");
    expect(html).toContain("confirmed only after payment succeeds");
    expect(html).toContain("Generate Payment Link Only");
    expect(html).toContain("Availability Check (Override)");
    expect(html).not.toContain("I explicitly allow this unpaid balance");
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
  it("renders a canceled reservation alongside its paid payment link", () => {
    mocks.links.push({ id: 1, token: "sample-token", propertyName: "Sample house", status: "paid", bookingStatus: "cancelled", expiresAt: Date.now() + 86400000,
      checkIn: Date.parse("2027-01-10"), checkOut: Date.parse("2027-01-13"), guestCount: 2, totalAmount: "545.50" });
    const html = render();
    expect(html).toContain("Paid");
    expect(html).toContain("Booking: ");
    expect(html).toContain("Canceled");
  });
  it("asks for explicit confirmation with guest, stay, total, received and unpaid warning", () => {
    validForm();
    render();
    submit();
    expect(mocks.confirm).toHaveBeenCalledOnce();
    const confirmation = mocks.confirm.mock.calls[0]![0];
    expect(confirmation).toContain("Jane Ownerguest (jane@example.com)");
    expect(confirmation).toContain("Sample house");
    expect(confirmation).toContain("2027-01-10 → 2027-01-12");
    expect(confirmation).toContain("Reservation total: $200.00");
    expect(confirmation).toContain("Amount received: $0.00");
    expect(confirmation).toContain("Balance due: $200.00");
    expect(confirmation).toContain("blocked in Hostaway even if this booking is unpaid");
    expect(confirmation).toContain("Hostaway auto-payment rules may still schedule collection");
    expect(mocks.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      amountReceived: 0, allowUnpaid: true, createPaymentLink: false,
      guestName: "Jane Ownerguest", guestEmail: "jane@example.com", requestKey: expect.any(String),
    }));
    expect(mocks.createLink).not.toHaveBeenCalled();
  });
  it("never submits a booking when confirmation is dismissed", () => {
    validForm();
    mocks.confirm.mockReturnValue(false);
    render();
    submit();
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
  it("requires explicit unpaid authorization and a reference for already-received money", () => {
    validForm({ allowUnpaid: false });
    render(); submit();
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Explicitly allow"));
    validForm({ amountReceived: 50, paymentReference: "" });
    render(); submit();
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("payment reference"));
  });
  it("requires guest name and email for actual bookings", () => {
    validForm({ guestEmail: "" });
    render(); submit();
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Guest name and email"));
  });
  it("allows a fully credited complimentary booking without collecting payment", () => {
    validForm({ customLineItems: [{ label: "Courtesy", kind: "credit", amount: 200 }], allowUnpaid: false });
    render(); submit();
    expect(mocks.createBooking).toHaveBeenCalledWith(expect.objectContaining({ totalAmount: 0, amountReceived: 0, allowUnpaid: false, createPaymentLink: false }));
  });
  it("rejects credits exceeding charges and payment links below the collection minimum", () => {
    validForm({ customLineItems: [{ label: "Excess", kind: "credit", amount: 201 }] });
    render(); submit();
    expect(mocks.createBooking).not.toHaveBeenCalled();
    validForm({ amountReceived: 199.75, paymentReference: "cash", createPaymentLink: true });
    render(); submit();
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("at least $0.50"));
  });
  it("retains a request key across failed retries and page reloads", () => {
    validForm();
    const key = randomUUID();
    mocks.storage.set("rose-city-owner-booking-request-key", key);
    render(); submit();
    expect(mocks.createBooking).toHaveBeenLastCalledWith(expect.objectContaining({ requestKey: key }));
    mocks.ownerOptions.onError(new Error("network interrupted"));
    expect(mocks.storage.get("rose-city-owner-booking-request-key")).toBe(key);
    render(); submit();
    expect(mocks.createBooking).toHaveBeenLastCalledWith(expect.objectContaining({ requestKey: key }));
  });
  it("keeps legacy link creation separate and does not ask to create a reservation", () => {
    validForm();
    mocks.stateOverrides.set(1, "link");
    render(); submit();
    expect(mocks.createLink).toHaveBeenCalledOnce();
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("renders confirmed-but-unpaid results without a fake payment confirmation", () => {
    mocks.stateOverrides.set(3, { bookingId: 5, hostawayReservationId: "987654", status: "confirmed", totalAmount: 200,
      amountPaid: 0, balanceDue: 200, paymentStatus: "unpaid", alreadyCreated: false });
    const html = render();
    expect(html).toContain("Booking confirmed in Hostaway");
    expect(html).toContain("987654");
    expect(html).toContain("unpaid");
    expect(html).toContain("Generate payment link for balance");
    expect(html).toContain('href="/admin/bookings"');
    expect(html).not.toContain("Booking request pending");
    expect(html).toContain("Creating here does not charge a card");
    const button = elements(mocks.tree).find(node => node.props.children === "Generate payment link for balance");
    button.props.onClick();
    expect(mocks.createBalanceLink).toHaveBeenCalledWith({ bookingId: 5, expiryDays: 7 });
  });
  it.each(["paid", "partial", "complimentary"])("renders accurate %s result state", paymentStatus => {
    mocks.stateOverrides.set(3, { bookingId: 5, hostawayReservationId: "987654", status: "confirmed", totalAmount: paymentStatus === "complimentary" ? 0 : 200,
      amountPaid: paymentStatus === "paid" ? 200 : paymentStatus === "partial" ? 50 : 0,
      balanceDue: paymentStatus === "partial" ? 150 : 0, paymentStatus, alreadyCreated: false });
    expect(render()).toContain(`>${paymentStatus}</dd>`);
  });
  it("displays pending creation separately from unpaid confirmed reservations", () => {
    mocks.stateOverrides.set(3, { bookingId: 5, hostawayReservationId: null, status: "pending", totalAmount: 200,
      amountPaid: 0, balanceDue: 200, paymentStatus: "unpaid", alreadyCreated: false });
    const html = render();
    expect(html).toContain("Booking request pending — not yet confirmed");
    expect(html).toContain("Check Hostaway before starting a new request");
    expect(html).toContain("without posting a second reservation");
    expect(html).not.toContain("Generate payment link for balance");
  });
  it("shows provider/link warnings on a confirmed booking without implying creation failed", () => {
    mocks.stateOverrides.set(3, { bookingId: 5, hostawayReservationId: "987654", status: "confirmed", totalAmount: 200,
      amountPaid: 0, balanceDue: 200, paymentStatus: "unpaid", alreadyCreated: false,
      error: "Hostaway native collection scheduled — website link unavailable" });
    const html = render();
    expect(html).toContain("Booking confirmed in Hostaway");
    expect(html).toContain("Booking exists — do not recreate it");
    expect(html).toContain("Hostaway native collection scheduled");
    expect(html).not.toContain("Booking creation failed");
  });
  it("does not submit when the owner changes booking mode", () => {
    validForm();
    render();
    const button = elements(mocks.tree).find(node => node.props.children === "Payment Link Only");
    button.props.onClick();
    expect(button.props.type).toBe("button");
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("never passes the legacy availability override into an actual reservation", () => {
    validForm({ bypassAvailabilityCheck: true });
    render(); submit();
    expect(mocks.createBooking).toHaveBeenCalledWith(expect.objectContaining({ bypassAvailabilityCheck: false }));
  });
});

describe("Master Calendar manual booking drafts", () => {
  const requestStorageKey = "rose-city-owner-booking-request-key";
  const calendarQuery = "?source=calendar&propertySlug=sample-house&checkIn=2027-03-13&checkOut=2027-03-15";

  function startDraft(search = calendarQuery) {
    window.location.search = search;
    mocks.captureEffects = true;
    const html = render();
    flushEffects();
    return html;
  }
  function expectNoCreation() {
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
    expect(mocks.createBalanceLink).not.toHaveBeenCalled();
    expect(mocks.ownerServiceCreate).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.storage.size).toBe(0);
  }

  it("prefills only DB-verified property and exact date strings after properties arrive", () => {
    mocks.propertiesResult = { data: undefined, error: null };
    expect(startDraft()).toContain("Verifying the Master Calendar selection");
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expect(mocks.calendarQuery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ enabled: false }));

    mocks.propertiesResult = { data: [{ slug: "sample-house", name: "Sample house", cleaningFee: "95.50", active: 1 }], error: null };
    rerenderAfterUpdates();
    expect(mocks.stateUpdates.get(0)).toMatchObject({
      propertySlug: "sample-house", checkIn: "2027-03-13", checkOut: "2027-03-15", cleaningFee: 95.5,
      nightlyRate: 0, guestName: "", guestEmail: "", allowUnpaid: false, createPaymentLink: false,
    });
    const html = rerenderAfterUpdates();
    expect(html).toContain("Selected from Master Calendar — review availability, pricing and guest details before creating. No reservation has been created.");
    const dateInputs = elements(mocks.tree).filter(node => node.props.type === "date");
    expect(dateInputs[0].props.value).toBe("2027-03-13");
    expect(dateInputs[1].props.value).toBe("2027-03-15");
    expect(dateInputs[1].props.min).toBe("2027-03-13");
    expect(html).toContain("Create Booking — Actual Hostaway Reservation");
    expect(mocks.calendarQuery).toHaveBeenLastCalledWith({
      propertyId: "sample-house", startDate: "2027-03-13", endDate: "2027-03-15",
    }, expect.objectContaining({ enabled: true }));
    expectNoCreation();
  });

  it.each([0, "0.00"])("accepts a private admin property and current DB cleaning fee %s", cleaningFee => {
    mocks.propertiesResult = { data: [{ slug: "hidden-house", name: "Hidden house", active: 0, cleaningFee }], error: null };
    startDraft(calendarQuery.replace("sample-house", "hidden-house"));
    expect(mocks.stateUpdates.get(0)).toMatchObject({ propertySlug: "hidden-house", cleaningFee: 0 });
    const html = rerenderAfterUpdates();
    expect(html).toContain("Hidden house (Private / unpublished)");
    expect(html).toContain('<option value="hidden-house" selected="">');
    expectNoCreation();
  });

  it("ignores every URL price, guest, payment, bypass and mode field", () => {
    startDraft(`${calendarQuery}&nightlyRate=1&cleaningFee=999&extraGuestFee=42&taxRate=0&taxOverride=0&discountAmount=500&guestCount=99&guestName=Injected&guestEmail=evil%40example.com&guestPhone=123&bypassCameraDisclosure=true&bypassGuestCount=true&bypassTermsAcceptance=true&bypassIdUpload=true&bypassAvailabilityCheck=true&amountReceived=500&paymentReference=paid&allowUnpaid=true&createPaymentLink=true&mode=link&requestKey=attacker&adminNotes=unsafe&securityDepositOverride=0&customLineItems=unsafe`);
    expect(mocks.stateUpdates.get(0)).toEqual({
      ...mocks.stateValues.get(0) as object,
      propertySlug: "sample-house", checkIn: "2027-03-13", checkOut: "2027-03-15", cleaningFee: 85,
    });
    expect(mocks.stateValues.get(1)).toBe("booking");
    expect(mocks.stateUpdates.has(1)).toBe(false);
    expect(mocks.stateUpdates.has(2)).toBe(false);
    expect(mocks.stateUpdates.has(3)).toBe(false);
    expectNoCreation();
  });

  it.each([
    "?source=calendar&propertySlug=sample-house&checkIn=2027-02-30&checkOut=2027-03-02",
    "?source=calendar&propertySlug=sample-house&checkIn=2027-2-03&checkOut=2027-02-04",
    "?source=calendar&propertySlug=sample-house&checkIn=2027-03-15&checkOut=2027-03-13",
    "?source=calendar&propertySlug=sample-house&checkIn=2027-03-13&checkOut=2027-03-13",
    "?source=calendar&propertySlug=sample-house&checkIn=2027-01-01&checkOut=2028-01-03",
    "?source=calendar&propertySlug=bad%2Fslug&checkIn=2027-03-13&checkOut=2027-03-15",
    "?source=calendar&propertySlug=sample-house&checkIn=2027-03-13",
  ])("rejects invalid/incomplete calendar draft without prefill: %s", search => {
    expect(startDraft(search)).toContain("The calendar selection is invalid or incomplete");
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expect(mocks.calendarQuery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ enabled: false }));
    submit();
    expect(toast.error).toHaveBeenCalledWith("Select a property");
    expectNoCreation();
  });

  it.each([calendarQuery.replace("calendar", "other"), calendarQuery.replace("source=calendar&", "")])("does not trust non-calendar sources or apply their fields", search => {
    const html = startDraft(search);
    expect(html).not.toContain("Selected from Master Calendar");
    expect(html).not.toContain("The calendar selection is invalid");
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expectNoCreation();
  });

  it("rejects unknown property slugs, including static properties absent from the DB", () => {
    startDraft(calendarQuery.replace("sample-house", "the-briar"));
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expect(rerenderAfterUpdates()).toContain("The calendar property could not be found");
    submit();
    expect(toast.error).toHaveBeenCalledWith("Select a property");
    expectNoCreation();
  });

  it("shows safe property-query failure without exposing DB details or applying the draft", () => {
    mocks.propertiesResult = { data: undefined, error: new Error("private SQL credentials") };
    const html = startDraft();
    expect(html).toContain("Could not verify the calendar property");
    expect(html).not.toContain("private SQL credentials");
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expectNoCreation();
  });

  it("reads the URL once and never overwrites subsequent edits after property refetch", () => {
    startDraft();
    rerenderAfterUpdates();
    const dates = elements(mocks.tree).filter(node => node.props.type === "date");
    dates[0].props.onChange({ target: { value: "2027-04-10" } });
    dates[1].props.onChange({ target: { value: "2027-04-12" } });
    window.location.search = calendarQuery.replace("2027-03-13", "2027-06-01").replace("2027-03-15", "2027-06-03");
    mocks.propertiesResult = { data: [{ slug: "sample-house", name: "Sample house", active: 1, cleaningFee: "200.00" }], error: null };
    rerenderAfterUpdates();
    expect(mocks.stateValues.get(0)).toMatchObject({ checkIn: "2027-04-10", checkOut: "2027-04-12", cleaningFee: 85 });
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expectNoCreation();
  });

  it("the one-time guard also prevents replaying the same prefill effect", () => {
    window.location.search = calendarQuery;
    mocks.captureEffects = true;
    render();
    const prefillEffect = mocks.effects[0];
    prefillEffect();
    expect(mocks.stateUpdates.get(0)).toMatchObject({ propertySlug: "sample-house", cleaningFee: 85 });
    mocks.stateUpdates.clear();
    prefillEffect();
    expect(mocks.stateUpdates.size).toBe(0);
    expectNoCreation();
  });

  it("resets rate override markers and lets the existing Hostaway query load a live rate", () => {
    mocks.stateOverrides.set(13, "sample-house|2027-03-13|2027-03-15");
    mocks.stateOverrides.set(14, "sample-house|2027-03-13|2027-03-15");
    startDraft();
    expect(mocks.stateUpdates.get(13)).toBe(null);
    expect(mocks.stateUpdates.get(14)).toBe(null);
    mocks.calendarResult = { isFetching: false, data: { days: [
      { date: "2027-03-13", price: 180, isAvailable: true, status: "available" },
      { date: "2027-03-14", price: 220, isAvailable: true, status: "available" },
    ] } };
    rerenderAfterUpdates();
    expect(mocks.stateUpdates.get(0)).toMatchObject({ nightlyRate: 200 });
    expect(mocks.stateUpdates.get(13)).toBe("sample-house|2027-03-13|2027-03-15");
    expectNoCreation();
  });

  it("prefill alone cannot bypass guest review, authorization or explicit confirmation", () => {
    startDraft();
    rerenderAfterUpdates();
    submit();
    expect(toast.error).toHaveBeenCalledWith("Guest name and email are required to create a booking");
    expectNoCreation();
  });

  it("creates the actual booking only after the owner completes guest/payment review and confirms", () => {
    startDraft(`${calendarQuery}&mode=link&allowUnpaid=true&guestName=Injected&guestEmail=evil%40example.com`);
    rerenderAfterUpdates();
    expectNoCreation();

    const guestName = elements(mocks.tree).find(node => node.props.id === "manual-guest-name");
    const guestEmail = elements(mocks.tree).find(node => node.props.type === "email");
    guestName.props.onChange({ target: { value: "Reviewed Guest" } });
    guestEmail.props.onChange({ target: { value: "reviewed@example.com" } });
    const unpaidLabel = elements(mocks.tree).find(node => node.type === "label" && Array.isArray(node.props.children)
      && node.props.children.some((child: unknown) => typeof child === "string" && child.startsWith("I explicitly allow")));
    elements(unpaidLabel).find(node => node.props.type === "checkbox").props.onChange({ target: { checked: true } });
    rerenderAfterUpdates();
    expectNoCreation();
    submit();
    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(mocks.confirm).toHaveBeenCalledWith(expect.stringContaining("2027-03-13 → 2027-03-15"));
    expect(mocks.createBooking).toHaveBeenCalledOnce();
    expect(mocks.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      propertySlug: "sample-house", checkIn: Date.parse("2027-03-13T00:00:00Z"),
      checkOut: Date.parse("2027-03-15T00:00:00Z"), nights: 2, cleaningFee: 85,
      guestName: "Reviewed Guest", guestEmail: "reviewed@example.com", allowUnpaid: true,
      bypassAvailabilityCheck: false, createPaymentLink: false,
    }));
    expect(mocks.createLink).not.toHaveBeenCalled();
  });

  it("never replaces an unresolved stored request or renews its key", () => {
    validForm();
    const previous = mocks.stateOverrides.get(0);
    const key = randomUUID();
    mocks.storage.set(requestStorageKey, key);
    expect(startDraft()).toContain("existing reservation request is unresolved");
    expect(render()).toContain("Retry the existing request using its original details and request key");
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expect(mocks.stateValues.get(0)).toEqual(previous);
    expect(mocks.stateUpdates.has(2)).toBe(false);
    expect(mocks.storage.get(requestStorageKey)).toBe(key);
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();

    // Explicit retry remains the existing flow and sends original, not calendar, dates.
    submit();
    expect(mocks.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      requestKey: key, checkIn: Date.parse("2027-01-10T00:00:00Z"), checkOut: Date.parse("2027-01-12T00:00:00Z"),
    }));
  });

  it("does not later apply a blocked calendar draft, even after an explicit reset", () => {
    mocks.storage.set(requestStorageKey, randomUUID());
    startDraft();
    const reset = elements(mocks.tree).find(node => node.props.children === "Reset");
    mocks.confirm.mockReturnValue(false);
    reset.props.onClick();
    expect(mocks.storage.size).toBe(1);
    expect(mocks.stateUpdates.has(0)).toBe(false);
    mocks.confirm.mockReturnValue(true);
    reset.props.onClick();
    rerenderAfterUpdates();
    expect(mocks.stateValues.get(0)).toMatchObject({ propertySlug: "", checkIn: "", checkOut: "" });
    expect(mocks.stateValues.get(17)).toBe("none");
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expect(mocks.storage.size).toBe(0);
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
  });

  it("cancels a delayed draft if a reservation request is attempted before properties arrive", () => {
    validForm();
    mocks.propertiesResult = { data: undefined, error: null };
    startDraft();
    submit();
    const existingKey = mocks.storage.get(requestStorageKey);
    mocks.propertiesResult = { data: [{ slug: "sample-house", name: "Sample house", cleaningFee: "95.00" }], error: null };
    rerenderAfterUpdates();
    expect(mocks.stateUpdates.has(0)).toBe(false);
    expect(mocks.stateUpdates.get(17)).toBe("blocked");
    expect(mocks.storage.get(requestStorageKey)).toBe(existingKey);
    expect(mocks.createBooking).toHaveBeenCalledOnce();
    expect(mocks.confirm).toHaveBeenCalledOnce();
  });

  it.each([undefined, "user"])("a calendar draft cannot grant server create access to role %s", async role => {
    startDraft();
    const draft = mocks.stateUpdates.get(0) as any;
    const caller = ownerBookingsRouter.createCaller({
      user: role ? { id: 1, openId: "not-an-owner", role } : null,
      req: { headers: {} }, res: {},
    } as any);
    await expect(caller.create({
      requestKey: randomUUID(), propertySlug: draft.propertySlug,
      checkIn: Date.parse(`${draft.checkIn}T00:00:00Z`), checkOut: Date.parse(`${draft.checkOut}T00:00:00Z`),
      nights: 2, guestCount: 2, guestName: "Guest", guestEmail: "guest@example.com",
      nightlyRate: 100, cleaningFee: draft.cleaningFee, totalAmount: 285, allowUnpaid: true,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expectNoCreation();
  });
});

describe("manual booking previous guest lookup", () => {
  const profile = { id: 41, fullName: "Jane Returning", email: "jane.returning@example.com", phone: "+15551234567", totalReservations: 3 };
  function search(query = "Ja") {
    mocks.stateOverrides.set(9, query);
    mocks.stateOverrides.set(10, true);
  }
  function searchInput() {
    return elements(mocks.tree).find(node => node.props.id === "previous-guest-search");
  }
  function buttonWithText(text: string) {
    return elements(mocks.tree).find(node => node.props.children === text);
  }

  it("clearly separates previous-guest search from entering a new guest and offers contacts-only import", () => {
    const html = render();
    expect(html).toContain("Find previous guest");
    expect(html).toContain("Type at least 2 characters");
    expect(html).toContain("or enter a new guest below");
    expect(html).toContain("Import/refresh previous guests");
    expect(html).toContain("No reservations are created and no payments are made");
    expect(html).toContain("Last full import: Not imported yet");
    expect(html).not.toContain("No matching guest found");
    expect(mocks.searchQuery).toHaveBeenCalledWith({ query: "" }, expect.objectContaining({ enabled: false }));
    expect(mocks.syncGuests).not.toHaveBeenCalled();
  });
  it("shows instructions rather than an empty result for one-letter queries", () => {
    search(" J ");
    const html = render();
    expect(html).toContain("Type at least 2 characters to find a previous guest");
    expect(html).not.toContain("No matching guest found");
    expect(mocks.searchQuery).toHaveBeenCalledWith({ query: "J" }, expect.objectContaining({ enabled: false }));
  });
  it("shows a safe query error and Retry rather than a false no-match result", () => {
    search();
    mocks.searchResult = { data: [], isFetching: false, error: new Error("private database SQL credentials") };
    const html = render();
    expect(html).toContain("Could not search previous guests");
    expect(html).toContain("Retry guest search");
    expect(html).not.toContain("No matching guest found");
    expect(html).not.toContain("private database SQL credentials");
    buttonWithText("Retry guest search").props.onClick();
    expect(mocks.retryGuestSearch).toHaveBeenCalledOnce();
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
  });
  it("shows loading while fetching and does not call missing data a no-match result", () => {
    search();
    mocks.searchResult = { data: [], isFetching: true, error: null };
    expect(render()).toContain("Searching guest directory…");
    expect(render()).not.toContain("No matching guest found");
    mocks.searchResult = { data: undefined, isFetching: false, error: null };
    expect(render()).toContain("Waiting for the guest directory…");
    expect(render()).not.toContain("No matching guest found");
  });
  it("shows an actual empty result only after the enabled search returns an empty array", () => {
    search();
    const html = render();
    expect(html).toContain("No matching guest found in the imported directory");
    expect(html).toContain("For an older guest, use Import/refresh previous guests");
    expect(html).toContain("Only contact details Hostaway provides can be found");
    expect(mocks.searchQuery).toHaveBeenCalledWith({ query: "Ja" }, expect.objectContaining({ enabled: true }));
  });
  it("selects a previous guest and autofills name, email, and phone without altering stay or financial fields", () => {
    validForm({ amountReceived: 50, paymentReference: "cash", nightlyRate: 175 });
    search();
    mocks.searchResult.data = [profile];
    const html = render();
    expect(html).toContain('role="combobox"');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('role="option"');
    expect(html).toContain("Jane Returning");
    expect(html).toContain("jane.returning@example.com");
    const option = elements(mocks.tree).find(node => node.props.role === "option");
    const preventDefault = vi.fn();
    option.props.onMouseDown({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    option.props.onClick();
    expect(mocks.stateUpdates.get(0)).toEqual({ ...mocks.stateOverrides.get(0) as object,
      guestName: profile.fullName, guestEmail: profile.email, guestPhone: profile.phone });
    expect(mocks.stateUpdates.get(9)).toBe(profile.fullName);
    expect(mocks.stateUpdates.get(10)).toBe(false);
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
  });
  it("clears stale contact fields rather than assigning them to a different selected guest", () => {
    validForm({ guestPhone: "+15550000000" });
    search();
    mocks.searchResult.data = [{ ...profile, email: null, phone: null }];
    render();
    elements(mocks.tree).find(node => node.props.role === "option").props.onClick();
    expect(mocks.stateUpdates.get(0)).toMatchObject({ guestName: profile.fullName, guestEmail: "", guestPhone: "" });
  });
  it("supports focus, keyboard navigation, Enter selection, and Escape without submitting", () => {
    search();
    mocks.searchResult.data = [profile];
    render();
    const input = searchInput();
    input.props.onFocus();
    expect(mocks.stateUpdates.get(10)).toBe(true);
    input.props.onKeyDown({ key: "ArrowDown", preventDefault: vi.fn() });
    expect(mocks.stateUpdates.get(15)).toBe(0);
    mocks.stateOverrides.set(15, 0);
    expect(render()).toContain('aria-activedescendant="previous-guest-41"');
    const preventDefault = vi.fn();
    searchInput().props.onKeyDown({ key: "Enter", preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(mocks.stateUpdates.get(0)).toMatchObject({ guestName: profile.fullName, guestEmail: profile.email, guestPhone: profile.phone });
    searchInput().props.onKeyDown({ key: "Escape", preventDefault: vi.fn() });
    expect(mocks.stateUpdates.get(10)).toBe(false);
    expect(mocks.stateUpdates.get(15)).toBe(-1);
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
  it("does not submit the booking when Enter is pressed in the closed search field", () => {
    validForm();
    render();
    const preventDefault = vi.fn();
    searchInput().props.onKeyDown({ key: "Enter", preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
  });
  it("keeps the dropdown open when focus moves to Retry, and closes it only when focus leaves lookup", () => {
    search();
    render();
    const lookup = elements(mocks.tree).find(node => node.props.onBlur);
    lookup.props.onBlur({ currentTarget: { contains: () => true }, relatedTarget: {} });
    expect(mocks.stateUpdates.has(10)).toBe(false);
    lookup.props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null });
    expect(mocks.stateUpdates.get(10)).toBe(false);
  });
  it("imports historical contacts only on explicit owner action and invalidates both private queries", () => {
    render();
    const button = elements(mocks.tree).find(node => Array.isArray(node.props.children) && node.props.children.includes("Import/refresh previous guests"));
    expect(button.props.type).toBe("button");
    button.props.onClick();
    expect(mocks.syncGuests).toHaveBeenCalledWith({ mode: "historical" });
    mocks.syncOptions.onSuccess();
    expect(mocks.invalidateGuestSearch).toHaveBeenCalledOnce();
    expect(mocks.invalidateGuestSyncStatus).toHaveBeenCalledOnce();
    mocks.syncOptions.onError();
    expect(mocks.invalidateGuestSearch).toHaveBeenCalledTimes(2);
    expect(mocks.invalidateGuestSyncStatus).toHaveBeenCalledTimes(2);
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createLink).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("shows sync pending, safe failure, and success counts without claiming reservations were created", () => {
    mocks.syncResult.isPending = true;
    expect(render()).toContain("Importing previous guest contacts");
    const button = elements(mocks.tree).find(node => Array.isArray(node.props.children) && node.props.children.includes("Importing previous guests…"));
    expect(button.props.disabled).toBe(true);
    mocks.syncResult = { isPending: false, error: new Error("private provider secret"), data: undefined };
    const failure = render();
    expect(failure).toContain("Previous guest import failed");
    expect(failure).not.toContain("private provider secret");
    mocks.syncResult = { isPending: false, error: null, data: { createdGuests: 12, updatedGuests: 7, processed: 19, createdReservations: 19 } };
    const success = render();
    expect(success).toContain("Import complete: 12 new guests, 7 contact refreshes (19 historical records checked)");
    expect(success).not.toContain("19 reservations created");
  });
  it("distinguishes recent sync records from full-import timestamps and does not mislabel them as guest counts", () => {
    mocks.syncStatusResult.data = { lastHistoricalImportAt: null, lastStatus: "success", lastImportedReservations: 100 };
    const html = render();
    expect(html).toContain("Last full import: Not imported yet");
    expect(html).toContain("Latest sync: success");
    expect(html).toContain("100 historical records checked in the latest sync");
    expect(html).not.toContain("100 guests in the directory");
    mocks.syncStatusResult = { data: undefined, isLoading: false, error: new Error("db unavailable") };
    expect(render()).toContain("Directory status unavailable — this does not mean the directory is empty");
    expect(render()).not.toContain("Last full import: Not imported yet");
  });
});

describe("booking administration owner payment rendering", () => {
  it.each([
    ["0.00", "200.00", "Unpaid", "200.00"],
    ["50.00", "200.00", "Partial", "150.00"],
    ["200.00", "200.00", "Paid", "0.00"],
    ["0.00", "0.00", "Complimentary", "0.00"],
  ])("keeps confirmed reservation separate from %s received / %s total", (paidAmount, totalAmount, state, balance) => {
    mocks.bookings.push(booking({ paidAmount, totalAmount }));
    const html = render(AdminBookings);
    expect(html).toContain(`Payment state: ${state}`);
    expect(html).toContain(`Amount received: $${paidAmount}`);
    expect(html).toContain(`Balance due: $${balance}`);
    expect(html).toContain(">confirmed</span>");
    expect(html).not.toContain(">pending</span>");
  });
  it("counts owner received amount instead of owner reservation total in revenue", () => {
    mocks.bookings.push(booking({ paidAmount: "50.00" }));
    mocks.bookings.push(booking({ id: 2, bookingSource: "website", paidAmount: null, totalAmount: "300.00" }));
    const html = render(AdminBookings);
    expect(html).toContain("$350.00 received revenue");
    expect(html).not.toContain("$500.00 received revenue");
  });
  it("shows payment accounting, hides legacy owner move/extend controls and offers collection", () => {
    mocks.bookings.push(booking({ paidAmount: "50.00", externalPaymentReference: "bank-transfer-123" }));
    mocks.stateOverrides.set(6, 1);
    const html = render(AdminBookings);
    expect(html).toContain("Reservation total");
    expect(html).not.toContain("Total charged");
    expect(html).toContain("External payment reference");
    expect(html).toContain("bank-transfer-123");
    expect(html).toContain("No Stripe payment recorded");
    expect(html).toContain("Generate payment link for balance");
    expect(html).not.toContain("Extend stay");
    expect(html).not.toContain("Change stay");
    expect(html).not.toContain("Move or change stay");
    const button = elements(mocks.tree).find(node => node.type === "button" && elements(node).some(child => child.props.children === "Generate payment link for balance"))
      ?? elements(mocks.tree).find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Generate payment link for balance"));
    button.props.onClick();
    expect(mocks.createBalanceLink).toHaveBeenCalledWith({ bookingId: 1 });
  });
  it("preserves website charge labels and existing stay actions", () => {
    mocks.bookings.push(booking({ bookingSource: "website", paidAmount: null }));
    mocks.stateOverrides.set(6, 1);
    const html = render(AdminBookings);
    expect(html).toContain("Total charged");
    expect(html).toContain("Extend stay");
    expect(html).toContain("Change stay");
    expect(html).not.toContain("External payment reference");
  });
});
