-- A provider token identifies one app installation and must not remain attached
-- to multiple accounts. Unregistration is scoped to auth.uid(), so signing out of
-- one account cannot remove another user's token by guessing its value.
--
-- DEPLOYMENT GATE: do not apply this migration until the hosted
-- register_push_token_secure(p_token, p_platform) implementation has been
-- reviewed to atomically reassign a globally unique token to auth.uid().

do $migration$
declare
  user_id_type oid;
  token_type oid;
  duplicate_count bigint;
  invalid_count bigint;
begin
  if to_regclass('public.user_push_tokens') is null then
    raise exception
      'Cannot install push-token guard: public.user_push_tokens is absent. Import a baseline migration with an earlier version first.';
  end if;

  select atttypid into user_id_type
  from pg_attribute
  where attrelid = 'public.user_push_tokens'::regclass
    and attname = 'user_id'
    and attnum > 0
    and not attisdropped;

  select atttypid into token_type
  from pg_attribute
  where attrelid = 'public.user_push_tokens'::regclass
    and attname = 'token'
    and attnum > 0
    and not attisdropped;

  if user_id_type is distinct from 'uuid'::regtype
    or token_type is null
    or token_type not in ('text'::regtype, 'varchar'::regtype) then
    raise exception
      'Cannot install push-token ownership guard: expected user_id uuid and token text/varchar.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = 'register_push_token_secure'
      and procedures.pronargs = 2
      and procedures.proargnames[1:2] @>
        array['p_token', 'p_platform']::text[]
      and array['p_token', 'p_platform']::text[] @>
        procedures.proargnames[1:2]
      and has_function_privilege('authenticated', procedures.oid, 'EXECUTE')
      and not has_function_privilege('anon', procedures.oid, 'EXECUTE')
  ) then
    raise exception
      'Push migration gate failed: reviewed register_push_token_secure(p_token, p_platform) with authenticated-only execution is required first.';
  end if;

  lock table public.user_push_tokens in share row exclusive mode;

  select count(*)
  into invalid_count
  from public.user_push_tokens
  where user_id is null
    or token is null
    or btrim(token::text) = '';

  if invalid_count > 0 then
    raise exception
      'Cannot validate push-token identity contract: % row(s) have a missing owner or blank token.',
      invalid_count;
  end if;

  select count(*)
  into duplicate_count
  from (
    select token
    from public.user_push_tokens
    where token is not null
    group by token
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception
      'Cannot create push-token ownership index: % duplicate token group(s) require manual reconciliation.',
      duplicate_count;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_push_tokens'::regclass
      and conname = 'user_push_tokens_identity_present_ck'
  ) then
    raise exception
      'user_push_tokens_identity_present_ck already exists; review its definition before applying this migration.';
  end if;

  alter table public.user_push_tokens
    add constraint user_push_tokens_identity_present_ck
    check (
      user_id is not null
      and token is not null
      and btrim(token::text) <> ''
    ) not valid;

  alter table public.user_push_tokens
    validate constraint user_push_tokens_identity_present_ck;

  if to_regclass('public.user_push_tokens_token_uidx') is not null then
    raise exception
      'user_push_tokens_token_uidx already exists; review its definition before applying this migration.';
  end if;

  create unique index user_push_tokens_token_uidx
    on public.user_push_tokens (token)
    where token is not null;

  if exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = 'unregister_push_token_secure'
      and procedures.oid is distinct from to_regprocedure(
        'public.unregister_push_token_secure(text)'
      )
  ) then
    raise exception
      'Cannot create push-token RPC: an incompatible overload already exists and needs manual review.';
  end if;

  if to_regprocedure('public.unregister_push_token_secure(text)') is not null
    and not exists (
      select 1
      from pg_proc as procedures
      where procedures.oid = to_regprocedure(
        'public.unregister_push_token_secure(text)'
      )
        and procedures.prorettype = 'bool'::regtype
    ) then
    raise exception
      'Existing unregister_push_token_secure(text) must return boolean before it can be safely replaced.';
  end if;

  -- Replace a same-signature body with the reviewed ownership check before any
  -- authenticated grant is applied. Incompatible return types/overloads abort.
  execute $function$
      create or replace function public.unregister_push_token_secure(p_token text)
      returns boolean
      language plpgsql
      security definer
      set search_path = pg_catalog
      as $body$
      declare
        requesting_user_id uuid := auth.uid();
        deleted_count integer;
      begin
        if requesting_user_id is null then
          raise exception using
            errcode = '42501',
            message = 'Authentication is required.';
        end if;

        if nullif(btrim(p_token), '') is null then
          raise exception using
            errcode = '22023',
            message = 'A push token is required.';
        end if;

        delete from public.user_push_tokens
        where user_id = requesting_user_id
          and token::text = p_token;

        get diagnostics deleted_count = row_count;
        return deleted_count > 0;
      end
      $body$
  $function$;

  revoke all on function public.unregister_push_token_secure(text)
    from public, anon;
  grant execute on function public.unregister_push_token_secure(text)
    to authenticated;
end
$migration$;
