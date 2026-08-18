-- Intentionally empty.
--
-- The production schema has not yet been exported into this repository, and
-- fabricated customer/catalog rows would hide that reproducibility gap. This
-- file exists so `supabase db reset` has a valid seed target. Add deterministic,
-- non-sensitive development fixtures only after the canonical schema baseline is
-- committed.

do $$
begin
  raise notice 'ExCloth seed: no development fixtures are defined.';
end
$$;
