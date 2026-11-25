import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AdminLayout from "./AdminLayout";

type Filter = "all" | "pending" | "reviewed" | "declined" | "resolved";
type ReviewStatus = "reviewed" | "declined" | "resolved";

function ReviewCard({ request, onSaved }: {
  request: { id: number; reservationReference: string; bookingEmail: string; phone: string | null; reason: string; requestedAt: number; status: string; reviewNotes: string | null; reviewedAt: number | null };
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(request.reviewNotes ?? "");
  const [status, setStatus] = useState<ReviewStatus>("reviewed");
  const [acknowledged, setAcknowledged] = useState(false);
  const review = trpc.cancellations.review.useMutation({ onSuccess: onSaved });
  return <article className="rounded-xl border border-border bg-background p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Request #{request.id} · {request.reservationReference}</h2><span className="text-xs rounded-full bg-muted px-3 py-1">{request.status}</span></div>
    <p className="text-xs text-muted-foreground">Received {new Date(request.requestedAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} Central Time</p>
    <div className="text-sm"><p>Submitted email: {request.bookingEmail}</p>{request.phone && <p>Submitted phone: {request.phone}</p>}<p className="text-xs text-amber-800 mt-2">Unverified input. Do not use these contact details as proof or as the sole contact for approval.</p></div>
    <p className="text-sm whitespace-pre-wrap break-words">{request.reason}</p>
    {request.reviewedAt && <p className="text-xs text-muted-foreground">Last review: {new Date(request.reviewedAt).toLocaleString()}</p>}
    <div><Label htmlFor={`request-status-${request.id}`}>Administrative request status</Label><select id={`request-status-${request.id}`} className="block mt-2 rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value as ReviewStatus)}><option value="reviewed">Reviewed — needs follow-up</option><option value="declined">Declined — request closed</option><option value="resolved">Resolved — request closed</option></select></div>
    <div><Label htmlFor={`request-notes-${request.id}`}>Internal review notes (required)</Label><Textarea id={`request-notes-${request.id}`} value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={4000} className="mt-2" placeholder="Record original-contact verification, booked-policy evidence, and any separately completed provider actions. No card data or door codes." /></div>
    <label className="flex gap-3 text-xs leading-relaxed"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="mt-1 accent-primary" /><span>I understand this only updates the request record. It does not cancel the booking, notify the guest, refund a payment, release a deposit, or stop scheduled collection.</span></label>
    {review.isError && <p role="alert" className="text-sm text-red-700">{review.error.message}</p>}
    {review.isSuccess && <p role="status" className="text-sm text-green-700">Administrative record saved. Reservation and payments unchanged.</p>}
    <Button disabled={!acknowledged || !notes.trim() || review.isPending} onClick={() => review.mutate({ id: request.id, status, notes, administrativeOnlyAcknowledged: true })}>{review.isPending ? "Saving…" : "Save review record only"}</Button>
  </article>;
}

export default function AdminCancellationRequests() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [beforeId, setBeforeId] = useState<number | undefined>();
  const requests = trpc.cancellations.list.useQuery({ status: filter, beforeId }, { retry: false });
  return <AdminLayout><div className="p-4 sm:p-8 max-w-6xl">
    <Link href="/admin" className="text-sm text-primary hover:underline">← Dashboard</Link>
    <h1 className="text-2xl font-semibold mt-5">Cancellation requests</h1>
    <p className="text-muted-foreground text-sm mt-2">Unverified guest requests for owner review. Nothing on this page cancels a reservation or moves money.</p>
    <section className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 text-sm leading-relaxed"><h2 className="font-semibold mb-2">Verify first, then act in the correct system</h2><p>Locate the original reservation in Hostaway. Verify the requester using its original contact information, not just the email or phone submitted here. Check the booked policy, channel, actual receipts, earlier refunds, security deposit and scheduled charges. Existing bookings retain their original terms; ambiguous references or missing policy evidence require manual review.</p><p className="mt-3">OTA guests must cancel through the original booking platform. Perform any authorized direct-booking cancellation in Hostaway and any refund in the original payment system, including Stripe or the external-payment channel. Stop inappropriate future collection, verify deposit handling and website status synchronization, then confirm the outcome to the guest separately. “Resolved” only closes this request record.</p><Link href="/admin/bookings" className="inline-block mt-3 underline">Review website booking records</Link></section>
    <div className="flex flex-wrap items-center gap-3 mb-6"><Label htmlFor="request-filter">Show requests</Label><select id="request-filter" value={filter} onChange={e => { setFilter(e.target.value as Filter); setBeforeId(undefined); }} className="rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm">{(["pending", "reviewed", "declined", "resolved", "all"] as Filter[]).map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select><Button variant="outline" onClick={() => requests.refetch()} disabled={requests.isFetching}>Refresh requests</Button>{beforeId && <Button variant="outline" onClick={() => setBeforeId(undefined)}>Newest</Button>}</div>
    {requests.isLoading && <p>Loading requests…</p>}
    {requests.isError && <p role="alert" className="text-red-700 text-sm">Unable to load requests. Verify your admin access and that the additive request migration has been applied.</p>}
    {requests.data && !requests.data.requests.length && <div className="p-10 border border-dashed border-border rounded-xl text-center text-muted-foreground">No requests in this view.</div>}
    <div className="space-y-5">{requests.data?.requests.map(request => <ReviewCard key={`${request.id}:${request.reviewedAt ?? 0}`} request={request} onSaved={() => { requests.refetch(); }} />)}</div>
    {requests.data?.nextCursor && <Button className="mt-6" variant="outline" onClick={() => setBeforeId(requests.data!.nextCursor!)}>Older requests</Button>}
  </div></AdminLayout>;
}
