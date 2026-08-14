import Stripe from "stripe";

const eventId = process.argv[2];
if (!eventId) throw new Error("Usage: tsx scripts/inspect-stripe-event.mts <event_id>");

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not available");

const stripe = new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia" });
const event = await stripe.events.retrieve(eventId);
const session = event.data.object as Stripe.Checkout.Session;

console.log(JSON.stringify({
  id: event.id,
  type: event.type,
  created: event.created,
  object: session.object,
  sessionId: session.id,
  paymentStatus: session.payment_status,
  clientReferenceId: session.client_reference_id,
  metadataKeys: Object.keys(session.metadata ?? {}),
  manualBookingTokenPresent: Boolean(session.metadata?.manual_booking_token),
  propertySlug: session.metadata?.property_slug ?? null,
  amountTotal: session.amount_total,
}, null, 2));
