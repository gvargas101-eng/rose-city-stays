import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" as any });
const sessionId = "cs_live_b11kOsIbFxPLKDueDhuXF8JPTQhUWgBkVbptmsirFWd0Yo8Vxn772TYwp1";

const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent", "customer"] });
const paymentIntent = typeof session.payment_intent === "string" ? await stripe.paymentIntents.retrieve(session.payment_intent) : session.payment_intent;
console.log(JSON.stringify({
  sessionStatus: session.status,
  paymentStatus: session.payment_status,
  customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
  paymentIntentId: paymentIntent?.id ?? null,
  paymentIntentCustomer: typeof paymentIntent?.customer === "string" ? paymentIntent.customer : paymentIntent?.customer?.id ?? null,
  paymentMethodId: typeof paymentIntent?.payment_method === "string" ? paymentIntent.payment_method : paymentIntent?.payment_method?.id ?? null,
}, null, 2));
