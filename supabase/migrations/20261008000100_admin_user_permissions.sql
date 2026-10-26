begin;

create table public.admin_user_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'custom' check (role in ('custom', 'admin')),
  permissions text[] not null default '{}'::text[],
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint admin_user_permissions_allowed_keys_ck check (
    permissions <@ array[
      'orders.read',
      'returns.manage',
      'customers.manage',
      'catalog.manage',
      'promotions.manage',
      'content.manage',
      'reports.read',
      'staff.manage'
    ]::text[]
  )
);

alter table public.admin_user_permissions enable row level security;
revoke all on public.admin_user_permissions from anon, authenticated;

create or replace function public.get_admin_user_access_secure()
returns table (user_id uuid, role text, permissions text[], updated_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null or not public.is_admin_secure() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
    select access.user_id, access.role, access.permissions, access.updated_at
    from public.admin_user_permissions as access
    order by access.updated_at desc;
end;
$$;

create or replace function public.set_admin_user_access_secure(
  p_user_id uuid,
  p_role text,
  p_permissions text[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  allowed_permissions constant text[] := array[
    'orders.read',
    'returns.manage',
    'customers.manage',
    'catalog.manage',
    'promotions.manage',
    'content.manage',
    'reports.read',
    'staff.manage'
  ]::text[];
begin
  if auth.uid() is null or not public.is_admin_secure() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'Select a different team member' using errcode = '22023';
  end if;

  if p_role is null or p_role not in ('custom', 'admin') or p_permissions is null then
    raise exception 'Invalid role or permissions' using errcode = '22023';
  end if;

  if not (p_permissions <@ allowed_permissions)
    or cardinality(p_permissions) <> cardinality(array(select distinct unnest(p_permissions))) then
    raise exception 'Invalid permission keys' using errcode = '22023';
  end if;

  insert into public.admin_user_permissions (user_id, role, permissions, updated_by)
  values (p_user_id, p_role, p_permissions, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role,
        permissions = excluded.permissions,
        updated_by = excluded.updated_by,
        updated_at = now();
end;
$$;

revoke all on function public.get_admin_user_access_secure() from public, anon;
revoke all on function public.set_admin_user_access_secure(uuid, text, text[]) from public, anon;
grant execute on function public.get_admin_user_access_secure() to authenticated;
grant execute on function public.set_admin_user_access_secure(uuid, text, text[]) to authenticated;

commit;
