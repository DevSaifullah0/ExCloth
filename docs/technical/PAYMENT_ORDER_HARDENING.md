# Payment and order hardening

## Current release boundary

Online payments are intentionally development-only until a real payment-provider adapter is implemented and reviewed. Development builds may use the existing demo flow; release builds hide configured online methods, reject direct navigation to payment processing, and do not render the card, wallet, or bank-transfer demo input forms.

The runtime configuration contract is strict:

- `PAYMENT_GATEWAY_ENABLED=true`
- `PAYMENT_GATEWAY_PROVIDER=<provider identifier>`
- `PAYMENT_GATEWAY_ADAPTER=<adapter identifier>`

Those values are an opt-in signal, not proof that a gateway exists. `PRODUCTION_PAYMENT_ADAPTER_AVAILABLE` must remain `false` until the app performs a real provider checkout and the backend verifies the provider result. No provider secret belongs in the mobile app.

## Order idempotency contract

Checkout creates a client-side order intent and stores it per authenticated user for up to 24 hours. Its key survives screen remounts and retries for the same user, address, coupon, and cart. Both COD and development online requests send the same key as:

- HTTP header: `Idempotency-Key`
- JSON field: `idempotency_key`

The intent is cleared only after the server returns an order ID (and, for the demo online flow, a paid status). A failed request retains the key for retry.

Client persistence does not make order creation idempotent by itself. The `create-order` backend must atomically enforce a unique key scoped to the authenticated user. Repeating the same key and payload should return the original order; repeating the key with a conflicting payload should be rejected. This repository does not contain that function's source, so server-side enforcement must be implemented and verified before relying on duplicate-order protection in production.

## Provider integration requirements

Before enabling a production online method:

1. Use a provider-hosted/native SDK flow so the app never handles raw card data.
2. Create payment intents and verify final payment state on a trusted backend.
3. Authenticate provider webhooks, handle replay protection, and reconcile asynchronous states.
4. Bind the verified provider transaction to the order idempotency key.
5. Add sandbox, failure, retry, timeout, cancellation, and duplicate-callback tests.
