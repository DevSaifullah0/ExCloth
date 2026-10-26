begin;

create table public.app_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  subtitle text not null default '' check (length(subtitle) <= 240),
  image_url text not null check (image_url ~* '^https://'),
  sort_order integer not null default 0,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_banners_valid_schedule_ck
    check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index app_banners_active_order_idx
  on public.app_banners (sort_order, created_at desc)
  where is_active;

alter table public.app_banners enable row level security;

create policy app_banners_public_active_read
  on public.app_banners
  for select
  to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy app_banners_admin_read_all
  on public.app_banners
  for select
  to authenticated
  using (public.is_admin_secure());

create policy app_banners_admin_insert
  on public.app_banners
  for insert
  to authenticated
  with check (public.is_admin_secure());

create policy app_banners_admin_update
  on public.app_banners
  for update
  to authenticated
  using (public.is_admin_secure())
  with check (public.is_admin_secure());

create policy app_banners_admin_delete
  on public.app_banners
  for delete
  to authenticated
  using (public.is_admin_secure());

grant select on public.app_banners to anon, authenticated;
grant insert, update, delete on public.app_banners to authenticated;

commit;
