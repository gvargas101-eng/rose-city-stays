# Hostaway Guest Synchronization Notes

This project uses Hostaway reservation data to build a private, operations-only guest directory. The directory contains contact information and stay history required for manual booking autofill; it intentionally excludes payment-card data and identity-document files.

Hostaway's current unified webhook supports `reservation.created` and `reservation.updated`. Hostaway advises receivers to retrieve current reservation details through the Public API after receiving an event because webhook payloads can be partial and events can arrive out of order. The project therefore uses the event only to identify the reservation, then retrieves the latest reservation before upserting the directory.

The historical import uses the `GET /v1/reservations` endpoint with paginated pages of 100 records and rate-limits requests. The live webhook endpoint is `/api/hostaway/guest-webhook`; it uses HTTP Basic authentication with username `rosecitystays` and the `HOSTAWAY_WEBHOOK_SECRET` password. The scheduled reconciliation is a safety net for missed webhook deliveries.

## References

1. [Hostaway — Using Unified Webhooks](https://support.hostaway.com/hc/en-us/articles/360009022653-Using-Hostaway-Webhooks)
2. [Hostaway Public API Reference](https://api.hostaway.com/documentation)
