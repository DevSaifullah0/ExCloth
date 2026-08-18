-- The mobile flow models one return request per customer/order. Enforce that
-- invariant at the database boundary so concurrent taps cannot create duplicates.

do $migration$
declare
  duplicate_count bigint;
  invalid_count bigint;
begin
  if to_regclass('public.return_requests') is null then
    raise exception
      'Cannot install return uniqueness guard: public.return_requests is absent. Import a baseline migration with an earlier version first.';
  end if;

  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.return_requests'::regclass
      and attname = 'user_id'
      and attnum > 0
      and not attisdropped
  ) or not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.return_requests'::regclass
      and attname = 'order_id'
      and attnum > 0
      and not attisdropped
  ) then
    raise exception
      'Cannot install return uniqueness guard: public.return_requests requires user_id and order_id.';
  end if;

  lock table public.return_requests in share row exclusive mode;

  select count(*)
  into invalid_count
  from public.return_requests
  where user_id is null
    or order_id is null;

  if invalid_count > 0 then
    raise exception
      'Cannot validate return identity contract: % row(s) have a null user_id or order_id.',
      invalid_count;
  end if;

  select count(*)
  into duplicate_count
  from (
    select user_id, order_id
    from public.return_requests
    where user_id is not null
      and order_id is not null
    group by user_id, order_id
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception
      'Cannot create return uniqueness index: % duplicate (user_id, order_id) group(s) require manual reconciliation.',
      duplicate_count;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.return_requests'::regclass
      and conname = 'return_requests_identity_present_ck'
  ) then
    raise exception
      'return_requests_identity_present_ck already exists; review its definition before applying this migration.';
  end if;

  alter table public.return_requests
    add constraint return_requests_identity_present_ck
    check (user_id is not null and order_id is not null) not valid;

  alter table public.return_requests
    validate constraint return_requests_identity_present_ck;

  if to_regclass('public.return_requests_user_id_order_id_uidx') is not null then
    raise exception
      'return_requests_user_id_order_id_uidx already exists; review its definition before applying this migration.';
  end if;

  create unique index return_requests_user_id_order_id_uidx
    on public.return_requests (user_id, order_id)
    where user_id is not null and order_id is not null;
end
$migration$;
