# Push notification function

This function is designed for a Supabase Database Webhook on `public.notifications` inserts.

## Required secrets

- `PUSH_WEBHOOK_SECRET`: high-entropy value also sent as the webhook's `x-webhook-secret` header.
- `FIREBASE_SERVICE_ACCOUNT`: server-side Firebase service-account JSON.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: function-only Supabase credentials.

Never place these values in the mobile app or commit them to source control. `verify_jwt` remains disabled because this endpoint is called by a database webhook rather than an end-user session; the endpoint validates its dedicated secret using a fixed-work comparison and rejects oversized or invalid payloads.

## Delivery behavior

- The user's `user_notification_preferences` category is checked before FCM delivery.
- Reserved routing fields cannot be overwritten by arbitrary notification data.
- Up to 20 registered devices are delivered in parallel with one OAuth token per invocation; one network rejection no longer aborts the other device results.
- Invalid FCM tokens are removed for the same user.
- Android background delivery uses the same `excloth_foreground_v1` channel declared by the app.
- Partial delivery returns HTTP `207` with `success: false`; complete failures return a generic error without leaking credentials or provider details.

For durable retries at larger scale, connect notification inserts to a transactional outbox/queue and record a per-device delivery attempt before acknowledging the event.
