begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select no_plan();

-- Every relation below is referenced directly by the mobile client. Keeping the
-- list explicit makes missing baseline migrations visible to pgTAP and future CI.
with required_tables(table_name) as (
  values
    ('cart_items'),
    ('categories'),
    ('notifications'),
    ('order_items'),
    ('orders'),
    ('payment_methods'),
    ('payments'),
    ('product_images'),
    ('product_reviews'),
    ('product_variants'),
    ('products'),
    ('profiles'),
    ('return_request_items'),
    ('return_requests'),
    ('shipping_addresses'),
    ('user_notification_preferences'),
    ('user_push_tokens'),
    ('wishlist')
)
select ok(
  to_regclass(format('public.%I', table_name)) is not null,
  format('client table public.%I exists', table_name)
)
from required_tables;

-- These are all Data API tables. Public catalog reads may have permissive SELECT
-- policies, but RLS must still be enabled so writes/private rows remain bounded.
with required_tables(table_name) as (
  values
    ('cart_items'),
    ('categories'),
    ('notifications'),
    ('order_items'),
    ('orders'),
    ('payment_methods'),
    ('payments'),
    ('product_images'),
    ('product_reviews'),
    ('product_variants'),
    ('products'),
    ('profiles'),
    ('return_request_items'),
    ('return_requests'),
    ('shipping_addresses'),
    ('user_notification_preferences'),
    ('user_push_tokens'),
    ('wishlist')
)
select ok(
  coalesce(classes.relrowsecurity, false),
  format('RLS is enabled on public.%I', required_tables.table_name)
)
from required_tables
left join pg_namespace as namespaces
  on namespaces.nspname = 'public'
left join pg_class as classes
  on classes.relnamespace = namespaces.oid
 and classes.relname = required_tables.table_name
 and classes.relkind in ('r', 'p');

-- PostgREST resolves RPC JSON by input argument name. Types remain owned by the
-- missing canonical schema, but exact input arity/names can be derived from every
-- client call and are enforced here.
with required_functions(function_name, argument_names) as (
  values
    ('delete_admin_product_secure', array['p_product_id']::text[]),
    ('delete_shipping_address_secure', array['p_address_id']::text[]),
    ('get_admin_broadcasts_secure', array[]::text[]),
    ('get_admin_categories_secure', array[]::text[]),
    ('get_admin_category_details_secure', array['p_category_id']::text[]),
    ('get_admin_coupon_details_secure', array['p_coupon_id']::text[]),
    ('get_admin_coupons_secure', array[]::text[]),
    ('get_admin_order_details_secure', array['p_order_id']::text[]),
    ('get_admin_orders_secure', array[]::text[]),
    ('get_admin_product_details_secure', array['p_product_id']::text[]),
    ('get_admin_products_secure', array[]::text[]),
    ('get_admin_return_details_secure', array['p_return_request_id']::text[]),
    ('get_admin_returns_secure', array[]::text[]),
    ('get_admin_review_details_secure', array['p_review_id']::text[]),
    ('get_admin_reviews_secure', array[]::text[]),
    ('get_admin_user_details_secure', array['p_user_id']::text[]),
    ('get_admin_users_secure', array[]::text[]),
    ('is_admin_secure', array[]::text[]),
    ('mark_all_notifications_read_secure', array[]::text[]),
    ('mark_notification_read_secure', array['p_notification_id']::text[]),
    ('register_push_token_secure', array['p_token', 'p_platform']::text[]),
    (
      'save_admin_category_secure',
      array[
        'p_category_id', 'p_name', 'p_slug', 'p_sort_order', 'p_is_active'
      ]::text[]
    ),
    (
      'save_admin_coupon_secure',
      array[
        'p_coupon_id', 'p_code', 'p_discount_type', 'p_discount_value',
        'p_minimum_order_amount', 'p_maximum_discount_amount', 'p_usage_limit',
        'p_per_user_limit', 'p_starts_at', 'p_expires_at', 'p_is_active'
      ]::text[]
    ),
    (
      'save_admin_product_secure',
      array[
        'p_product_id', 'p_name', 'p_slug', 'p_description', 'p_price',
        'p_old_price', 'p_sku', 'p_stock_quantity', 'p_is_popular', 'p_is_new',
        'p_is_featured', 'p_is_active', 'p_category_ids'
      ]::text[]
    ),
    (
      'save_admin_product_variant_secure',
      array[
        'p_variant_id', 'p_product_id', 'p_size', 'p_color', 'p_sku',
        'p_stock_quantity', 'p_price_adjustment', 'p_is_active'
      ]::text[]
    ),
    (
      'send_admin_broadcast_notification_secure',
      array['p_title', 'p_message', 'p_type', 'p_coupon_id']::text[]
    ),
    (
      'set_admin_category_image_secure',
      array['p_category_id', 'p_image_url']::text[]
    ),
    (
      'set_admin_product_image_secure',
      array['p_product_id', 'p_image_url']::text[]
    ),
    (
      'set_admin_review_approval_secure',
      array['p_review_id', 'p_is_approved']::text[]
    ),
    (
      'set_admin_user_ban_secure',
      array['p_user_id', 'p_banned']::text[]
    ),
    ('set_default_shipping_address_secure', array['p_address_id']::text[]),
    ('unregister_push_token_secure', array['p_token']::text[]),
    (
      'update_order_status_secure',
      array['p_order_id', 'p_new_status']::text[]
    ),
    (
      'update_return_status_secure',
      array['p_return_request_id', 'p_new_status']::text[]
    ),
    ('validate_coupon', array['p_code', 'p_subtotal']::text[])
)
select ok(
  exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces
      on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = required_functions.function_name
      and procedures.pronargs = cardinality(required_functions.argument_names)
      and coalesce(
        procedures.proargnames[1:procedures.pronargs],
        array[]::text[]
      ) @> required_functions.argument_names
      and required_functions.argument_names @> coalesce(
        procedures.proargnames[1:procedures.pronargs],
        array[]::text[]
      )
      and has_function_privilege(
        'authenticated',
        procedures.oid,
        'EXECUTE'
      )
  ),
  format(
    'authenticated can execute public.%I(%s)',
    required_functions.function_name,
    array_to_string(required_functions.argument_names, ', ')
  )
)
from required_functions;

-- The app is fully authenticated before these RPCs are used. Anon execution is
-- therefore never required. Default PUBLIC grants would otherwise include anon.
with required_functions(function_name) as (
  values
    ('delete_admin_product_secure'),
    ('delete_shipping_address_secure'),
    ('get_admin_broadcasts_secure'),
    ('get_admin_categories_secure'),
    ('get_admin_category_details_secure'),
    ('get_admin_coupon_details_secure'),
    ('get_admin_coupons_secure'),
    ('get_admin_order_details_secure'),
    ('get_admin_orders_secure'),
    ('get_admin_product_details_secure'),
    ('get_admin_products_secure'),
    ('get_admin_return_details_secure'),
    ('get_admin_returns_secure'),
    ('get_admin_review_details_secure'),
    ('get_admin_reviews_secure'),
    ('get_admin_user_details_secure'),
    ('get_admin_users_secure'),
    ('is_admin_secure'),
    ('mark_all_notifications_read_secure'),
    ('mark_notification_read_secure'),
    ('register_push_token_secure'),
    ('save_admin_category_secure'),
    ('save_admin_coupon_secure'),
    ('save_admin_product_secure'),
    ('save_admin_product_variant_secure'),
    ('send_admin_broadcast_notification_secure'),
    ('set_admin_category_image_secure'),
    ('set_admin_product_image_secure'),
    ('set_admin_review_approval_secure'),
    ('set_admin_user_ban_secure'),
    ('set_default_shipping_address_secure'),
    ('unregister_push_token_secure'),
    ('update_order_status_secure'),
    ('update_return_status_secure'),
    ('validate_coupon')
)
select ok(
  not exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces
      on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = required_functions.function_name
      and has_function_privilege('anon', procedures.oid, 'EXECUTE')
  ),
  format('anon cannot execute public.%I', required_functions.function_name)
)
from required_functions;

-- Any SECURITY DEFINER RPC must pin search_path; invoker functions are left to
-- their RLS policies. This catches the common object-shadowing escalation class.
select ok(
  not exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces
      on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.prosecdef
      and procedures.proname like '%\_secure' escape '\'
      and not exists (
        select 1
        from unnest(coalesce(procedures.proconfig, array[]::text[])) as setting
        where setting like 'search_path=%'
      )
  ),
  'all SECURITY DEFINER *_secure RPCs pin search_path'
);

select * from finish();
rollback;
