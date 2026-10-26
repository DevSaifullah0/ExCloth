begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.admin_user_permissions
  drop constraint if exists admin_user_permissions_allowed_keys_ck;
alter table public.admin_user_permissions
  add constraint admin_user_permissions_allowed_keys_ck check (
    permissions <@ array[
      'orders.read', 'orders.manage', 'returns.manage', 'customers.manage',
      'catalog.manage', 'promotions.manage', 'content.manage', 'reports.read',
      'reviews.manage', 'staff.manage'
    ]::text[]
  );

create or replace function private.has_current_admin_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and exists (
      select 1 from public.admin_users as admins
      where admins.user_id = auth.uid()
    )
    and exists (
      select 1 from public.admin_user_permissions as access
      where access.user_id = auth.uid()
        and (access.role = 'admin' or access.permissions @> array[p_permission]::text[])
    );
$function$;
revoke all on function private.has_current_admin_permission(text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.has_current_admin_permission(text) to authenticated;

drop policy if exists app_banners_admin_read_all on public.app_banners;
drop policy if exists app_banners_admin_insert on public.app_banners;
drop policy if exists app_banners_admin_update on public.app_banners;
drop policy if exists app_banners_admin_delete on public.app_banners;

create policy app_banners_admin_read_all
  on public.app_banners for select to authenticated
  using (private.has_current_admin_permission('content.manage'));
create policy app_banners_admin_insert
  on public.app_banners for insert to authenticated
  with check (private.has_current_admin_permission('content.manage'));
create policy app_banners_admin_update
  on public.app_banners for update to authenticated
  using (private.has_current_admin_permission('content.manage'))
  with check (private.has_current_admin_permission('content.manage'));
create policy app_banners_admin_delete
  on public.app_banners for delete to authenticated
  using (private.has_current_admin_permission('content.manage'));

insert into public.admin_user_permissions (user_id, role, permissions, updated_by)
select admins.user_id, 'admin', array[
  'orders.read', 'orders.manage', 'returns.manage', 'customers.manage',
  'catalog.manage', 'promotions.manage', 'content.manage', 'reports.read',
  'reviews.manage', 'staff.manage'
]::text[], admins.user_id
from public.admin_users as admins
on conflict (user_id) do nothing;

update public.admin_user_permissions
set permissions = array[
  'orders.read', 'orders.manage', 'returns.manage', 'customers.manage',
  'catalog.manage', 'promotions.manage', 'content.manage', 'reports.read',
  'reviews.manage', 'staff.manage'
]::text[], updated_at = now()
where role = 'admin';

create or replace function public.get_admin_user_access_secure()
returns table (user_id uuid, role text, permissions text[], updated_at timestamptz)
language plpgsql security definer set search_path = public, pg_catalog
as $function$
begin
  if not private.has_current_admin_permission('staff.manage') then
    raise exception 'Staff management permission required' using errcode = '42501';
  end if;
  return query
    select access.user_id, access.role, access.permissions, access.updated_at
    from public.admin_user_permissions as access
    join public.admin_users as admins on admins.user_id = access.user_id
    order by access.updated_at desc;
end;
$function$;

create or replace function public.set_admin_user_access_secure(
  p_user_id uuid, p_role text, p_permissions text[]
)
returns void
language plpgsql security definer set search_path = public, pg_catalog
as $function$
declare
  allowed_permissions constant text[] := array[
    'orders.read', 'orders.manage', 'returns.manage', 'customers.manage',
    'catalog.manage', 'promotions.manage', 'content.manage', 'reports.read',
    'reviews.manage', 'staff.manage'
  ]::text[];
begin
  if not private.has_current_admin_permission('staff.manage') then
    raise exception 'Staff management permission required' using errcode = '42501';
  end if;
  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'Select a different team member' using errcode = '22023';
  end if;
  if not exists (select 1 from public.admin_users where user_id = p_user_id) then
    raise exception 'Selected user is not an admin team member' using errcode = '22023';
  end if;
  if p_role is null or p_role not in ('custom', 'admin') or p_permissions is null then
    raise exception 'Invalid role or permissions' using errcode = '22023';
  end if;
  if not (p_permissions <@ allowed_permissions)
    or array_position(p_permissions, null) is not null
    or cardinality(p_permissions) <> cardinality(array(select distinct unnest(p_permissions))) then
    raise exception 'Invalid permission keys' using errcode = '22023';
  end if;
  if p_role = 'admin' and not (p_permissions @> allowed_permissions) then
    raise exception 'Admin role must include all permissions' using errcode = '22023';
  end if;
  insert into public.admin_user_permissions (user_id, role, permissions, updated_by)
  values (p_user_id, p_role, p_permissions, auth.uid())
  on conflict (user_id) do update set
    role = excluded.role, permissions = excluded.permissions,
    updated_by = excluded.updated_by, updated_at = now();
end;
$function$;

create or replace function public.get_admin_staff_secure()
returns jsonb
language plpgsql security definer set search_path = ''
as $function$
begin
  if not private.has_current_admin_permission('staff.manage') then
    raise exception 'Staff management permission required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', users.id, 'email', users.email, 'is_admin', true,
      'user_metadata', coalesce(users.raw_user_meta_data, '{}'::jsonb)
    ) order by users.created_at)
    from public.admin_users as admins
    join auth.users as users on users.id = admins.user_id
  ), '[]'::jsonb);
end;
$function$;

create or replace function public.get_admin_business_report_secure()
returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  v_orders jsonb;
  v_returns jsonb;
begin
  if not private.has_current_admin_permission('reports.read') then
    raise exception 'Business report permission required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(row_to_json(report_order)::jsonb order by report_order.created_at desc), '[]'::jsonb)
  into v_orders
  from (
    select id, order_number, total_amount, status, payment_status, payment_method, created_at
    from public.orders
  ) as report_order;
  select coalesce(jsonb_agg(row_to_json(report_return)::jsonb order by report_return.created_at desc), '[]'::jsonb)
  into v_returns
  from (
    select requests.id, requests.order_id, orders.order_number, requests.status,
      requests.refund_status, requests.refund_amount, requests.estimated_refund_amount,
      requests.refund_method, orders.payment_method,
      requests.requested_at as created_at, requests.updated_at
    from public.return_requests as requests
    join public.orders as orders on orders.id = requests.order_id
  ) as report_return;
  return jsonb_build_object('orders', v_orders, 'returns', v_returns);
end;
$function$;

revoke all on function public.get_admin_staff_secure() from public, anon;
revoke all on function public.get_admin_business_report_secure() from public, anon;
grant execute on function public.get_admin_staff_secure() to authenticated;
grant execute on function public.get_admin_business_report_secure() to authenticated;

do $migration$
declare
  v_definition text;
  v_guard text := E'if not exists (\n    select 1\n    from public.admin_users\n    where user_id = v_admin_id\n  ) then\n    raise exception ''Admin access required.'';\n  end if;';
  v_insert text;
  v_count integer;
  v_oid oid;
  v_required record;
begin
  for v_required in select * from (values
    ('delete_admin_product_secure', 'catalog.manage'),
    ('get_admin_broadcasts_secure', 'content.manage'),
    ('get_admin_categories_secure', 'catalog.manage'),
    ('get_admin_category_details_secure', 'catalog.manage'),
    ('get_admin_coupon_details_secure', 'promotions.manage'),
    ('get_admin_coupons_secure', 'promotions.manage'),
    ('get_admin_order_details_secure', 'orders.read'),
    ('get_admin_orders_secure', 'orders.read'),
    ('get_admin_product_details_secure', 'catalog.manage'),
    ('get_admin_products_secure', 'catalog.manage'),
    ('get_admin_return_details_secure', 'returns.manage'),
    ('get_admin_returns_secure', 'returns.manage'),
    ('get_admin_review_details_secure', 'reviews.manage'),
    ('get_admin_reviews_secure', 'reviews.manage'),
    ('get_admin_user_details_secure', 'customers.manage'),
    ('get_admin_users_secure', 'customers.manage'),
    ('save_admin_category_secure', 'catalog.manage'),
    ('save_admin_coupon_secure', 'promotions.manage'),
    ('save_admin_product_secure', 'catalog.manage'),
    ('save_admin_product_variant_secure', 'catalog.manage'),
    ('send_admin_broadcast_notification_secure', 'content.manage'),
    ('set_admin_category_image_secure', 'catalog.manage'),
    ('set_admin_product_image_secure', 'catalog.manage'),
    ('set_admin_review_approval_secure', 'reviews.manage'),
    ('set_admin_user_ban_secure', 'customers.manage'),
    ('update_order_status_secure', 'orders.manage'),
    ('update_return_status_secure', 'returns.manage')
  ) as required(function_name, permission_name)
  loop
    select count(*), (array_agg(procedures.oid))[1]
    into v_count, v_oid
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public' and procedures.proname = v_required.function_name;
    if v_count <> 1 then
      raise exception 'Expected exactly one public function named %, found %', v_required.function_name, v_count;
    end if;
    v_definition := pg_get_functiondef(v_oid);
    if length(v_definition) - length(replace(v_definition, v_guard, '')) <> length(v_guard) then
      raise exception 'Unexpected admin membership guard in public.%; aborting', v_required.function_name;
    end if;
    v_insert := v_guard || E'\n\n  if not private.has_current_admin_permission('''
      || v_required.permission_name || E''') then\n    raise exception ''Missing required admin permission'' using errcode = ''42501'';\n  end if;';
    execute replace(v_definition, v_guard, v_insert);
  end loop;
end;
$migration$;

revoke all on function public.get_admin_user_access_secure() from public, anon;
revoke all on function public.set_admin_user_access_secure(uuid, text, text[]) from public, anon;
grant execute on function public.get_admin_user_access_secure() to authenticated;
grant execute on function public.set_admin_user_access_secure(uuid, text, text[]) to authenticated;

commit;
