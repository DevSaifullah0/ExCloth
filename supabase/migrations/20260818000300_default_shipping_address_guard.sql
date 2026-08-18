-- Keep default-address changes atomic and guarantee at most one default address
-- per customer. Reviewed same-signature set/delete RPC bodies are replaced only
-- after the hosted UUID/boolean/timestamp contract is verified.

do $migration$
declare
  id_type oid;
  user_id_type oid;
  is_default_type oid;
  updated_at_type oid;
  duplicate_count bigint;
  invalid_count bigint;
begin
  if to_regclass('public.shipping_addresses') is null then
    raise exception
      'Cannot install default-address guard: public.shipping_addresses is absent. Import a baseline migration with an earlier version first.';
  end if;

  select atttypid into id_type
  from pg_attribute
  where attrelid = 'public.shipping_addresses'::regclass
    and attname = 'id'
    and attnum > 0
    and not attisdropped;

  select atttypid into user_id_type
  from pg_attribute
  where attrelid = 'public.shipping_addresses'::regclass
    and attname = 'user_id'
    and attnum > 0
    and not attisdropped;

  select atttypid into is_default_type
  from pg_attribute
  where attrelid = 'public.shipping_addresses'::regclass
    and attname = 'is_default'
    and attnum > 0
    and not attisdropped;

  select atttypid into updated_at_type
  from pg_attribute
  where attrelid = 'public.shipping_addresses'::regclass
    and attname = 'updated_at'
    and attnum > 0
    and not attisdropped;

  if id_type is distinct from 'uuid'::regtype
    or user_id_type is distinct from 'uuid'::regtype
    or is_default_type is distinct from 'bool'::regtype
    or updated_at_type is null
    or updated_at_type not in (
      'timestamp'::regtype,
      'timestamptz'::regtype
    ) then
    raise exception
      'Cannot install address RPCs: expected id/user_id uuid, is_default boolean and updated_at timestamp/timestamptz.';
  end if;

  lock table public.shipping_addresses in share row exclusive mode;

  select count(*)
  into invalid_count
  from public.shipping_addresses
  where is_default is true
    and user_id is null;

  if invalid_count > 0 then
    raise exception
      'Cannot validate default-address ownership: % default row(s) have no user_id.',
      invalid_count;
  end if;

  select count(*)
  into duplicate_count
  from (
    select user_id
    from public.shipping_addresses
    where is_default is true
      and user_id is not null
    group by user_id
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception
      'Cannot create default-address index: % user(s) currently have multiple defaults; reconcile them first.',
      duplicate_count;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.shipping_addresses'::regclass
      and conname = 'shipping_addresses_default_has_owner_ck'
  ) then
    raise exception
      'shipping_addresses_default_has_owner_ck already exists; review its definition before applying this migration.';
  end if;

  alter table public.shipping_addresses
    add constraint shipping_addresses_default_has_owner_ck
    check (is_default is not true or user_id is not null) not valid;

  alter table public.shipping_addresses
    validate constraint shipping_addresses_default_has_owner_ck;

  if to_regclass('public.shipping_addresses_one_default_per_user_uidx') is not null then
    raise exception
      'shipping_addresses_one_default_per_user_uidx already exists; review its definition before applying this migration.';
  end if;

  create unique index shipping_addresses_one_default_per_user_uidx
    on public.shipping_addresses (user_id)
    where is_default is true;

  if exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = 'set_default_shipping_address_secure'
      and procedures.oid is distinct from to_regprocedure(
        'public.set_default_shipping_address_secure(uuid)'
      )
  ) then
    raise exception
      'Cannot create default-address RPC: an incompatible overload already exists and needs manual review.';
  end if;

  if to_regprocedure('public.set_default_shipping_address_secure(uuid)') is not null
    and not exists (
      select 1
      from pg_proc as procedures
      where procedures.oid = to_regprocedure(
        'public.set_default_shipping_address_secure(uuid)'
      )
        and procedures.prorettype = 'uuid'::regtype
    ) then
    raise exception
      'Existing set_default_shipping_address_secure(uuid) must return uuid before it can be safely replaced.';
  end if;

  -- CREATE OR REPLACE is intentional: never grant authenticated execution to an
  -- unknown same-signature body. Incompatible return types/overloads abort above.
  execute $function$
      create or replace function public.set_default_shipping_address_secure(p_address_id uuid)
      returns uuid
      language plpgsql
      security definer
      set search_path = pg_catalog
      as $body$
      declare
        requesting_user_id uuid := auth.uid();
        selected_address_id uuid;
      begin
        if requesting_user_id is null then
          raise exception using
            errcode = '42501',
            message = 'Authentication is required.';
        end if;

        -- Lock every address for this user in a stable order. This serializes two
        -- devices trying to choose different defaults at the same time.
        perform 1
        from public.shipping_addresses as address
        where address.user_id = requesting_user_id
        order by address.id
        for update;

        select address.id
        into selected_address_id
        from public.shipping_addresses as address
        where address.id = p_address_id
          and address.user_id = requesting_user_id;

        if selected_address_id is null then
          raise exception using
            errcode = 'P0002',
            message = 'Shipping address was not found.';
        end if;

        update public.shipping_addresses
        set is_default = false,
            updated_at = clock_timestamp()
        where user_id = requesting_user_id
          and is_default is true
          and id <> selected_address_id;

        update public.shipping_addresses
        set is_default = true,
            updated_at = clock_timestamp()
        where id = selected_address_id
          and user_id = requesting_user_id;

        return selected_address_id;
      end
      $body$
  $function$;

  revoke all on function public.set_default_shipping_address_secure(uuid)
    from public, anon;
  grant execute on function public.set_default_shipping_address_secure(uuid)
    to authenticated;

  if exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = 'delete_shipping_address_secure'
      and procedures.oid is distinct from to_regprocedure(
        'public.delete_shipping_address_secure(uuid)'
      )
  ) then
    raise exception
      'Cannot create delete-address RPC: an incompatible overload already exists and needs manual review.';
  end if;

  if to_regprocedure('public.delete_shipping_address_secure(uuid)') is not null
    and not exists (
      select 1
      from pg_proc as procedures
      where procedures.oid = to_regprocedure(
        'public.delete_shipping_address_secure(uuid)'
      )
        and procedures.prorettype = 'uuid'::regtype
    ) then
    raise exception
      'Existing delete_shipping_address_secure(uuid) must return uuid before it can be safely replaced.';
  end if;

  execute $function$
      create or replace function public.delete_shipping_address_secure(p_address_id uuid)
      returns uuid
      language plpgsql
      security definer
      set search_path = pg_catalog
      as $body$
      declare
        requesting_user_id uuid := auth.uid();
        deleted_was_default boolean;
        replacement_address_id uuid;
      begin
        if requesting_user_id is null then
          raise exception using
            errcode = '42501',
            message = 'Authentication is required.';
        end if;

        perform 1
        from public.shipping_addresses as address
        where address.user_id = requesting_user_id
        order by address.id
        for update;

        select address.is_default
        into deleted_was_default
        from public.shipping_addresses as address
        where address.id = p_address_id
          and address.user_id = requesting_user_id;

        if not found then
          raise exception using
            errcode = 'P0002',
            message = 'Shipping address was not found.';
        end if;

        delete from public.shipping_addresses
        where id = p_address_id
          and user_id = requesting_user_id;

        if deleted_was_default is true then
          select address.id
          into replacement_address_id
          from public.shipping_addresses as address
          where address.user_id = requesting_user_id
          order by address.updated_at desc nulls last, address.id
          limit 1;

          if replacement_address_id is not null then
            update public.shipping_addresses
            set is_default = true,
                updated_at = clock_timestamp()
            where id = replacement_address_id
              and user_id = requesting_user_id;
          end if;
        end if;

        return replacement_address_id;
      end
      $body$
  $function$;

  revoke all on function public.delete_shipping_address_secure(uuid)
    from public, anon;
  grant execute on function public.delete_shipping_address_secure(uuid)
    to authenticated;
end
$migration$;
