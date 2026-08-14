import { recordHostawayStripePayment } from "../server/hostaway-booking";

const reservationId = process.argv[2];
const amount = Number(process.argv[3]);
const paymentReference = process.argv[4];
if (!reservationId || !Number.isFinite(amount) || !paymentReference) {
  throw new Error("Usage: tsx scripts/reconcile-hostaway-payment.mts <reservation_id> <amount> <verified_stripe_reference>");
}
const charge = await recordHostawayStripePayment({
  reservationId,
  amount,
  stripePaymentIntentId: paymentReference,
});

console.log(JSON.stringify({ reservationId, chargeId: charge.id, chargeStatus: charge.status }, null, 2));
