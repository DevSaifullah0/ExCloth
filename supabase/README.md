# ExCloth Supabase contract

This directory is a safety layer around the hosted ExCloth backend; it is **not
yet a complete backend export**. The repository still needs the canonical table,
policy, trigger, function and storage migrations from the linked Supabase project.
Do not treat a successful mobile build as proof that the backend is reproducible.
The order/return/index changes are additive, but the reviewed shipping-address and
push-unregister RPCs use `CREATE OR REPLACE` and are intentional behavioral
changes. Capture any existing definitions, owners and grants before deployment.

## What the guard migrations enforce

- `orders.idempotency_key` is nullable for legacy rows, format-checked for new
  values, and unique per `(user_id, idempotency_key)` when present.
- A customer can have at most one `return_requests` row per order.
- A customer can have at most one default shipping address.
- `set_default_shipping_address_secure(uuid)` changes the default atomically and
  can only select an address owned by `auth.uid()`.
- `delete_shipping_address_secure(uuid)` atomically deletes an owned address and,
  when needed, promotes the most recently updated remaining address.
- A push-provider token can appear in at most one `user_push_tokens` row, and
  `unregister_push_token_secure(text)` can delete only the caller's row.

No migration silently removes or repairs business data. Duplicates, invalid key
formats, null return identities, ownerless defaults and blank/unowned push tokens
abort the relevant migration. The check constraints are validated in the same
transaction after explicit preflight, so a successful migration has no legacy
rows exempted by `NOT VALID`.
If a guard constraint/index name already exists, migration also aborts instead of
trusting an unknown same-named definition. Inspect the existing object and resolve
the migration history deliberately; do not drop it blindly.

Deploy the address RPC migration before releasing a mobile build which calls it.
The explicit "set default" operation is atomic. Full address create/edit still
needs a separately reviewed transactional save RPC after the canonical column
types, defaults and nullability are imported. Those fields were not guessed here.
Until that exists, client save ordering must remain fail-safe. Likewise, the
client must call `delete_shipping_address_secure(uuid)` rather than separately
deleting a default and promoting a replacement.

The idempotency column/index is defense-in-depth, not a complete implementation.
The missing `create-order` source must atomically:

1. require the authenticated user and a valid idempotency key;
2. lock/reserve the key before stock, coupon or payment side effects;
3. persist the key on the created order;
4. return the original result for an identical replay; and
5. reject a reused key whose canonical request payload differs.

The same Edge Function currently also receives
`action: "notify_order_status"` from the admin flow. A future idempotency
requirement must apply only to actual order creation. The notification action must
not reserve an order key or insert an order; preferably move it to a dedicated
notification function.

Similarly, `request-return` must treat SQLSTATE `23505` from the return uniqueness
index as an idempotent conflict/result instead of a generic server error.
`register_push_token_secure` must atomically upsert/reassign a provider token to
the authenticated user; its hosted source is not present here, so that behavior
still requires a negative integration test.

**Hard gate for migration `20260818000400`:** do not apply the push-token
ownership migration until the exact hosted
`register_push_token_secure(p_token, p_platform)` body is reviewed and tested to
reassign one globally unique token to `auth.uid()`. A function using only
`ON CONFLICT (user_id, token)` is incompatible with the new global unique index
and can break registration after an account switch.
The SQL migration additionally checks the two named inputs and authenticated-only
execution, but PostgreSQL metadata cannot prove the function's reassignment
semantics; source review and the account-switch integration test remain mandatory.

## Required hosted baseline

The client directly references these tables:

`cart_items`, `categories`, `notifications`, `order_items`, `orders`,
`payment_methods`, `payments`, `product_images`, `product_reviews`,
`product_variants`, `products`, `profiles`, `return_request_items`,
`return_requests`, `shipping_addresses`, `user_notification_preferences`,
`user_push_tokens`, and `wishlist`.

It also calls the SQL RPCs enumerated in
`tests/001_client_schema_contract.sql`. All Data API tables must have RLS enabled.
Public catalog rows may use explicit read policies; customer rows must be scoped
to `auth.uid()`. Admin RPCs must re-check the caller's current role server-side.
No required RPC needs anonymous execution, and every `SECURITY DEFINER` function
must pin `search_path`.

The following invoked Edge Functions are not committed and remain deployment
blockers: `create-order`, `request-return`, `cancel-order`, `submit-review`, and
`delete-account`. `send-push-notification` is the only Edge Function currently in
this repository.

## Local setup and verification

Prerequisites:

- a reviewed database backup and a non-production Supabase project for rehearsal;
- Supabase CLI and Docker for local verification;
- `SUPABASE_ACCESS_TOKEN`, the project ref and database password supplied through
  the shell/CI secret store—never commit a service-role key or database URL;
- the canonical hosted schema exported as migrations that sort **before**
  `20260818000100`. Review the export for secrets and object ownership before
  committing it. Every guard now aborts when its base table is missing, so an
  incorrectly ordered fresh reset fails instead of recording a silent no-op.

Recommended workflow:

Run the initial `db pull` on a clean/rehearsal branch where these unapplied guard
migrations are temporarily absent. Review the generated baseline, then assign the
guard files versions later than that baseline **before either set is applied to a
shared project**. The current `20260818000100`–`20260818000400` versions are valid
only when the imported baseline sorts earlier. Never rename or rewrite a migration
version after it has been applied to a shared project.

```sh
supabase login
supabase link --project-ref YOUR_STAGING_PROJECT_REF
supabase db pull
supabase start
supabase db reset
supabase test db
supabase db lint --local --level warning
supabase db push --dry-run
```

The current GitHub quality workflow runs JavaScript checks only. Add
`supabase db reset`, `supabase test db` and database linting to a dedicated CI job
with a pinned Supabase CLI before treating these pgTAP contracts as enforced.

`seed.sql` is deliberately a valid no-op. Add only deterministic, fake development
fixtures after the baseline schema exists. Never copy production customer data
into the seed.

Before pushing to staging, run these read-only checks on the target database:

```sql
select user_id, idempotency_key, count(*)
from public.orders
where idempotency_key is not null
group by user_id, idempotency_key
having count(*) > 1;

select id, user_id, idempotency_key
from public.orders
where idempotency_key is not null
  and (
    user_id is null
    or idempotency_key::text !~ '^ord_[A-Za-z0-9_-]{12,116}$'
  );

select user_id, order_id, count(*)
from public.return_requests
where user_id is not null and order_id is not null
group by user_id, order_id
having count(*) > 1;

select id, user_id, order_id
from public.return_requests
where user_id is null or order_id is null;

select user_id, count(*)
from public.shipping_addresses
where is_default is true
group by user_id
having count(*) > 1;

select id, user_id
from public.shipping_addresses
where is_default is true and user_id is null;

select token, count(*)
from public.user_push_tokens
where token is not null
group by token
having count(*) > 1;

select user_id, token
from public.user_push_tokens
where user_id is null
   or token is null
   or btrim(token::text) = '';
```

Run staging integration tests with two normal users, an admin, a demoted admin and
an anonymous client. At minimum prove cross-user rows are denied, admin RPCs reject
non-admins, duplicate order retries return one order, concurrent return requests
produce one request, concurrent default-address calls leave one default, and a
logout cannot unregister another user's push token.

## Deployment and rollback

Deploy during a quiet window because each uniqueness migration briefly takes a
write-blocking table lock while checking existing rows and building its index.
Apply to local, then staging, then production. Deploy the reviewed `create-order`
and `request-return` implementations before relying on their indexes as
end-to-end guarantees. The stronger rule above applies to push: verify and deploy
the compatible `register_push_token_secure` implementation before migration
`20260818000400` itself is allowed to run.

`CREATE OR REPLACE` does not preserve an old function body for rollback. Before
staging, save `pg_get_functiondef`, owner and grants for any existing same-signature
address/unregister RPC. Restore those captured definitions during rollback. Only
use the `DROP FUNCTION` statements below when the preflight proved the function
did not exist before this release. Normally leave additive columns in place and
remove the new surface only after matching application/server code is rolled back:

```sql
drop index concurrently if exists public.orders_user_id_idempotency_key_uidx;
drop index concurrently if exists public.return_requests_user_id_order_id_uidx;
drop index concurrently if exists public.shipping_addresses_one_default_per_user_uidx;
drop index concurrently if exists public.user_push_tokens_token_uidx;

drop function if exists public.set_default_shipping_address_secure(uuid);
drop function if exists public.delete_shipping_address_secure(uuid);
drop function if exists public.unregister_push_token_secure(text);

alter table public.orders
  drop constraint if exists orders_idempotency_key_format_ck;
alter table public.return_requests
  drop constraint if exists return_requests_identity_present_ck;
alter table public.shipping_addresses
  drop constraint if exists shipping_addresses_default_has_owner_ck;
alter table public.user_push_tokens
  drop constraint if exists user_push_tokens_identity_present_ck;
```

Only drop `orders.idempotency_key` after confirming no deployed function, webhook,
reconciliation job or audit process uses it. `DROP INDEX CONCURRENTLY` must be run
outside an explicit transaction.
