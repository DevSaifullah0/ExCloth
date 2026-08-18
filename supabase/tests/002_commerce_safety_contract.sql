begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select no_plan();

select ok(
  exists (
    select 1
    from pg_attribute
    where attrelid = to_regclass('public.orders')
      and attname = 'idempotency_key'
      and atttypid in ('text'::regtype, 'varchar'::regtype)
      and attnum > 0
      and not attisdropped
  ),
  'orders has a text/varchar idempotency_key'
);

select ok(
  exists (
    select 1
    from pg_class as indexes
    join pg_index as definitions on definitions.indexrelid = indexes.oid
    where indexes.relname = 'orders_user_id_idempotency_key_uidx'
      and definitions.indrelid = to_regclass('public.orders')
      and definitions.indisunique
      and definitions.indisvalid
      and definitions.indisready
      and definitions.indpred is not null
      and (
        select array_agg(attributes.attname::text order by keys.ordinality)
        from unnest(definitions.indkey) with ordinality as keys(attnum, ordinality)
        join pg_attribute as attributes
          on attributes.attrelid = definitions.indrelid
         and attributes.attnum = keys.attnum
        where keys.ordinality <= definitions.indnkeyatts
      ) = array['user_id', 'idempotency_key']::text[]
      and regexp_replace(
        lower(pg_get_expr(definitions.indpred, definitions.indrelid)),
        '[[:space:]()]',
        '',
        'g'
      ) = 'idempotency_keyisnotnull'
  ),
  'orders has the scoped partial unique idempotency index'
);

with required_checks(table_name, constraint_name, required_fragments) as (
  values
    (
      'orders',
      'orders_idempotency_key_format_ck',
      array['idempotency_key is null', 'user_id is not null', 'ord_']::text[]
    ),
    (
      'return_requests',
      'return_requests_identity_present_ck',
      array['user_id is not null', 'order_id is not null']::text[]
    ),
    (
      'shipping_addresses',
      'shipping_addresses_default_has_owner_ck',
      array['is_default is not true', 'user_id is not null']::text[]
    ),
    (
      'user_push_tokens',
      'user_push_tokens_identity_present_ck',
      array['user_id is not null', 'token is not null', 'btrim']::text[]
    )
)
select ok(
  exists (
    select 1
    from pg_constraint as constraints
    where constraints.conrelid = to_regclass(
      format('public.%I', required_checks.table_name)
    )
      and constraints.conname = required_checks.constraint_name
      and constraints.contype = 'c'
      and constraints.convalidated
      and (
        select bool_and(
          lower(pg_get_constraintdef(constraints.oid, true)) like
            '%' || fragment || '%'
        )
        from unnest(required_checks.required_fragments) as fragment
      )
  ),
  format(
    'public.%I has safety check %I',
    required_checks.table_name,
    required_checks.constraint_name
  )
)
from required_checks;

select ok(
  exists (
    select 1
    from pg_class as indexes
    join pg_index as definitions on definitions.indexrelid = indexes.oid
    where indexes.relname = 'return_requests_user_id_order_id_uidx'
      and definitions.indrelid = to_regclass('public.return_requests')
      and definitions.indisunique
      and definitions.indisvalid
      and definitions.indisready
      and definitions.indpred is not null
      and (
        select array_agg(attributes.attname::text order by keys.ordinality)
        from unnest(definitions.indkey) with ordinality as keys(attnum, ordinality)
        join pg_attribute as attributes
          on attributes.attrelid = definitions.indrelid
         and attributes.attnum = keys.attnum
        where keys.ordinality <= definitions.indnkeyatts
      ) = array['user_id', 'order_id']::text[]
      and regexp_replace(
        lower(pg_get_expr(definitions.indpred, definitions.indrelid)),
        '[[:space:]()]',
        '',
        'g'
      ) = 'user_idisnotnullandorder_idisnotnull'
  ),
  'return requests are unique per non-null user/order pair'
);

select ok(
  exists (
    select 1
    from pg_class as indexes
    join pg_index as definitions on definitions.indexrelid = indexes.oid
    where indexes.relname = 'shipping_addresses_one_default_per_user_uidx'
      and definitions.indrelid = to_regclass('public.shipping_addresses')
      and definitions.indisunique
      and definitions.indisvalid
      and definitions.indisready
      and definitions.indpred is not null
      and (
        select array_agg(attributes.attname::text order by keys.ordinality)
        from unnest(definitions.indkey) with ordinality as keys(attnum, ordinality)
        join pg_attribute as attributes
          on attributes.attrelid = definitions.indrelid
         and attributes.attnum = keys.attnum
        where keys.ordinality <= definitions.indnkeyatts
      ) = array['user_id']::text[]
      and regexp_replace(
        lower(pg_get_expr(definitions.indpred, definitions.indrelid)),
        '[[:space:]()]',
        '',
        'g'
      ) = 'is_defaultistrue'
  ),
  'shipping addresses allow at most one default per user'
);

select ok(
  exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = 'set_default_shipping_address_secure'
      and procedures.pronargs = 1
      and procedures.proargnames[1:1] = array['p_address_id']::text[]
      and oidvectortypes(procedures.proargtypes) = 'uuid'
      and procedures.prorettype = 'uuid'::regtype
      and procedures.prosecdef
      and procedures.provolatile = 'v'
      and position('auth.uid()' in procedures.prosrc) > 0
      and position(
        'address.user_id = requesting_user_id' in procedures.prosrc
      ) > 0
      and (
        select count(*)
        from pg_proc as overloads
        where overloads.pronamespace = procedures.pronamespace
          and overloads.proname = procedures.proname
      ) = 1
      and exists (
        select 1
        from unnest(coalesce(procedures.proconfig, array[]::text[])) as setting
        where setting = 'search_path=pg_catalog'
      )
  ),
  'atomic default-address RPC has the reviewed UUID/security contract'
);

select ok(
  coalesce(
    not has_function_privilege(
      'anon',
      to_regprocedure('public.set_default_shipping_address_secure(uuid)'),
      'EXECUTE'
    ),
    false
  ),
  'anon cannot set a default shipping address'
);

select ok(
  coalesce(
    has_function_privilege(
      'authenticated',
      to_regprocedure('public.set_default_shipping_address_secure(uuid)'),
      'EXECUTE'
    ),
    false
  ),
  'authenticated users can call the default-address RPC'
);

select ok(
  exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = 'delete_shipping_address_secure'
      and procedures.pronargs = 1
      and procedures.proargnames[1:1] = array['p_address_id']::text[]
      and oidvectortypes(procedures.proargtypes) = 'uuid'
      and procedures.prorettype = 'uuid'::regtype
      and procedures.prosecdef
      and procedures.provolatile = 'v'
      and position('auth.uid()' in procedures.prosrc) > 0
      and position('delete from public.shipping_addresses' in procedures.prosrc) > 0
      and position('address.user_id = requesting_user_id' in procedures.prosrc) > 0
      and (
        select count(*)
        from pg_proc as overloads
        where overloads.pronamespace = procedures.pronamespace
          and overloads.proname = procedures.proname
      ) = 1
      and exists (
        select 1
        from unnest(coalesce(procedures.proconfig, array[]::text[])) as setting
        where setting = 'search_path=pg_catalog'
      )
  ),
  'atomic delete-address RPC has the reviewed UUID/ownership contract'
);

select ok(
  coalesce(
    not has_function_privilege(
      'anon',
      to_regprocedure('public.delete_shipping_address_secure(uuid)'),
      'EXECUTE'
    ),
    false
  ),
  'anon cannot delete a shipping address'
);

select ok(
  coalesce(
    has_function_privilege(
      'authenticated',
      to_regprocedure('public.delete_shipping_address_secure(uuid)'),
      'EXECUTE'
    ),
    false
  ),
  'authenticated users can call the delete-address RPC'
);

select ok(
  exists (
    select 1
    from pg_class as indexes
    join pg_index as definitions on definitions.indexrelid = indexes.oid
    where indexes.relname = 'user_push_tokens_token_uidx'
      and definitions.indrelid = to_regclass('public.user_push_tokens')
      and definitions.indisunique
      and definitions.indisvalid
      and definitions.indisready
      and definitions.indpred is not null
      and (
        select array_agg(attributes.attname::text order by keys.ordinality)
        from unnest(definitions.indkey) with ordinality as keys(attnum, ordinality)
        join pg_attribute as attributes
          on attributes.attrelid = definitions.indrelid
         and attributes.attnum = keys.attnum
        where keys.ordinality <= definitions.indnkeyatts
      ) = array['token']::text[]
      and regexp_replace(
        lower(pg_get_expr(definitions.indpred, definitions.indrelid)),
        '[[:space:]()]',
        '',
        'g'
      ) = 'tokenisnotnull'
  ),
  'a provider push token can belong to only one stored row'
);

select ok(
  exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = 'unregister_push_token_secure'
      and procedures.pronargs = 1
      and procedures.proargnames[1:1] = array['p_token']::text[]
      and oidvectortypes(procedures.proargtypes) = 'text'
      and procedures.prorettype = 'bool'::regtype
      and procedures.prosecdef
      and procedures.provolatile = 'v'
      and position('auth.uid()' in procedures.prosrc) > 0
      and position('user_id = requesting_user_id' in procedures.prosrc) > 0
      and (
        select count(*)
        from pg_proc as overloads
        where overloads.pronamespace = procedures.pronamespace
          and overloads.proname = procedures.proname
      ) = 1
      and exists (
        select 1
        from unnest(coalesce(procedures.proconfig, array[]::text[])) as setting
        where setting = 'search_path=pg_catalog'
      )
  ),
  'push-token unregistration has the reviewed text/security contract'
);

select ok(
  coalesce(
    not has_function_privilege(
      'anon',
      to_regprocedure('public.unregister_push_token_secure(text)'),
      'EXECUTE'
    ),
    false
  ),
  'anon cannot unregister push tokens'
);

select ok(
  coalesce(
    has_function_privilege(
      'authenticated',
      to_regprocedure('public.unregister_push_token_secure(text)'),
      'EXECUTE'
    ),
    false
  ),
  'authenticated users can unregister their own push token'
);

select * from finish();
rollback;
