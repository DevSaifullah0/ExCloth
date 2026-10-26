begin;

create table if not exists public.order_shipments (
  order_id uuid primary key references public.orders(id) on delete cascade,
  carrier_name text not null,
  tracking_number text not null,
  tracking_url text,
  estimated_delivery_at timestamptz,
  shipped_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint order_shipments_carrier_name_length_ck
    check (char_length(btrim(carrier_name)) between 2 and 80),
  constraint order_shipments_tracking_number_length_ck
    check (char_length(btrim(tracking_number)) between 2 and 120),
  constraint order_shipments_tracking_url_ck
    check (tracking_url is null or tracking_url ~* '^https?://')
);

create table if not exists public.order_shipment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  description text not null,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint order_shipment_events_status_ck
    check (status in ('label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception')),
  constraint order_shipment_events_description_length_ck
    check (char_length(btrim(description)) between 2 and 500)
);

create index if not exists order_shipment_events_order_time_idx
  on public.order_shipment_events (order_id, occurred_at desc);

create table if not exists public.product_size_guides (
  product_id bigint primary key references public.products(id) on delete cascade,
  title text not null default 'Size Guide',
  unit text not null default 'cm',
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint product_size_guides_title_ck
    check (char_length(btrim(title)) between 2 and 80),
  constraint product_size_guides_unit_ck
    check (unit in ('cm', 'in')),
  constraint product_size_guides_rows_ck
    check (jsonb_typeof(rows) = 'array' and jsonb_array_length(rows) <= 20)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  subject text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_subject_length_ck
    check (char_length(btrim(subject)) between 4 and 120),
  constraint support_tickets_status_ck
    check (status in ('open', 'waiting_for_customer', 'waiting_for_support', 'resolved', 'closed'))
);

create index if not exists support_tickets_user_updated_idx
  on public.support_tickets (user_id, updated_at desc);

create index if not exists support_tickets_status_updated_idx
  on public.support_tickets (status, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint support_messages_length_ck
    check (char_length(btrim(message)) between 1 and 4000)
);

create index if not exists support_messages_ticket_time_idx
  on public.support_messages (ticket_id, created_at);

create table if not exists public.product_alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  alert_type text not null,
  target_price integer,
  created_at timestamptz not null default now(),
  constraint product_alert_subscriptions_type_ck
    check (alert_type in ('restock', 'price_drop')),
  constraint product_alert_subscriptions_target_price_ck
    check ((alert_type = 'price_drop' and (target_price is null or target_price > 0))
      or (alert_type = 'restock' and target_price is null)),
  constraint product_alert_subscriptions_user_product_type_uq
    unique (user_id, product_id, alert_type)
);

create index if not exists product_alert_subscriptions_product_type_idx
  on public.product_alert_subscriptions (product_id, alert_type);

alter table public.order_shipments enable row level security;
alter table public.order_shipment_events enable row level security;
alter table public.product_size_guides enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.product_alert_subscriptions enable row level security;

grant select, insert, update, delete on public.order_shipments to authenticated;
grant select, insert on public.order_shipment_events to authenticated;
grant select on public.product_size_guides to authenticated;
grant insert, update, delete on public.product_size_guides to authenticated;
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;
grant select, insert, delete on public.product_alert_subscriptions to authenticated;

create policy order_shipments_customer_read
  on public.order_shipments for select to authenticated
  using (exists (
    select 1 from public.orders as orders
    where orders.id = order_shipments.order_id
      and orders.user_id = (select auth.uid())
  ));

create policy order_shipments_admin_manage
  on public.order_shipments for all to authenticated
  using (private.has_current_admin_permission('orders.manage'))
  with check (private.has_current_admin_permission('orders.manage'));

create policy order_shipment_events_customer_read
  on public.order_shipment_events for select to authenticated
  using (exists (
    select 1 from public.orders as orders
    where orders.id = order_shipment_events.order_id
      and orders.user_id = (select auth.uid())
  ));

create policy order_shipment_events_admin_manage
  on public.order_shipment_events for all to authenticated
  using (private.has_current_admin_permission('orders.manage'))
  with check (private.has_current_admin_permission('orders.manage'));

create policy product_size_guides_customer_read
  on public.product_size_guides for select to authenticated
  using (exists (
    select 1 from public.products as products
    where products.id = product_size_guides.product_id
      and products.is_active is true
  ));

create policy product_size_guides_admin_manage
  on public.product_size_guides for all to authenticated
  using (private.has_current_admin_permission('catalog.manage'))
  with check (private.has_current_admin_permission('catalog.manage'));

create policy support_tickets_customer_read
  on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid()));

create policy support_tickets_customer_create
  on public.support_tickets for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy support_tickets_customer_update
  on public.support_tickets for update to authenticated
  using (user_id = (select auth.uid()) and status <> 'closed')
  with check (user_id = (select auth.uid()));

create policy support_tickets_admin_manage
  on public.support_tickets for all to authenticated
  using (private.has_current_admin_permission('customers.manage'))
  with check (private.has_current_admin_permission('customers.manage'));

create policy support_messages_customer_read
  on public.support_messages for select to authenticated
  using (exists (
    select 1 from public.support_tickets as tickets
    where tickets.id = support_messages.ticket_id
      and tickets.user_id = (select auth.uid())
  ));

create policy support_messages_customer_create
  on public.support_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.support_tickets as tickets
      where tickets.id = support_messages.ticket_id
        and tickets.user_id = (select auth.uid())
        and tickets.status not in ('resolved', 'closed')
    )
  );

create policy support_messages_admin_read
  on public.support_messages for select to authenticated
  using (private.has_current_admin_permission('customers.manage'));

create policy support_messages_admin_create
  on public.support_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.has_current_admin_permission('customers.manage')
  );

create policy product_alert_subscriptions_customer_manage
  on public.product_alert_subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.products as products
      where products.id = product_alert_subscriptions.product_id
        and products.is_active is true
    )
  );

create or replace function private.touch_support_ticket_after_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.support_tickets
  set updated_at = now(),
      status = case
        when private.has_current_admin_permission('customers.manage')
          then 'waiting_for_customer'
        else 'waiting_for_support'
      end
  where id = new.ticket_id;

  return new;
end;
$function$;

revoke all on function private.touch_support_ticket_after_message() from public, anon, authenticated;

create trigger support_messages_touch_ticket_after_insert
  after insert on public.support_messages
  for each row execute function private.touch_support_ticket_after_message();

create or replace function private.notify_product_alert_subscribers()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_product_id bigint;
  v_price integer;
  v_restocked boolean := false;
  v_price_dropped boolean := false;
  v_product_name text;
  v_product_slug text;
begin
  if tg_table_name = 'products' then
    v_product_id := new.id;
    v_price := new.price;
    v_restocked := old.stock_quantity <= 0 and new.stock_quantity > 0;
    v_price_dropped := new.price < old.price;
  else
    v_product_id := new.product_id;
    select products.price into v_price
    from public.products as products
    where products.id = v_product_id;
    v_restocked := old.stock_quantity <= 0 and new.stock_quantity > 0;
  end if;

  if not v_restocked and not v_price_dropped then
    return new;
  end if;

  select products.name, products.slug
  into v_product_name, v_product_slug
  from public.products as products
  where products.id = v_product_id;

  if v_restocked then
    with notified_users as (
      delete from public.product_alert_subscriptions as subscriptions
      where subscriptions.product_id = v_product_id
        and subscriptions.alert_type = 'restock'
      returning subscriptions.user_id
    )
    insert into public.notifications (user_id, type, title, message, data)
    select distinct notified_users.user_id,
      'restock',
      'Back in stock',
      v_product_name || ' is back in stock.',
      jsonb_build_object('product_id', v_product_id, 'slug', v_product_slug, 'screen', 'ProductDetails')
    from notified_users;
  end if;

  if v_price_dropped then
    with notified_users as (
      delete from public.product_alert_subscriptions as subscriptions
      where subscriptions.product_id = v_product_id
        and subscriptions.alert_type = 'price_drop'
        and (subscriptions.target_price is null or v_price <= subscriptions.target_price)
      returning subscriptions.user_id
    )
    insert into public.notifications (user_id, type, title, message, data)
    select distinct notified_users.user_id,
      'price_drop',
      'Price drop',
      v_product_name || ' is now available for Rs ' || v_price || '.',
      jsonb_build_object('product_id', v_product_id, 'slug', v_product_slug, 'screen', 'ProductDetails')
    from notified_users;
  end if;

  return new;
end;
$function$;

revoke all on function private.notify_product_alert_subscribers() from public, anon, authenticated;

create trigger products_notify_alert_subscribers
  after update of price, stock_quantity on public.products
  for each row execute function private.notify_product_alert_subscribers();

create trigger product_variants_notify_alert_subscribers
  after update of stock_quantity on public.product_variants
  for each row execute function private.notify_product_alert_subscribers();

create or replace function private.notify_admins_of_low_stock()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_product_id bigint;
  v_product_name text;
  v_stock integer;
  v_variant_description text;
begin
  if tg_table_name = 'products' then
    v_product_id := new.id;
    v_stock := new.stock_quantity;
    v_variant_description := '';
  else
    v_product_id := new.product_id;
    v_stock := new.stock_quantity;
    v_variant_description := concat_ws(' ', new.color, new.size);
  end if;

  if v_stock > 5 or old.stock_quantity <= 5 then
    return new;
  end if;

  select products.name into v_product_name
  from public.products as products
  where products.id = v_product_id;

  insert into public.notifications (user_id, type, title, message, data)
  select admins.user_id,
    'low_stock',
    'Low stock alert',
    v_product_name || case when v_variant_description = '' then '' else ' (' || v_variant_description || ')' end
      || ' has only ' || v_stock || ' left.',
    jsonb_build_object('product_id', v_product_id, 'screen', 'AdminProducts')
  from public.admin_users as admins;

  return new;
end;
$function$;

revoke all on function private.notify_admins_of_low_stock() from public, anon, authenticated;

create trigger products_notify_admins_low_stock
  after update of stock_quantity on public.products
  for each row execute function private.notify_admins_of_low_stock();

create trigger product_variants_notify_admins_low_stock
  after update of stock_quantity on public.product_variants
  for each row execute function private.notify_admins_of_low_stock();

commit;
