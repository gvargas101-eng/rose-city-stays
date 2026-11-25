import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FUTURE_DIRECT_CANCELLATION_POLICY_TEXT } from "@shared/cancellationPolicy";

export default function RequestCancellation() {
  const [requestKey] = useState(() => crypto.randomUUID());
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const submit = trpc.cancellations.submit.useMutation();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!acknowledged || submit.isPending || submit.isSuccess) return;
    submit.mutate({ requestKey, reservationReference: reference.trim(), bookingEmail: email.trim(), phone: phone.trim() || undefined, reason: reason.trim(), acknowledged: true });
  }

  return <div className="min-h-screen bg-background text-foreground flex flex-col">
    <Navbar />
    <main className="flex-1 pt-28 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/my-bookings" className="text-sm text-primary hover:underline">← My Bookings</Link>
        <div className="mt-7 mb-9">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Reservation support</p>
          <h1 className="text-4xl font-light" style={{ fontFamily: "var(--font-display)" }}>Request cancellation</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">Your reservation stays active until the host confirms cancellation. This form does not cancel a stay, issue a refund, or release a security deposit.</p>
        </div>
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          <section className="border border-border rounded-xl p-6 sm:p-8">
            {submit.isSuccess ? <div role="status" aria-live="polite">
              <h2 className="text-xl font-semibold mb-3">Request received for owner review</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{submit.data.message}</p>
              <p className="text-sm mt-4">For your privacy, we do not confirm reservation details here. The host will verify the request using the original reservation contact information.</p>
              <Link href="/" className="inline-block mt-6 text-primary hover:underline">Return to Rose City Stays</Link>
            </div> : <form onSubmit={handleSubmit} className="space-y-5">
              <div><Label htmlFor="cancellation-reference">Reservation reference</Label><Input id="cancellation-reference" value={reference} onChange={e => setReference(e.target.value)} maxLength={128} required className="mt-2" /><p className="text-xs text-muted-foreground mt-2">Use the website booking number or Hostaway reservation reference from your confirmation. Please do not include card numbers, door codes, or ID documents.</p></div>
              <div><Label htmlFor="cancellation-email">Email used for the booking</Label><Input id="cancellation-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={320} required className="mt-2" /></div>
              <div><Label htmlFor="cancellation-phone">Phone number (optional)</Label><Input id="cancellation-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={32} className="mt-2" /></div>
              <div><Label htmlFor="cancellation-reason">Reason for the request</Label><Textarea id="cancellation-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} required rows={4} className="mt-2" /></div>
              <label className="flex gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 accent-primary shrink-0" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} required /><span>I understand this is only a request for owner review. My reservation remains active until the host confirms cancellation. No refund or deposit release happens automatically, and any refund is governed by the policy agreed to when I booked.</span></label>
              {submit.isError && <p role="alert" className="text-sm text-red-700">{submit.error.message}</p>}
              <Button type="submit" disabled={!acknowledged || submit.isPending} className="w-full">{submit.isPending ? "Sending request…" : "Send cancellation request"}</Button>
              <p className="text-xs text-muted-foreground">Submitting an email or reference is not identity verification. For urgent requests, call <a href="tel:+19037144305" className="text-primary underline">(903) 714-4305</a>.</p>
            </form>}
          </section>
          <aside className="space-y-6">
            <section className="rounded-xl bg-muted/50 border border-border p-6"><h2 className="font-semibold mb-3">Direct-booking cancellation policy</h2><p className="text-sm text-muted-foreground leading-relaxed">{FUTURE_DIRECT_CANCELLATION_POLICY_TEXT}</p><p className="text-sm mt-4 leading-relaxed">This is the policy for new direct bookings. For existing reservations, the policy agreed to at booking governs; the host reviews historical terms and the payment record. This page is not a refund estimate.</p><Link href="/terms" className="inline-block mt-4 text-sm text-primary underline">Read Terms &amp; Conditions</Link></section>
            <section className="rounded-xl border border-border p-6"><h2 className="font-semibold mb-3">Booked through another platform?</h2><p className="text-sm text-muted-foreground leading-relaxed">For Airbnb, Vrbo, Booking.com, or another booking platform, request cancellation through the original platform. Its booked policy and payment handling apply. This website cannot cancel those bookings for you.</p></section>
          </aside>
        </div>
      </div>
    </main>
    <Footer />
  </div>;
}
