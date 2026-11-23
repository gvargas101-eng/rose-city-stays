import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  links: [] as any[],
  bookings: [] as any[],
  stateOverrides: new Map<number, unknown>(),
  stateIndex: 0,
  tree: null as any,
  createBooking: vi.fn(),
  createLink: vi.fn(),
  createBalanceLink: vi.fn(),
  ownerOptions: null as any,
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
      return actual.useState(mocks.stateOverrides.has(index) ? mocks.stateOverrides.get(index) : initial);
    },
  };
});
vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({
    admin: {
      listManualBookingLinks: { invalidate: vi.fn() },
      listBookings: { invalidate: vi.fn() },
      getReservationsForCalendar: { invalidate: vi.fn() },
    },
    hostaway: { calendar: { invalidate: vi.fn() } },
  }),
  admin: {
    listProperties: { useQuery: () => ({ data: [{ slug: "sample-house", name: "Sample house", hostawayListingId: 12345, active: 1 }] }) },
    listBookings: { useQuery: () => ({ data: mocks.bookings, refetch: vi.fn() }) },
    listManualBookingLinks: { useQuery: () => ({ data: mocks.links, isLoading: false, refetch: vi.fn() }) },
    searchGuestProfiles: { useQuery: () => ({ data: [], isFetching: false }) },
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
  hostaway: { calendar: { useQuery: () => ({ data: undefined, isFetching: false }) } },
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

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("crypto", { randomUUID });
  vi.stubGlobal("window", {
    location: { origin: "https://preview.example.com" },
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
  mocks.stateIndex = 0;
  mocks.storage.clear();
  mocks.confirm.mockReturnValue(true);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
const render = (component = AdminManualBookings) => {
  mocks.stateIndex = 0;
  return renderToStaticMarkup(React.createElement(component));
};
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
