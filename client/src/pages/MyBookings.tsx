import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { CalendarDays, Users, MapPin, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { properties } from "@/lib/properties";

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
    paid: { label: "Paid", className: "bg-blue-100 text-blue-700" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
    failed: { label: "Failed", className: "bg-gray-100 text-gray-500" },
  };
  const s = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.className}`}>
      {status === "confirmed" && <CheckCircle2 className="w-3 h-3" />}
      {status === "pending" && <Clock className="w-3 h-3" />}
      {status === "cancelled" && <XCircle className="w-3 h-3" />}
      {s.label}
    </span>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getPropertyName(propertyId: string) {
  const p = properties.find((p) => p.id === propertyId);
  return p?.shortName ?? propertyId;
}

function getPropertyImage(propertyId: string) {
  const p = properties.find((p) => p.id === propertyId);
  return p?.image;
}

export default function MyBookings() {
  const [emailInput, setEmailInput] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const { data: bookings, isLoading, error } = trpc.booking.getByEmail.useQuery(
    { email: submittedEmail! },
    { enabled: !!submittedEmail }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    setSubmittedEmail(trimmed);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <span className="block text-xs tracking-[0.2em] uppercase text-primary mb-3" style={{ fontFamily: "var(--font-body)" }}>
              Guest Portal
            </span>
            <h1 className="text-4xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              My Bookings
            </h1>
            <p className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-body)" }}>
              Enter the email address you used when booking to view your reservation history.
            </p>
          </div>

          {/* Email lookup form */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-10">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 gap-2 shrink-0">
              <Search className="w-4 h-4" />
              Look Up
            </Button>
          </form>

          {/* Results */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-500 text-sm">
              Something went wrong. Please try again.
            </div>
          )}

          {bookings && bookings.length === 0 && (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-light text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
                No bookings found
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                No reservations were found for <strong>{submittedEmail}</strong>.
              </p>
              <Link href="/#properties">
                <Button variant="outline" size="sm">Browse Properties</Button>
              </Link>
            </div>
          )}

          {bookings && bookings.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                {bookings.length} reservation{bookings.length !== 1 ? "s" : ""} found for <strong>{submittedEmail}</strong>
              </p>
              {bookings.map((booking) => {
                const image = getPropertyImage(booking.propertyId);
                const name = getPropertyName(booking.propertyId);
                return (
                  <div key={booking.id} className="bg-background border border-border rounded-xl overflow-hidden flex gap-0">
                    {/* Property thumbnail */}
                    {image ? (
                      <div className="w-28 sm:w-36 shrink-0">
                        <img
                          src={image}
                          alt={name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-28 sm:w-36 shrink-0 bg-muted flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm sm:text-base" style={{ fontFamily: "var(--font-display)" }}>
                            {name}
                          </h3>
                          <p className="text-xs text-muted-foreground">Tyler, TX</p>
                        </div>
                        {statusBadge(booking.status)}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {booking.guestCount} guest{booking.guestCount !== 1 ? "s" : ""}
                        </span>
                        <span>{booking.nights} night{booking.nights !== 1 ? "s" : ""}</span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>Nightly: ${Number(booking.nightlyRate).toFixed(0)}/night × {booking.nights}</div>
                          {Number(booking.cleaningFee) > 0 && <div>Cleaning: ${Number(booking.cleaningFee).toFixed(0)}</div>}
                          {Number(booking.taxAmount) > 0 && <div>Tax: ${Number(booking.taxAmount).toFixed(2)}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-base font-semibold text-foreground">${Number(booking.totalAmount).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">total paid</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
