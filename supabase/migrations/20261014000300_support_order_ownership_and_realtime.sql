begin;

drop policy if exists support_tickets_customer_create
  on public.support_tickets;

create policy support_tickets_customer_create
  on public.support_tickets for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      order_id is null
      or exists (
        select 1
        from public.orders as orders
        where orders.id = support_tickets.order_id
          and orders.user_id = (select auth.uid())
      )
    )
  );

do $migration$
declare
  v_table_name text;
begin
  if exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    foreach v_table_name in array array[
      'order_shipments',
      'order_shipment_events',
      'support_messages',
      'support_tickets'
    ] loop
      if not exists (
        select 1
        from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = v_table_name
      ) then
        execute format(
          'alter publication supabase_realtime add table public.%I',
          v_table_name
        );
      end if;
    end loop;
  end if;
end;
$migration$;

commit;
