-- Applied to Supabase project djyzqifuckuwdeeltnej on 2026-07-24 via the
-- management API (migration name: protect_curator_picks_row). The project has
-- no supabase CLI setup; this file is the repo's reviewable record of the
-- change, not an auto-applied migration.
--
-- Problem (C1): the picks table keyed rows by passphrase_hash and used one
-- secret as BOTH the public read key and the write credential. Regular users
-- are fine — their hash is the SHA-256 of a private random token, never
-- shipped. But the curator's hash is a public constant (src/lib/curator.ts),
-- published so the homepage can READ the "Don't miss" lede. With always-true
-- INSERT/UPDATE policies, anyone holding the publishable key could POST to
-- picks with passphrase_hash = CURATOR_HASH and overwrite the public lede.
--
-- Fix: reading stays public; writing the curator row now requires presenting
-- the passphrase PREIMAGE (which the public does not have — only its hash),
-- verified server-side by a SECURITY DEFINER RPC. Direct writes to that one row
-- are blocked by RLS.

-- Regular users keep direct writes to their own rows; only the curator row is
-- carved out, because only its hash is public.
drop policy if exists picks_insert_all on public.picks;
create policy picks_insert_others on public.picks
  for insert to public
  with check (passphrase_hash <> 'a0bca4aafe518805cd71df84152a5a316bb186c9b1f69bdb071ed8c494b7f65a');

drop policy if exists picks_update_all on public.picks;
create policy picks_update_others on public.picks
  for update to public
  using (passphrase_hash <> 'a0bca4aafe518805cd71df84152a5a316bb186c9b1f69bdb071ed8c494b7f65a')
  with check (passphrase_hash <> 'a0bca4aafe518805cd71df84152a5a316bb186c9b1f69bdb071ed8c494b7f65a');

-- The only path to the curator row. security definer so it writes past the RLS
-- block above; the passphrase check is the gate. Partial update — a null
-- argument leaves that column untouched, so a picks write never clobbers notes.
-- The hash here matches src/lib/curator.ts CURATOR_HASH.
create or replace function public.set_curator_picks(
  p_passphrase text,
  p_picks jsonb default null,
  p_notes jsonb default null
) returns void
language plpgsql
security definer
set search_path = extensions, pg_catalog
as $$
declare
  v_hash text;
begin
  v_hash := encode(
    digest(regexp_replace(p_passphrase, '^\s+|\s+$', '', 'g'), 'sha256'),
    'hex'
  );
  if v_hash <> 'a0bca4aafe518805cd71df84152a5a316bb186c9b1f69bdb071ed8c494b7f65a' then
    raise exception 'not authorized';
  end if;
  insert into public.picks (passphrase_hash, picks, notes, updated_at)
  values (v_hash, coalesce(p_picks, '[]'::jsonb), coalesce(p_notes, '{}'::jsonb), now())
  on conflict (passphrase_hash) do update set
    picks = coalesce(p_picks, public.picks.picks),
    notes = coalesce(p_notes, public.picks.notes),
    updated_at = now();
end;
$$;

-- anon only: the app authenticates no one, so this is the single role that
-- ever calls the RPC. It stays an anon-callable SECURITY DEFINER function by
-- design (the database linter flags that as something to review) — safe because
-- it verifies the passphrase preimage, only ever writes the one curator row,
-- and is fully parameterised.
revoke all on function public.set_curator_picks(text, jsonb, jsonb) from public;
grant execute on function public.set_curator_picks(text, jsonb, jsonb) to anon;

-- C3: pin the trigger function's search_path (database-linter finding).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
