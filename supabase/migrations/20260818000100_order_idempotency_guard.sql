-- Defense-in-depth for create-order retries.
--
-- This migration is intentionally additive. Existing orders remain valid because
-- idempotency_key is nullable. The create-order Edge Function must still persist
-- the authenticated user's request key and return the original order on replay;
-- a database index cannot provide that response contract by itself.

do $migration$
declare
  idempotency_type oid;
  duplicate_count bigint;
  invalid_count bigint;
begin
  if to_regclass('public.orders') is null then
    raise exception
      'Cannot install order idempotency guard: public.orders is absent. Import a baseline migration with an earlier version first.';
  end if;

  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.orders'::regclass
      and attname = 'user_id'
      and attnum > 0
      and not attisdropped
  ) then
    raise exception
      'Cannot install order idempotency guard: public.orders.user_id is absent.';
  end if;

  select atttypid
  into idempotency_type
  from pg_attribute
  where attrelid = 'public.orders'::regclass
    and attname = 'idempotency_key'
    and attnum > 0
    and not attisdropped;

  if idempotency_type is null then
    alter table public.orders
      add column idempotency_key text;
    idempotency_type := 'text'::regtype;
  end if;

  if idempotency_type not in ('text'::regtype, 'varchar'::regtype) then
    raise exception
      'Cannot install order idempotency guard: public.orders.idempotency_key must be text/varchar, found %.',
      format_type(idempotency_type, null);
  end if;

  select count(*)
  into invalid_count
  from public.orders
  where idempotency_key is not null
    and (
      user_id is null
      or idempotency_key::text !~ '^ord_[A-Za-z0-9_-]{12,116}$'
    );

  if invalid_count > 0 then
    raise exception
      'Cannot validate order idempotency contract: % row(s) have a key with a missing owner or invalid format.',
      invalid_count;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_idempotency_key_format_ck'
  ) then
    raise exception
      'orders_idempotency_key_format_ck already exists; review its definition before applying this migration.';
  end if;

  alter table public.orders
    add constraint orders_idempotency_key_format_ck
    check (
      idempotency_key is null
      or (
        user_id is not null
        and idempotency_key::text ~ '^ord_[A-Za-z0-9_-]{12,116}$'
      )
    ) not valid;

  alter table public.orders
    validate constraint orders_idempotency_key_format_ck;

  -- Prevent a write between the duplicate check and index creation. This lock is
  -- held only for this migration transaction; deploy during a quiet window.
  lock table public.orders in share row exclusive mode;

  select count(*)
  into duplicate_count
  from (
    select user_id, idempotency_key
    from public.orders
    where idempotency_key is not null
    group by user_id, idempotency_key
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception
      'Cannot create order idempotency index: % duplicate (user_id, idempotency_key) group(s) require manual reconciliation.',
      duplicate_count;
  end if;

  if to_regclass('public.orders_user_id_idempotency_key_uidx') is not null then
    raise exception
      'orders_user_id_idempotency_key_uidx already exists; review its definition before applying this migration.';
  end if;

  create unique index orders_user_id_idempotency_key_uidx
    on public.orders (user_id, idempotency_key)
    where idempotency_key is not null;

  comment on column public.orders.idempotency_key is
    'Opaque client request key. create-order must atomically persist and replay it per authenticated user.';
end
$migration$;
