# Supabase Migration Strategy (stable)

## Why this cleanup

The project had multiple migration files sharing the same version prefix (`20260311`, `20260312`, `20260313`).
Supabase tracks migration `version` as a unique key, so duplicate prefixes break `supabase db push`.

## Current structure

### Active migrations (authoritative for CLI push)
Only these files remain in `supabase/migrations/`:

- `00_init.sql`
- `20260311_add_inventory_unit_price.sql`
- `20260312_add_updated_at_to_profiles.sql`
- `20260313181000_harden_rls_phase2_patch.sql`

These versions are aligned with the remote migration history currently recorded.

### Legacy archive
Older duplicate-version migrations were moved to:

- `supabase/migrations_legacy/`

They were renamed with unique timestamps for traceability, but are **not** part of active push flow.

## Rules for next deployments

1. Always create migrations via CLI:
   - `npx supabase migration new <name>`
2. Ensure filename starts with a **14-digit timestamp** (`YYYYMMDDHHMMSS`).
3. Never create two migration files with the same version prefix.
4. Never manually rename already-applied active migration versions.
5. Keep historical experiments/fixes in `migrations_legacy`, not `migrations`.

## Standard flow

```bash
# 1) create migration
npx supabase migration new add_xyz

# 2) edit SQL file in supabase/migrations

# 3) apply to linked remote
npx supabase db push

# 4) verify state
npx supabase migration list
```

## If history gets out of sync

Use with care:

```bash
npx supabase migration repair --status applied <version>
npx supabase migration repair --status reverted <version>
```

Then re-run `npx supabase db push`.
