begin;

drop policy if exists support_tickets_customer_update
  on public.support_tickets;

commit;
