import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { calendarStayNights } from "@/lib/calendarBooking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HostawayReservationEntry } from "../../../server/hostaway";

export type SelectedCalendarReservation = HostawayReservationEntry & { propertySlug: string; propertyName: string };

function fullDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : date;
}
function money(value: number, currency: string | null) {
  if (!currency) return `${value.toFixed(2)} (currency not provided)`;
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value); }
  catch { return `${value.toFixed(2)} ${currency}`; }
}

/** Mounted only while a reservation is selected; never loads contact data for every bar. */
export function CalendarReservationDetails({ selected, onClose, restoreFocus }: {
  selected: SelectedCalendarReservation;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const input = useMemo(() => ({ reservationId: selected.id, propertySlug: selected.propertySlug }), [selected.id, selected.propertySlug]);
  const { data, isLoading, isFetching, error, refetch } = trpc.admin.getCalendarReservationDetails.useQuery(input, {
    staleTime: 0, retry: false, refetchOnWindowFocus: false,
  });
  // Preserve the original, un-clipped calendar range even while the detail read is pending.
  // Only validated server data can add contact information or a website pricing record.
  const reservation = !error && data ? data.reservation : selected;
  const website = !error ? data?.websiteBooking : null;
  const contact = !error ? data?.reservation : null;
  const nights = calendarStayNights(reservation.arrivalDate, reservation.departureDate);
  const forbidden = error?.data?.code === "FORBIDDEN" || error?.data?.code === "UNAUTHORIZED";
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto overflow-x-hidden p-4 text-foreground sm:max-w-2xl sm:p-6"
        onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}
      >
        <DialogHeader>
          <DialogTitle className="pr-6">Reservation details</DialogTitle>
          <DialogDescription className="break-words">
            {selected.propertyName} · Hostaway reservation #{selected.id}. Full stay, not just the visible calendar dates.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold break-words min-w-0">{reservation.guestName}</h2>
            <Badge variant="secondary" className="capitalize">{reservation.status || "Status not provided"}</Badge>
          </div>
          <dl className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Check-in</dt><dd className="font-medium"><time dateTime={reservation.arrivalDate}>{fullDate(reservation.arrivalDate)}</time></dd></div>
            <div><dt className="text-xs text-muted-foreground">Check-out</dt><dd className="font-medium"><time dateTime={reservation.departureDate}>{fullDate(reservation.departureDate)}</time></dd></div>
            <div><dt className="text-xs text-muted-foreground">Full stay</dt><dd>{nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "Dates could not be verified"} · Check-out night excluded</dd></div>
            <div><dt className="text-xs text-muted-foreground">Guests</dt><dd>{reservation.numberOfGuests ?? "Not provided"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Property</dt><dd className="break-words">{selected.propertyName}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Channel</dt><dd className="break-words">{reservation.channelName || "Not provided"}</dd></div>
          </dl>
          {isLoading && <p role="status" className="text-sm text-muted-foreground">Loading verified contact and booking details…</p>}
          {error && <div role="alert" className="space-y-2 text-sm">
            <p className="text-destructive">{forbidden ? "Your admin session is unavailable. Sign in again to view private reservation details."
              : error.data?.code === "NOT_FOUND" ? "This reservation is no longer available or does not match this property."
              : "Additional reservation details could not be loaded. The full dates above are from the calendar; refresh to verify any recent changes."}</p>
            {!forbidden && <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => { void refetch(); }}>Retry details</Button>}
          </div>}
          {contact && <section aria-label="Guest contact information" className="space-y-2">
            <h3 className="text-sm font-semibold">Guest contact</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all">{contact.email || "Not provided"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="break-words">{contact.phone || "Not provided"}</dd></div>
            </dl>
          </section>}
          {contact && <section aria-label="Hostaway reservation total" className="rounded-lg border p-3 text-sm space-y-1">
            <p className="font-semibold">Hostaway reservation total</p>
            <p>{contact.totalPrice !== null ? money(contact.totalPrice, contact.currency) : "Not provided by Hostaway"}</p>
            <p className="text-xs text-muted-foreground">Reservation price only. This is not proof of payment, a balance due, or a security deposit charge.</p>
          </section>}
          {website ? <section aria-label="Matching website booking" className="space-y-2">
            <h3 className="text-sm font-semibold">Matching website booking #{website.id}</h3>
            <p className="text-xs text-muted-foreground">{website.source === "owner" ? "Owner-created" : "Website"} record · Reservation status: {website.status}. Recorded website pricing may differ from the current Hostaway total after stay changes.</p>
            <dl className="rounded-lg border divide-y text-sm">
              {website.items.map((item, index) => <div key={index} className="flex items-start justify-between gap-3 px-3 py-2"><dt className="break-words min-w-0">{item.label}</dt><dd className="shrink-0 tabular-nums">{money(item.amount, website.currency)}</dd></div>)}
              <div className="flex items-start justify-between gap-3 px-3 py-2 font-semibold"><dt>Recorded total</dt><dd className="shrink-0 tabular-nums">{website.total !== null ? money(website.total, website.currency) : "Not provided"}</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">Recorded line items only; other adjustments may be included in the total. Deposits are separate.</p>
            <dl className="space-y-1 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><dt>Payment state</dt><dd className="font-medium">{website.paymentState}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt>Amount received (website record)</dt><dd>{website.received !== null ? money(website.received, website.currency) : "Not independently verified"}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt>Balance (website record)</dt><dd>{website.balance !== null ? money(website.balance, website.currency) : "Not independently verified"}</dd></div>
            </dl>
          </section> : data && !error && <p className="text-sm text-muted-foreground">{data.websiteBookingState === "unavailable"
            ? "Website booking lookup is unavailable. Showing verified Hostaway reservation details only."
            : data.websiteBookingState === "ambiguous" ? "More than one website record is linked to this reservation. No website pricing is shown until the link is reviewed."
            : "No matching website booking is linked to this reservation. Showing Hostaway reservation details only; itemization is not provided by this read."}</p>}
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <p className="text-xs text-muted-foreground">Read-only. No reservation, payment, or deposit changes.</p>
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
