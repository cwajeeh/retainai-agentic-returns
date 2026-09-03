-- ============================================================
-- Row Level Security — Supabase only.
--
-- Relies on the `auth` schema Supabase provisions (auth.role(),
-- auth.uid()), which does not exist on a plain Postgres instance —
-- so this migration is a no-op guarded by a check for that schema,
-- safe to run against docker-compose's plain Postgres or a real
-- Supabase project alike.
--
-- The backend API and AI service connect with the Supabase service
-- role key and bypass RLS entirely. These policies protect a
-- dashboard-direct-from-browser Supabase client (if/when one is
-- added) so a signed-in merchant user can only ever see their own
-- shop's rows. Wire merchant_id -> auth.uid() via a `merchant_users`
-- join table in a later migration once merchant staff accounts exist.
-- ============================================================

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute 'alter table merchants enable row level security';
    execute 'alter table return_requests enable row level security';
    execute 'alter table negotiations enable row level security';
    execute 'alter table negotiation_messages enable row level security';
    execute 'alter table shipping_labels enable row level security';

    execute 'drop policy if exists "service role full access" on merchants';
    execute 'create policy "service role full access" on merchants for all using (auth.role() = ''service_role'')';

    execute 'drop policy if exists "service role full access" on return_requests';
    execute 'create policy "service role full access" on return_requests for all using (auth.role() = ''service_role'')';

    execute 'drop policy if exists "service role full access" on negotiations';
    execute 'create policy "service role full access" on negotiations for all using (auth.role() = ''service_role'')';

    execute 'drop policy if exists "service role full access" on negotiation_messages';
    execute 'create policy "service role full access" on negotiation_messages for all using (auth.role() = ''service_role'')';

    execute 'drop policy if exists "service role full access" on shipping_labels';
    execute 'create policy "service role full access" on shipping_labels for all using (auth.role() = ''service_role'')';
  else
    raise notice 'Skipping Supabase RLS policies — no "auth" schema found (plain Postgres environment).';
  end if;
end $$;
