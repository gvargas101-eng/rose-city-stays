import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  link: null as any,
  confirmation: undefined as any,
  confirmationError: false,
}));
vi.mock("wouter", () => ({
  useParams: () => ({ token: "owner-token" }),
  useLocation: () => ["/booking/pay/owner-token", vi.fn()],
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    booking: {
      getManualBookingLink: {
        useQuery: () => ({ data: mocks.link, isLoading: false, error: null }),
      },
      createManualBookingCheckout: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      confirmManualBooking: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
          isError: mocks.confirmationError,
          data: mocks.confirmation,
        }),
      },
    },
  },
}));
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
import ManualBookingPay from "../client/src/pages/ManualBookingPay";
import ManualBookingConfirm from "../client/src/pages/ManualBookingConfirm";
const render = (component: React.ComponentType) =>
  renderToStaticMarkup(React.createElement(component));
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", {
    location: {
      search: "?token=owner-token&session_id=cs_owner",
      origin: "https://example.com",
    },
  });
  mocks.confirmationError = false;
  mocks.confirmation = undefined;
  mocks.link = {
    propertyName: "Private property",
    propertySlug: "private",
    checkIn: Date.UTC(2027, 0, 10),
    checkOut: Date.UTC(2027, 0, 12),
    nights: 2,
    guestCount: 4,
    nightlyRate: "0",
    cleaningFee: "0",
    discountAmount: "0",
    extraGuestFee: "0",
    taxAmount: "0",
    totalAmount: "400",
    securityDepositAmount: 0,
    existingReservation: true,
    originalReservationTotal: 500,
    amountPaid: 100,
    balanceDue: 400,
    customLineItems: [{ label: "Remaining reservation balance", amount: 400 }],
  };
});
afterEach(() => vi.unstubAllGlobals());
describe("owner reservation guest payment wording", () => {
  it("shows existing reservation total, received funds and only the balance due now", () => {
    const html = render(ManualBookingPay);
    expect(html).toContain("Pay Your Reservation Balance");
    expect(html).toContain("Reservation total");
    expect(html).toContain("$500.00");
    expect(html).toContain("Already received");
    expect(html).toContain("$100.00");
    expect(html).toContain("Balance due now");
    expect(html).toContain("$400.00");
    expect(html).toContain("does not create another reservation");
    expect(html).not.toContain("$0.00 × 2");
  });
  it("preserves new booking wording for payment-link-only stays", () => {
    mocks.link.existingReservation = false;
    const html = render(ManualBookingPay);
    expect(html).toContain("Complete Your Booking");
    expect(html).not.toContain("Pay Your Reservation Balance");
  });
  it("confirms a payment against the existing booking, not a newly created stay", () => {
    mocks.confirmation = {
      ...mocks.link,
      bookingStatus: "confirmed",
      amountPaid: 500,
      balanceDue: 0,
      depositAmount: 0,
      existingReservation: true,
    };
    const html = render(ManualBookingConfirm);
    expect(html).toContain("Balance Payment Received");
    expect(html).toContain("No additional reservation was created");
    expect(html).toContain("This balance payment");
    expect(html).toContain("Total received");
    expect(html).not.toContain("You&#x27;re Booked!");
  });
  it("never displays successful booking or payment before the server has verified it", () => {
    const html = render(ManualBookingConfirm);
    expect(html).toContain("Verifying your payment");
    expect(html).not.toContain("Booked!");
    expect(html).not.toContain("Payment Received");
  });
  it("does not invent a successful payment when confirmation fails", () => {
    mocks.confirmationError = true;
    const html = render(ManualBookingConfirm);
    expect(html).toContain("We could not verify this payment");
    expect(html).not.toContain("Your payment was received");
  });
  it("keeps the canceled reservation screen even when a late payment was actually received", () => {
    mocks.confirmation = {
      ...mocks.link,
      bookingStatus: "cancelled",
      depositAmount: 0,
    };
    const html = render(ManualBookingConfirm);
    expect(html).toContain("Reservation Canceled");
    expect(html).not.toContain("Balance Payment Received");
  });
});
